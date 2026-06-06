// Fallback spec markdown per challenge, used when the detail API is down.

const SPECS: Record<string, string> = {
  'prediction-market': `## Overview

Write a Python market-making strategy for a **binary prediction market**. Your bot
posts limit orders on both sides of a contract that settles to either \`0\` or \`1\`.
You compete against informed traders and noisy retail flow over a simulated session.

## Your task

Implement a single function:

\`\`\`python
def strategy(book, position, cash):
    """Return a list of (side, price, size) orders."""
    return [("BID", 0.48, 10), ("ASK", 0.52, 10)]
\`\`\`

## Scoring

\`\`\`
score = realized_pnl / max_drawdown_risk
\`\`\`

Strategies are run across **200 seeds**. Your score is the median Sharpe-adjusted
PnL. Ties broken by lower inventory variance.

## Rules

- 2 second wall-clock budget per seed.
- No network access inside the sandbox.
- Inventory hard cap: ±100 contracts.
- The current **King** earns 70% of every entry fee until dethroned.`,

  'simple-amm': `## Overview

Design a **fee strategy** for an automated market maker in Solidity. You control the
fee curve; the simulation routes realistic swap flow through competing AMMs and
measures the LP value you capture.

## Interface

\`\`\`solidity
function feeBps(uint256 reserveIn, uint256 reserveOut, uint256 amountIn)
    external view returns (uint16);
\`\`\`

## Scoring

\`score = final_lp_value - initial_lp_value\`, averaged over 50 market regimes
(trending, mean-reverting, toxic flow).

## Rules

- Gas budget enforced per call.
- Fee must be in range \`[0, 1000]\` bps.`,

  'prop-amm': `## Overview

Control the **entire swap function**, not just fees. Write a Rust program that
decides trade outputs directly and adapts to market conditions in real time.

## Scoring

LP value captured vs. a constant-product baseline across adversarial order flow.`,

  persuasion: `## Overview

Write a **140-character** description of a pen to maximize how much a panel of AI
personalities would pay for it.

## Scoring

\`score = median price across 15 diverse AI buyers\` (in simulated dollars).

## Rules

- Hard limit: 140 characters.
- No instructions that try to jailbreak the buyer models — flagged submissions score 0.`,

  negotiation: `## Overview

Write a strategy prompt for an AI agent that negotiates resource splits against a
fixed baseline across 10 scenarios.

## Scoring

Average share of the pie captured, penalized for failed negotiations.`,

  'maze-runner': `## Overview

Navigate procedurally generated mazes with **limited vision**. Your policy competes
on steps-to-exit across 500 seeds.

## Interface

\`\`\`python
def act(observation):
    return "UP" | "DOWN" | "LEFT" | "RIGHT"
\`\`\`

## Scoring

\`score = 1 / mean_steps_to_exit\`. Timeouts count as max steps.`,

  packing: `## Overview

Pack **N circles** into the unit square, maximizing the minimum radius. A classic
optimization problem with a brutal leaderboard.

## Output

Return circle centers; radius is inferred from the tightest pair.

## Scoring

\`score = min_radius\`, higher is better. Validated for overlaps and bounds.`,
};

export function seedSpec(slug: string, title?: string): string {
  return (
    SPECS[slug] ??
    `## ${title ?? 'Challenge'}\n\nSpec loading… The full specification will appear here once the challenge API is reachable.`
  );
}
