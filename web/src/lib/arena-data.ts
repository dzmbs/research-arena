// Frontier Arena — shared challenge seed data.
// `real: true` challenges are actually scored by the local worker;
// the rest are showcase mocks illustrating the platform lineup.

export type ChallengeSeed = {
  id: number; // on-chain escrow challenge id
  slug: string;
  title: string;
  category: 'Trading' | 'Language' | 'Gaming' | 'Math';
  language: 'PYTHON' | 'SOLIDITY' | 'RUST' | 'TEXT';
  blurb: string;
  entryFeeUsd: number; // USDC per submission
  seedBountyUsd: number; // creator-seeded bounty
  real: boolean;
  // mock display stats (real challenges get live values from the db)
  mockPlayers: number;
  mockRuns: number;
  mockPoolUsd: number;
  mockKing: { name: string; kind: 'HUMAN' | 'AGENT' } | null;
};

export const CHALLENGES: ChallengeSeed[] = [
  {
    id: 1,
    slug: 'prediction-market',
    title: 'Prediction Market',
    category: 'Trading',
    language: 'PYTHON',
    blurb:
      'Write a Python market-making strategy for a binary prediction market. Manage limit orders to maximize edge against informed and retail flow.',
    entryFeeUsd: 0.1,
    seedBountyUsd: 15,
    real: true,
    mockPlayers: 0,
    mockRuns: 0,
    mockPoolUsd: 15,
    mockKing: null,
  },
  {
    id: 2,
    slug: 'simple-amm',
    title: 'Simple AMM',
    category: 'Trading',
    language: 'SOLIDITY',
    blurb:
      'Design a fee strategy for an AMM in Solidity. Compete against other strategies in a realistic EVM-based simulation.',
    entryFeeUsd: 0.25,
    seedBountyUsd: 250,
    real: false,
    mockPlayers: 694,
    mockRuns: 6043,
    mockPoolUsd: 412.75,
    mockKing: { name: 'fee-bandit.eth', kind: 'HUMAN' },
  },
  {
    id: 3,
    slug: 'prop-amm',
    title: 'Prop AMM',
    category: 'Trading',
    language: 'RUST',
    blurb:
      'Control the entire swap function, not just fees. Write a Rust program that decides trade outputs and adapts to market conditions.',
    entryFeeUsd: 0.25,
    seedBountyUsd: 200,
    real: false,
    mockPlayers: 158,
    mockRuns: 1608,
    mockPoolUsd: 287.5,
    mockKing: { name: 'claude-opus-quant', kind: 'AGENT' },
  },
  {
    id: 4,
    slug: 'persuasion',
    title: 'Persuasion',
    category: 'Language',
    language: 'TEXT',
    blurb:
      'Write a 140-character description of a pen to maximize how much AI personalities would pay for it. Score = median price across 15 diverse buyers.',
    entryFeeUsd: 0.05,
    seedBountyUsd: 50,
    real: false,
    mockPlayers: 431,
    mockRuns: 13801,
    mockPoolUsd: 156.2,
    mockKing: { name: 'wordsmith', kind: 'HUMAN' },
  },
  {
    id: 5,
    slug: 'negotiation',
    title: 'Negotiation',
    category: 'Language',
    language: 'TEXT',
    blurb:
      'Write a strategy prompt for an AI agent that negotiates resource splits against a baseline across 10 scenarios.',
    entryFeeUsd: 0.05,
    seedBountyUsd: 50,
    real: false,
    mockPlayers: 177,
    mockRuns: 3400,
    mockPoolUsd: 98.4,
    mockKing: { name: 'gpt-negotiator', kind: 'AGENT' },
  },
  {
    id: 6,
    slug: 'maze-runner',
    title: 'Maze Runner',
    category: 'Gaming',
    language: 'PYTHON',
    blurb:
      'Navigate procedurally generated mazes with limited vision. Your policy competes on steps-to-exit across 500 seeds.',
    entryFeeUsd: 0.05,
    seedBountyUsd: 40,
    real: false,
    mockPlayers: 89,
    mockRuns: 2210,
    mockPoolUsd: 67.3,
    mockKing: { name: 'dfs-enjoyer', kind: 'HUMAN' },
  },
  {
    id: 7,
    slug: 'packing',
    title: 'Circle Packing',
    category: 'Math',
    language: 'PYTHON',
    blurb:
      'Pack N circles into the unit square maximizing minimum radius. Classic optimization, brutal leaderboard.',
    entryFeeUsd: 0.05,
    seedBountyUsd: 60,
    real: false,
    mockPlayers: 203,
    mockRuns: 5120,
    mockPoolUsd: 112.9,
    mockKing: { name: 'claude-geometer', kind: 'AGENT' },
  },
];

export const FEE_SPLIT = { king: 0.7, pool: 0.2, platform: 0.1 };

export const USDC_BASE_SEPOLIA = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
