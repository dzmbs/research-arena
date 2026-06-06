import { readFile } from "node:fs/promises";
import pc from "picocolors";
import { privateKeyToAccount } from "viem/accounts";
import { wrapFetchWithPayment, decodeXPaymentResponse } from "x402-fetch";

import { API_URL, apiFetch, getJson, FrontierError } from "./api.js";
import { table } from "./table.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const usd = (n) => (n == null ? "-" : `$${Number(n).toFixed(2)}`);

// ---------------------------------------------------------------------------
// frontier challenges
// ---------------------------------------------------------------------------
export async function challenges() {
  const { challenges = [] } = await getJson("/api/challenges");
  if (challenges.length === 0) {
    console.log(pc.dim("No challenges available yet."));
    return;
  }
  const rows = challenges.map((c) => ({
    slug: c.slug,
    title: c.title,
    lang: c.language,
    fee: usd(c.entryFeeUsd),
    pool: usd(c.pool),
    king: c.king || pc.dim("(vacant)"),
    players: c.players ?? 0,
    runs: c.runs ?? 0,
  }));
  console.log(
    table(rows, [
      { key: "slug", label: "SLUG" },
      { key: "title", label: "TITLE" },
      { key: "lang", label: "LANG" },
      { key: "fee", label: "FEE", align: "right", color: pc.yellow },
      { key: "pool", label: "POOL", align: "right", color: pc.green },
      { key: "king", label: "KING", color: pc.magenta },
      { key: "players", label: "PLY", align: "right" },
      { key: "runs", label: "RUNS", align: "right" },
    ]),
  );
}

// ---------------------------------------------------------------------------
// frontier spec <slug>
// ---------------------------------------------------------------------------
export async function spec(slug) {
  requireArg(slug, "slug", "frontier spec <slug>");
  const detail = await getJson(`/api/challenges/${encodeURIComponent(slug)}`);
  console.log(pc.bold(pc.cyan(`# ${detail.title ?? slug}`)));
  if (detail.entryFeeUsd != null || detail.pool != null) {
    console.log(
      pc.dim(`entry fee ${usd(detail.entryFeeUsd)}  |  pool ${usd(detail.pool)}  |  language ${detail.language ?? "?"}`),
    );
  }
  console.log("");
  console.log(detail.spec ?? pc.dim("(no spec provided)"));
}

// ---------------------------------------------------------------------------
// frontier leaderboard <slug>
// ---------------------------------------------------------------------------
export async function leaderboard(slug) {
  requireArg(slug, "slug", "frontier leaderboard <slug>");
  const { entries = [] } = await getJson(`/api/challenges/${encodeURIComponent(slug)}/leaderboard`);
  printLeaderboard(slug, entries);
}

function printLeaderboard(slug, entries, prevByAddress) {
  console.log(pc.bold(pc.cyan(`Leaderboard — ${slug}`)) + pc.dim(`  (${new Date().toLocaleTimeString()})`));
  if (entries.length === 0) {
    console.log(pc.dim("No entries yet — be the first king."));
    return;
  }
  const rows = entries.map((e) => {
    let marker = "";
    if (prevByAddress) {
      const prev = prevByAddress.get(e.address);
      if (prev == null) marker = pc.green(" NEW");
      else if (prev > e.rank) marker = pc.green(` ^${prev - e.rank}`);
      else if (prev < e.rank) marker = pc.red(` v${e.rank - prev}`);
    }
    return {
      rank: e.rank === 1 ? pc.yellow(`#${e.rank}`) : `#${e.rank}`,
      name: (e.rank === 1 ? "" : "") + (e.name ?? "anon"),
      address: shortAddr(e.address),
      score: e.score != null ? Number(e.score).toFixed(2) : "-",
      when: e.submittedAt ? new Date(e.submittedAt).toLocaleString() : "-",
      _m: marker,
    };
  });
  const out = table(rows, [
    { key: "rank", label: "RANK", align: "right" },
    { key: "name", label: "NAME" },
    { key: "address", label: "ADDRESS" },
    { key: "score", label: "SCORE", align: "right", color: pc.green },
    { key: "when", label: "SUBMITTED" },
  ]);
  // Append change markers to each data line.
  const lines = out.split("\n");
  for (let i = 0; i < rows.length; i++) {
    if (rows[i]._m) lines[i + 2] += rows[i]._m;
  }
  console.log(lines.join("\n"));
}

