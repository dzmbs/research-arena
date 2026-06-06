// Research Arena — server-side helpers shared across API routes.
import { promises as fs } from 'fs';
import {
  CHALLENGES,
  FEE_SPLIT,
  type ChallengeSeed,
} from '@/lib/arena-data';
import type { DbShape } from '@/lib/db';

export const SPEC_PATH =
  '/Users/vani/Projects/cb-hack/challenges/prediction-market-challenge/docs/orderbook_prediction_market_challenge.md';

export function getSeed(slug: string): ChallengeSeed | undefined {
  return CHALLENGES.find((c) => c.slug === slug);
}

export function paidSubmissions(db: DbShape, slug: string) {
  return db.submissions.filter((s) => s.challengeSlug === slug);
}

/** Live pool for a real challenge = seed bounty + 20% of fees collected. */
export function livePool(seed: ChallengeSeed, db: DbShape): number {
  const subs = paidSubmissions(db, seed.slug);
  const feesCollected = subs.length * seed.entryFeeUsd;
  const pool = seed.seedBountyUsd + FEE_SPLIT.pool * feesCollected;
  return Math.round(pool * 100) / 100;
}

export function distinctPlayers(db: DbShape, slug: string): number {
  const set = new Set<string>();
  for (const s of db.submissions) {
    if (s.challengeSlug === slug) set.add(`${s.name}|${s.address}`);
  }
  return set.size;
}

export function runCount(db: DbShape, slug: string): number {
  return db.submissions.filter((s) => s.challengeSlug === slug).length;
}

export function inferKind(
  name: string,
  kind?: 'HUMAN' | 'AGENT',
): 'HUMAN' | 'AGENT' {
  if (kind) return kind;
  const n = (name || '').toLowerCase();
  if (n.includes('agent') || n.includes('claude') || n.includes('bot'))
    return 'AGENT';
  return 'HUMAN';
}

// in-memory spec cache
let specCache: string | null = null;

export async function getSpec(slug: string): Promise<string> {
  const seed = getSeed(slug);
  if (!seed) return '';
  if (!seed.real) return seed.blurb;
  if (specCache !== null) return specCache;
  try {
    specCache = await fs.readFile(SPEC_PATH, 'utf8');
  } catch {
    specCache = seed.blurb;
  }
  return specCache;
}

// ---- mocked leaderboard for showcase (non-real) challenges ----
const MOCK_NAMES_HUMAN = [
  'quant-quinn',
  'fee-bandit.eth',
  'mev-maxi',
  'dfs-enjoyer',
  'wordsmith',
  'orderflow-otto',
  'gamma-greg',
  'theta-tina',
];
const MOCK_NAMES_AGENT = [
  'claude-opus-quant',
  'gpt-negotiator',
  'claude-geometer',
  'agent-smith',
];

export type MockLbRow = {
  rank: number;
  name: string;
  kind: 'HUMAN' | 'AGENT';
  address: string;
  score: number;
  earnedUsd: number;
  submittedAt: string;
};

export function mockLeaderboard(seed: ChallengeSeed): MockLbRow[] {
  const rows: MockLbRow[] = [];
  const count = 9;
  // deterministic pseudo-random from slug
  let h = 0;
  for (const ch of seed.slug) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const rand = () => {
    h = (h * 1103515245 + 12345) >>> 0;
    return (h % 100000) / 100000;
  };
  const pool = [...MOCK_NAMES_HUMAN, ...MOCK_NAMES_AGENT];
  let topScore = 40 + rand() * 60;
  for (let i = 0; i < count; i++) {
    let name: string;
    let kind: 'HUMAN' | 'AGENT';
    if (i === 0 && seed.mockKing) {
      name = seed.mockKing.name;
      kind = seed.mockKing.kind;
    } else {
      name = pool[(i * 3 + Math.floor(rand() * pool.length)) % pool.length];
      kind = MOCK_NAMES_AGENT.includes(name) ? 'AGENT' : 'HUMAN';
    }
    const score = Math.round(topScore * 100) / 100;
    topScore -= rand() * 6 + 1;
    const earned =
      i === 0
        ? Math.round(seed.mockPoolUsd * 0.4 * 100) / 100
        : Math.round((score / 100) * seed.entryFeeUsd * 30 * 100) / 100;
    rows.push({
      rank: i + 1,
      name,
      kind,
      address:
        '0x' +
        (h + i * 7919).toString(16).padStart(40, '0').slice(0, 40),
      score,
      earnedUsd: earned,
      submittedAt: new Date(Date.now() - (i + 1) * 3600_000).toISOString(),
    });
  }
  return rows;
}
