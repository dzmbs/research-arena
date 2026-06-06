// Research Arena — ambient arena simulation.
// Lazily materializes "other competitors" submitting to the showcase (non-real)
// challenges so the arena feels live. Called from read endpoints; generates
// any events that became due since the last tick (no background timer needed).
// The real challenge (prediction-market) is NEVER simulated — its leaderboard
// and activity stay 100% genuine.
import { CHALLENGES, FEE_SPLIT } from './arena-data';
import { mutate, addActivity, type DbShape } from './db';

export type SimChallengeState = {
  pool: number;
  runs: number;
  players: number;
  king: { name: string; kind: 'HUMAN' | 'AGENT' } | null;
  kingEarned: number;
};

export type SimState = {
  lastEventAt: number; // ms epoch of last generated event
  counter: number; // deterministic RNG stream position
  challenges: Record<string, SimChallengeState>;
};

const PLAYERS: { name: string; kind: 'HUMAN' | 'AGENT' }[] = [
  { name: 'claude-opus-quant', kind: 'AGENT' },
  { name: 'gpt-trader-9', kind: 'AGENT' },
  { name: 'codex-mm', kind: 'AGENT' },
  { name: 'grok-arb', kind: 'AGENT' },
  { name: 'hermes-agent', kind: 'AGENT' },
  { name: 'claude-geometer', kind: 'AGENT' },
  { name: 'openclaw-7', kind: 'AGENT' },
  { name: 'mev-mike', kind: 'HUMAN' },
  { name: '0xquant', kind: 'HUMAN' },
  { name: 'anna.eth', kind: 'HUMAN' },
  { name: 'kalshi-kid', kind: 'HUMAN' },
  { name: 'fee-bandit.eth', kind: 'HUMAN' },
  { name: 'wordsmith', kind: 'HUMAN' },
  { name: 'dfs-enjoyer', kind: 'HUMAN' },
  { name: 'sigma-rule', kind: 'HUMAN' },
];

// score ranges that look plausible per challenge
const SCORE_RANGE: Record<string, [number, number, number]> = {
  // [min, max, decimals]
  'simple-amm': [240, 460, 1],
  'prop-amm': [260, 520, 1],
  persuasion: [4.2, 9.8, 2],
  negotiation: [0.52, 0.94, 3],
  'maze-runner': [118, 320, 0],
  packing: [0.061, 0.124, 4],
};

// small deterministic LCG so catch-up generation is stable
function rng(seed: number): () => number {
  let s = (seed * 9301 + 49297) % 233280;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function ensureSim(db: DbShape): SimState {
  const d = db as DbShape & { sim?: SimState };
  if (!d.sim) {
    const challenges: Record<string, SimChallengeState> = {};
    for (const c of CHALLENGES) {
      if (c.real) continue;
      challenges[c.slug] = {
        pool: c.mockPoolUsd,
        runs: c.mockRuns,
        players: c.mockPlayers,
        king: c.mockKing ? { ...c.mockKing } : null,
        kingEarned: Math.round(c.mockPoolUsd * 18) / 100, // plausible starting tally
      };
    }
    d.sim = { lastEventAt: Date.now(), counter: 1, challenges };
  }
  return d.sim;
}

export function getSim(db: DbShape): SimState | undefined {
  return (db as DbShape & { sim?: SimState }).sim;
}

/** Generate any due ambient events. Safe to call on every poll. */
export async function tickSim(): Promise<void> {
  await mutate((db) => {
    const sim = ensureSim(db);
    const now = Date.now();
    const mocks = CHALLENGES.filter((c) => !c.real);
    if (mocks.length === 0) return;

    let generated = 0;
    // one submission every ~7-13s; cap catch-up so an idle tab doesn't flood
    while (generated < 8) {
      const r = rng(sim.counter);
      const interval = 7000 + Math.floor(r() * 6000);
      const due = sim.lastEventAt + interval;
      if (due > now) break;

      sim.counter += 1;
      sim.lastEventAt = due;
      generated += 1;

      const c = mocks[Math.floor(r() * mocks.length)];
      const st = sim.challenges[c.slug];
      if (!st) continue;
      const p = PLAYERS[Math.floor(r() * PLAYERS.length)];
      const fee = c.entryFeeUsd;
      const [lo, hi, dp] = SCORE_RANGE[c.slug] ?? [10, 99, 2];
      const score = (lo + r() * (hi - lo)).toFixed(dp);
      const ts = new Date(due).toISOString();

      // update sim economy
      st.runs += 1;
      if (r() < 0.22) st.players += 1;
      st.pool = Math.round((st.pool + fee * FEE_SPLIT.pool) * 100) / 100;
      const kingShare = Math.round(fee * FEE_SPLIT.king * 100) / 100;

      const push = (type: Parameters<typeof addActivity>[1]['type'], text: string, tsOffset = 0) => {
        db.activity.unshift({
          ts: new Date(due + tsOffset).toISOString(),
          type,
          text,
          challengeSlug: c.slug,
        });
      };

      push('submission', `${p.name} paid $${fee.toFixed(2)} to enter ${c.title}`);
      if (st.king) {
        st.kingEarned = Math.round((st.kingEarned + kingShare) * 100) / 100;
        push('fee_split', `${st.king.name} earned $${kingShare.toFixed(2)} king share on ${c.title}`, 400);
      }
      push('scored', `${p.name} scored ${score} on ${c.title}`, 2600);

      // occasional dethronement (never on first event after boot)
      if (r() < 0.13 && st.king && st.king.name !== p.name) {
        st.king = { name: p.name, kind: p.kind };
        st.kingEarned = 0;
        push('new_king', `${p.name} dethroned the king of ${c.title} — fees now stream to them`, 3000);
      }
      void ts;
    }

    if (db.activity.length > 200) db.activity.length = 200;
  });
}
