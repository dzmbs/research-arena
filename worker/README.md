# Frontier Arena — Scoring Worker

Polls the Next.js API for queued strategy submissions, runs each one through the
orderbook prediction-market simulator, and posts the **mean edge** back as the score.

## Run

```bash
node worker/worker.mjs
```

Make sure the Next.js dev server is running first (`pnpm dev` in `web/`).

## How it works

1. `GET /api/worker/next-job` (header `x-worker-secret`) → oldest queued submission, marked `running`.
2. Writes the submitted code to a temp `strategy.py`.
3. Runs `uv run orderbook-pm run <file> --json --simulations 10` with cwd
   `challenges/prediction-market-challenge`.
4. Score = average `total_edge` over non-failed simulations from the JSON output.
5. `POST /api/worker/result` with `{ id, score }` (or `{ id, error }` on
   nonzero exit / timeout / no successful sims). stderr is truncated to 500 chars.

## Env

| var | default | meaning |
| --- | --- | --- |
| `API_BASE` | `http://localhost:3000` | Next.js server base URL |
| `WORKER_SECRET` | `frontier-dev-secret` | must match the server's `WORKER_SECRET` |

`uv` is expected at `~/.local/bin/uv`; the worker prepends it to `PATH`.
Timeout per simulation run is 120s.
