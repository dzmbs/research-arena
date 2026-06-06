#!/usr/bin/env node
// Frontier Arena scoring worker.
// Polls the Next.js API for queued submissions, runs each strategy through the
// orderbook prediction-market simulator, and posts back the mean edge score.
//
// Run:  node worker/worker.mjs
//
// Env:
//   API_BASE       (default http://localhost:3000)
//   WORKER_SECRET  (default frontier-dev-secret)

import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir, homedir } from 'node:os';
import { join } from 'node:path';

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const WORKER_SECRET = process.env.WORKER_SECRET || 'frontier-dev-secret';
const CHALLENGE_DIR =
  '/Users/vani/Projects/cb-hack/challenges/prediction-market-challenge';
const POLL_MS = 2000;
const SIM_TIMEOUT_MS = 120_000;
const SIMULATIONS = 10;

// Make sure uv (installed in ~/.local/bin) is on PATH.
const PATH_WITH_UV = `${join(homedir(), '.local', 'bin')}:${process.env.PATH || ''}`;

function log(...args) {
  console.log(`[${new Date().toISOString()}]`, ...args);
}

async function fetchNextJob() {
  const res = await fetch(`${API_BASE}/api/worker/next-job`, {
    headers: { 'x-worker-secret': WORKER_SECRET },
  });
  if (res.status === 204) return null;
  if (!res.ok) {
    throw new Error(`next-job HTTP ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function postResult(payload) {
  const res = await fetch(`${API_BASE}/api/worker/result`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-worker-secret': WORKER_SECRET,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`result HTTP ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

// Run the simulator. Resolves to { stdout, stderr, code, timedOut }.
function runSim(strategyPath) {
  return new Promise((resolve) => {
    const child = spawn(
      'uv',
      [
        'run',
        'orderbook-pm',
        'run',
        strategyPath,
        '--json',
        '--simulations',
        String(SIMULATIONS),
      ],
      {
        cwd: CHALLENGE_DIR,
        env: { ...process.env, PATH: PATH_WITH_UV },
      },
    );

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, SIM_TIMEOUT_MS);

    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ stdout, stderr: stderr + String(err), code: -1, timedOut });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, code, timedOut });
    });
  });
}

// Mean edge = average total_edge over non-failed simulations.
function computeScore(stdout) {
  const data = JSON.parse(stdout);
  const results = data.simulation_results || [];
  const ok = results.filter((r) => !r.failed);
  if (ok.length === 0) {
    const firstErr = results.find((r) => r.error)?.error || 'all simulations failed';
    throw new Error(`no successful simulations: ${firstErr}`);
  }
  const sum = ok.reduce((acc, r) => acc + r.total_edge, 0);
  return sum / ok.length;
}

async function handleJob(job) {
  log(`scoring submission ${job.id} (${job.challengeSlug})`);
  const dir = await mkdtemp(join(tmpdir(), 'fa-strategy-'));
  const file = join(dir, 'strategy.py');
  try {
    await writeFile(file, job.code, 'utf8');
    const { stdout, stderr, code, timedOut } = await runSim(file);

    if (timedOut) {
      log(`  -> TIMEOUT after ${SIM_TIMEOUT_MS}ms`);
      await postResult({ id: job.id, error: 'simulation timed out (120s)' });
      return;
    }
    if (code !== 0) {
      const msg = (stderr || stdout || `exit ${code}`).slice(0, 500);
      log(`  -> sim failed (exit ${code})`);
      await postResult({ id: job.id, error: msg });
      return;
    }

    let score;
    try {
      score = computeScore(stdout);
    } catch (err) {
      log(`  -> scoring failed: ${err.message}`);
      await postResult({ id: job.id, error: String(err.message).slice(0, 500) });
      return;
    }

    log(`  -> score (mean edge): ${score.toFixed(6)}`);
    await postResult({ id: job.id, score });
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

async function main() {
  log(`worker started; polling ${API_BASE} every ${POLL_MS}ms`);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const job = await fetchNextJob();
      if (job) {
        await handleJob(job);
        continue; // immediately check for more work
      }
    } catch (err) {
      log(`poll error: ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

main().catch((err) => {
  log('fatal:', err);
  process.exit(1);
});
