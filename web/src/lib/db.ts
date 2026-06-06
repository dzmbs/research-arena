// Research Arena — tiny JSON file store with an in-process mutex.
// Good enough for a hackathon demo; do NOT use in production.
import { promises as fs } from 'fs';
import path from 'path';

export type SubmissionStatus = 'queued' | 'running' | 'scored' | 'error';

export type Submission = {
  id: string;
  challengeSlug: string;
  name: string;
  address: string;
  code: string;
  kind?: 'HUMAN' | 'AGENT';
  status: SubmissionStatus;
  score?: number;
  error?: string;
  paidUsd: number;
  createdAt: string;
  scoredAt?: string;
};

export type ActivityType =
  | 'submission'
  | 'scored'
  | 'new_king'
  | 'fee_split'
  | 'payout';

export type ActivityEvent = {
  ts: string;
  type: ActivityType;
  text: string;
  challengeSlug: string;
};

export type King = {
  name: string;
  address: string;
  score: number;
  since: string;
};

export type DbShape = {
  submissions: Submission[];
  activity: ActivityEvent[];
  kings: Record<string, King>;
  // running tally of fees credited to whoever was king at submit time
  earnings: Record<string, number>; // key: `${slug}:${address}` -> usd
  // ambient arena simulation state (see lib/sim.ts); opaque to this module
  sim?: unknown;
};

const DATA_DIR = path.join(process.cwd(), '.data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

const EMPTY_DB: DbShape = {
  submissions: [],
  activity: [],
  kings: {},
  earnings: {},
};

// --- in-process mutex (serialize all read-modify-write cycles) ---
let chain: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  // keep the chain alive even if fn rejects
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function readRaw(): Promise<DbShape> {
  try {
    const buf = await fs.readFile(DB_PATH, 'utf8');
    const parsed = JSON.parse(buf) as Partial<DbShape>;
    return {
      submissions: parsed.submissions ?? [],
      activity: parsed.activity ?? [],
      kings: parsed.kings ?? {},
      earnings: parsed.earnings ?? {},
      sim: parsed.sim,
    };
  } catch {
    return structuredClone(EMPTY_DB);
  }
}

async function writeRaw(db: DbShape): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

/** Read a snapshot of the db (no lock; for read-only callers). */
export async function getDb(): Promise<DbShape> {
  return withLock(readRaw);
}

/** Atomically read-modify-write. The mutator may return a value to surface. */
export async function mutate<T>(
  fn: (db: DbShape) => T | Promise<T>,
): Promise<T> {
  return withLock(async () => {
    const db = await readRaw();
    const result = await fn(db);
    await writeRaw(db);
    return result;
  });
}

export function addActivity(db: DbShape, event: Omit<ActivityEvent, 'ts'>) {
  db.activity.unshift({ ts: new Date().toISOString(), ...event });
  if (db.activity.length > 200) db.activity.length = 200;
}

export type LeaderboardRow = {
  name: string;
  address: string;
  kind: 'HUMAN' | 'AGENT';
  score: number;
  submittedAt: string;
};

function inferKind(name: string, kind?: 'HUMAN' | 'AGENT'): 'HUMAN' | 'AGENT' {
  if (kind) return kind;
  const n = (name || '').toLowerCase();
  if (n.includes('agent') || n.includes('claude') || n.includes('bot'))
    return 'AGENT';
  return 'HUMAN';
}

/** Best score per (name,address) from scored submissions, desc by score. */
export function leaderboard(db: DbShape, slug: string): LeaderboardRow[] {
  const best = new Map<string, LeaderboardRow>();
  for (const s of db.submissions) {
    if (s.challengeSlug !== slug) continue;
    if (s.status !== 'scored' || s.score === undefined) continue;
    const key = `${s.name}|${s.address}`;
    const existing = best.get(key);
    if (!existing || s.score > existing.score) {
      best.set(key, {
        name: s.name,
        address: s.address,
        kind: inferKind(s.name, s.kind),
        score: s.score,
        submittedAt: s.scoredAt ?? s.createdAt,
      });
    }
  }
  return [...best.values()].sort((a, b) => b.score - a.score);
}
