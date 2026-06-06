// Client-side view types matching the backend API contract, plus
// helpers to build resilient fallbacks from arena-data seed.

import { CHALLENGES, FEE_SPLIT } from './arena-data';

export type Kind = 'HUMAN' | 'AGENT';

export type ChallengeView = {
  id: number;
  slug: string;
  title: string;
  category: 'Trading' | 'Language' | 'Gaming' | 'Math';
  language: 'PYTHON' | 'SOLIDITY' | 'RUST' | 'TEXT';
  blurb: string;
  entryFeeUsd: number;
  pool: number;
  king: { name: string; kind: Kind } | null;
  players: number;
  runs: number;
  real: boolean;
};

export type LeaderEntry = {
  rank: number;
  name: string;
  kind: Kind;
  address?: string;
  score: number;
  earnedUsd: number;
  submittedAt: string; // iso
};

export type ActivityEvent = {
  ts: string;
  type: 'submission' | 'scored' | 'new_king' | 'fee_split' | 'payout';
  text: string;
  challengeSlug?: string;
};

export type SubmissionStatus = {
  status: 'queued' | 'running' | 'scored' | 'error';
  score?: number;
  rank?: number;
  total?: number;
  error?: string;
};

export const FEE = FEE_SPLIT;

// ----- Fallback builders (used when API is down / 404) -----

export function seedToView(): ChallengeView[] {
  return CHALLENGES.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    category: c.category,
    language: c.language,
    blurb: c.blurb,
    entryFeeUsd: c.entryFeeUsd,
    pool: c.mockPoolUsd,
    king: c.mockKing,
    players: c.mockPlayers,
    runs: c.mockRuns,
    real: c.real,
  }));
}

export function seedChallenge(slug: string): ChallengeView | undefined {
  return seedToView().find((c) => c.slug === slug);
}

export const CATEGORY_ORDER: ChallengeView['category'][] = [
  'Trading',
  'Language',
  'Gaming',
  'Math',
];

export function fmtUsd(n: number, opts?: { cents?: boolean }): string {
  if (opts?.cents || n < 10) {
    return '$' + n.toFixed(2);
  }
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (s < 60) return s + 's ago';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  const d = Math.floor(h / 24);
  return d + 'd ago';
}

// Build a plausible fallback leaderboard for a challenge from its seed king.
export function seedLeaderboard(slug: string): LeaderEntry[] {
  const c = seedChallenge(slug);
  if (!c) return [];
  const king = c.king;
  const now = Date.now();
  const names: { name: string; kind: Kind }[] = [
    king ?? { name: 'anon-7', kind: 'HUMAN' },
    { name: 'claude-opus-quant', kind: 'AGENT' },
    { name: 'satoshi.eth', kind: 'HUMAN' },
    { name: 'gpt-trader', kind: 'AGENT' },
    { name: 'anon-42', kind: 'HUMAN' },
    { name: 'rng-baseline', kind: 'AGENT' },
  ];
  // de-dup if king already in list
  const seen = new Set<string>();
  const uniq = names.filter((n) => {
    if (seen.has(n.name)) return false;
    seen.add(n.name);
    return true;
  });
  let score = 0.94;
  return uniq.map((n, i) => {
    score -= Math.random() * 0.06 + 0.04;
    const earned = i === 0 ? c.pool * FEE.king * 0.4 : 0;
    return {
      rank: i + 1,
      name: n.name,
      kind: n.kind,
      score: Number((0.5 + (uniq.length - i) / uniq.length / 2).toFixed(4)),
      earnedUsd: Number(earned.toFixed(2)),
      submittedAt: new Date(now - (i + 1) * 1000 * 60 * (7 + i * 11)).toISOString(),
    };
  });
}

export function seedActivity(): ActivityEvent[] {
  const now = Date.now();
  const mk = (sec: number, type: ActivityEvent['type'], text: string, slug?: string): ActivityEvent => ({
    ts: new Date(now - sec * 1000).toISOString(),
    type,
    text,
    challengeSlug: slug,
  });
  return [
    mk(4, 'submission', 'anon-42 paid $0.25 → simple-amm', 'simple-amm'),
    mk(11, 'fee_split', 'fee-bandit.eth earned $0.175 (King)', 'simple-amm'),
    mk(23, 'scored', 'claude-opus-quant scored 0.8421 → #2', 'prop-amm'),
    mk(40, 'submission', 'wordsmith paid $0.05 → persuasion', 'persuasion'),
    mk(58, 'new_king', 'New King: claude-geometer on Circle Packing', 'packing'),
    mk(72, 'fee_split', 'claude-geometer earned $0.035 (King)', 'packing'),
    mk(95, 'submission', 'dfs-enjoyer paid $0.05 → maze-runner', 'maze-runner'),
    mk(120, 'payout', 'gpt-negotiator withdrew $4.20 earnings', 'negotiation'),
    mk(150, 'scored', 'anon-7 scored 0.6710 → #5', 'prediction-market'),
    mk(190, 'submission', 'satoshi.eth paid $0.10 → prediction-market', 'prediction-market'),
  ];
}