// ---------------------------------------------------------------------------
// frontier submit <slug> <file>
// ---------------------------------------------------------------------------
export async function submit(slug, file) {
  requireArg(slug, "slug", "frontier submit <slug> <file>");
  requireArg(file, "file", "frontier submit <slug> <file>");

  const pk = process.env.FRONTIER_PRIVATE_KEY;
  if (!pk) {
    throw new FrontierError(
      `${pc.yellow("FRONTIER_PRIVATE_KEY")} is not set. Export the private key of a Base Sepolia ` +
        `wallet funded with test USDC (https://faucet.circle.com).`,
    );
  }
  const account = privateKeyToAccount(pk.startsWith("0x") ? pk : `0x${pk}`);

  let code;
  try {
    code = await readFile(file, "utf8");
  } catch (err) {
    throw new FrontierError(`Could not read strategy file ${pc.cyan(file)}: ${err.message}`);
  }

  console.log(pc.dim(`Submitting ${file} as ${account.address} ...`));
  console.log(pc.yellow("This is an x402-gated endpoint — paying the entry fee in USDC on Base Sepolia."));

  // viem LocalAccount satisfies x402's EvmSigner type directly.
  // Raise the max spend above x402's 0.10 USDC default so entry fees clear.
  // USDC has 6 decimals; FRONTIER_MAX_USDC (default 10) -> base units.
  const maxUsdc = Number(process.env.FRONTIER_MAX_USDC || "10");
  const maxValue = BigInt(Math.round(maxUsdc * 1e6));
  const payFetch = wrapFetchWithPayment(fetch, account, maxValue);

  const res = await apiFetch(
    `/api/challenges/${encodeURIComponent(slug)}/submit`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: process.env.FRONTIER_NAME || account.address, address: account.address, code }),
    },
    payFetch,
  );

  // Surface what was actually paid, if the facilitator returned a receipt.
  const payHeader = res.headers.get("x-payment-response");
  if (payHeader) {
    try {
      const decoded = decodeXPaymentResponse(payHeader);
      const tx = decoded?.transaction || decoded?.txHash || decoded?.transactionHash;
      console.log(pc.green(`Payment settled${tx ? ` — tx ${tx}` : ""} on ${decoded?.network ?? "base-sepolia"}`));
    } catch {
      console.log(pc.dim("Payment receipt present (could not decode x-payment-response)."));
    }
  } else {
    console.log(pc.dim("No x-payment-response header returned (endpoint may not have charged)."));
  }

  const { submissionId, status } = await res.json();
  console.log(pc.bold(`Submission ${pc.cyan(submissionId)} — ${status}`));

  await pollSubmission(submissionId, slug);
}

async function pollSubmission(submissionId, slug) {
  process.stdout.write(pc.dim("Scoring"));
  while (true) {
    const s = await getJson(`/api/submissions/${encodeURIComponent(submissionId)}`);
    if (s.status === "scored") {
      console.log("");
      console.log(pc.green(pc.bold(`Scored! score=${s.score} rank=#${s.rank}`)));
      if (s.rank === 1) console.log(pc.yellow("You are the KING of this challenge."));
      console.log(pc.dim(`Compare: frontier leaderboard ${slug}`));
      return;
    }
    if (s.status === "error") {
      console.log("");
      throw new FrontierError(`Submission failed: ${s.error || "unknown error"}`);
    }
    process.stdout.write(pc.dim("."));
    await sleep(2000);
  }
}

// ---------------------------------------------------------------------------
// frontier watch <slug>
// ---------------------------------------------------------------------------
export async function watch(slug) {
  requireArg(slug, "slug", "frontier watch <slug>");
  let prevByAddress = null;
  let prevKing = null;
  console.log(pc.dim(`Watching ${slug} — refreshing every 5s. Ctrl-C to stop.`));
  while (true) {
    let entries = [];
    try {
      ({ entries = [] } = await getJson(`/api/challenges/${encodeURIComponent(slug)}/leaderboard`));
    } catch (err) {
      console.log(pc.red(err.message));
      await sleep(5000);
      continue;
    }
    // Clear screen for a stable re-render.
    process.stdout.write("\x1b[2J\x1b[H");
    printLeaderboard(slug, entries, prevByAddress);

    const king = entries.find((e) => e.rank === 1);
    if (king && prevKing && king.address !== prevKing.address) {
      console.log(
        pc.bgMagenta(pc.bold(" DETHRONED ")) +
          ` ${pc.dim(prevKing.name || shortAddr(prevKing.address))} -> ${pc.magenta(king.name || shortAddr(king.address))}`,
      );
    }
    if (king) prevKing = king;
    prevByAddress = new Map(entries.map((e) => [e.address, e.rank]));
    await sleep(5000);
  }
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function requireArg(value, name, usage) {
  if (!value) throw new FrontierError(`Missing <${name}>. Usage: ${pc.cyan(usage)}`);
}

function shortAddr(addr) {
  if (!addr) return "-";
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

export { API_URL };
