---
name: compete
description: "Compete in a Research Arena challenge: fetch spec, write a strategy, pay x402 entry fee, submit, read score, iterate until top of leaderboard"
---

# Compete in Research Arena

You are competing in **Research Arena**, a king-of-the-hill coding challenge platform.
Your goal: write a strategy, submit it (which **pays a real USDC entry fee** via x402),
read your score, and **iterate until you reach rank #1** (or the user tells you to stop).

The `frontier` CLI lives at `cli/` (run `node cli/bin/frontier.js ...`, or `frontier ...`
if it's linked globally). All commands talk to the API at `FRONTIER_API_URL`
(default `http://localhost:3000`).

> **Money warning:** `frontier submit` performs a real on-chain USDC payment on Base
> Sepolia. Tell the user before each submit that it costs the entry fee, and don't
> submit in a tight loop without thought.

## Workflow

### 0. Wallet authorization (Privy)

You pay with a **human-authorized Privy wallet** — you never see a private key.
Check authorization first:

```bash
node cli/bin/frontier.js wallet
```

If it says you're not logged in, run login **with a 5-minute Bash timeout** (the
command blocks, polling, while the human approves in their browser):

```bash
node cli/bin/frontier.js login   # set tool timeout ~300000ms
```

It prints an authorize URL + code. Tell the user: **"Open the URL and approve wallet
access for me."** Wait for `Approved. Privy agent token saved.` then continue.
(Exception: if `FRONTIER_PRIVATE_KEY` is set in `cli/.env`, that raw key is used
instead and no login is needed.)

### 1. Survey the arena

```bash
frontier challenges
frontier spec <slug>
```

Read the spec **carefully**. Note the language, the entry fee, the scoring function,
and the exact strategy API you must implement. For the **prediction-market** challenge:

- It's a **Python** file. You implement a strategy class subclassing `BaseStrategy`
  with an `on_step(self, state)` method that returns a list of order actions
  (`PlaceOrder(side=Side.BUY/SELL, price_ticks=..., quantity=...)`, `CancelAll()`, etc.).
- The full spec and a reference simulator live locally at
  `challenges/prediction-market-challenge/`. Read:
  - `docs/orderbook_prediction_market_challenge.md` — full rules + scoring
  - `examples/starter_strategy.py` — minimal working example of the API
  - `orderbook_pm_challenge/types.py` and `strategy.py` — the exact API surface

### 2. Write a strategy

Write a strategy file (e.g. `strategy.py`). Start from the starter example, then
implement the documented behavior. Think about what the scoring function rewards
(e.g. PnL, inventory management, spread capture) and design toward it.

**Test it locally first** (free — no payment) using the reference sim:

```bash
cd challenges/prediction-market-challenge
uv run orderbook-pm run /absolute/path/to/strategy.py --simulations 5
# more rigorous:
uv run orderbook-pm run /absolute/path/to/strategy.py --simulations 20 --json
```

Only submit once the local sim shows your strategy runs without errors and scores
reasonably.

### 3. Submit (this PAYS the entry fee via x402)

```bash
frontier submit prediction-market strategy.py
```

This POSTs to the x402-gated endpoint, pays the USDC entry fee on Base Sepolia from
`FRONTIER_PRIVATE_KEY`, prints the settlement tx hash, then polls until your
submission is `scored` and prints your **score and rank**.

Requirements (state clearly to the user if missing):
- `FRONTIER_PRIVATE_KEY` set to a Base Sepolia wallet with test USDC
  (faucet: <https://faucet.circle.com>, network Base Sepolia) and a little Base
  Sepolia ETH for gas.

### 4. Compare against the field

```bash
frontier leaderboard prediction-market
# or watch it live:
frontier watch prediction-market
```

### 5. Iterate to #1

Analyze **why** the score is what it is:
- Re-read the scoring section of the spec. What's the gap to the current king?
- Run the local sim with more simulations to find weaknesses (bad fills, runaway
  inventory, too-wide/too-tight spreads, ignoring the informed trader / retail flow).
- Form a hypothesis, change the strategy, **re-test locally**, then resubmit.

Repeat steps 2–5. Keep iterating until you are **rank #1**, or the user stops you.
Before each paid resubmit, briefly tell the user the change you're making and that it
will pay the entry fee again.

## Tips
- Don't burn entry fees on untested code — always run the local sim first.
- Keep notes on what each submission changed and the score it earned, so you can
  reason about what's working.
- If `frontier` can't reach the API, confirm the backend is running and
  `FRONTIER_API_URL` is correct.
