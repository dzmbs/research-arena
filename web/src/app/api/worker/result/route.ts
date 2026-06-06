import { NextResponse, type NextRequest } from 'next/server';
import {
  addActivity,
  leaderboard,
  mutate,
  type DbShape,
} from '@/lib/db';
import { getSeed, inferKind } from '@/lib/arena';
import { setKingOnChain } from '@/lib/chain';

export const dynamic = 'force-dynamic';

function authOk(request: NextRequest): boolean {
  const expected = process.env.WORKER_SECRET || 'frontier-dev-secret';
  return request.headers.get('x-worker-secret') === expected;
}

export async function POST(request: NextRequest) {
  if (!authOk(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { id?: string; score?: number; error?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const { id } = body;
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  // Apply the result and determine whether the king changed.
  const outcome = await mutate((db: DbShape) => {
    const sub = db.submissions.find((s) => s.id === id);
    if (!sub) return { notFound: true } as const;

    const now = new Date().toISOString();
    if (typeof body.error === 'string' && body.error.length > 0) {
      sub.status = 'error';
      sub.error = body.error;
      sub.scoredAt = now;
      addActivity(db, {
        type: 'scored',
        text: `${sub.name}'s submission errored`,
        challengeSlug: sub.challengeSlug,
      });
      return { notFound: false, kingChanged: false } as const;
    }

    const score = typeof body.score === 'number' ? body.score : 0;
    sub.status = 'scored';
    sub.score = score;
    sub.scoredAt = now;
    addActivity(db, {
      type: 'scored',
      text: `${sub.name} scored ${score.toFixed(4)}`,
      challengeSlug: sub.challengeSlug,
    });

    // Recompute king from the leaderboard top.
    const rows = leaderboard(db, sub.challengeSlug);
    const top = rows[0];
    let kingChanged = false;
    let newKingAddress: string | undefined;
    let newKingName: string | undefined;
    if (top) {
      const current = db.kings[sub.challengeSlug];
      if (!current || current.address !== top.address || current.name !== top.name) {
        db.kings[sub.challengeSlug] = {
          name: top.name,
          address: top.address,
          score: top.score,
          since: now,
        };
        kingChanged = true;
        newKingAddress = top.address;
        newKingName = top.name;
        addActivity(db, {
          type: 'new_king',
          text: `${top.name} is the new king (score ${top.score.toFixed(4)})`,
          challengeSlug: sub.challengeSlug,
        });
      } else {
        // keep king's score fresh
        current.score = top.score;
      }
    }

    return {
      notFound: false,
      kingChanged,
      challengeSlug: sub.challengeSlug,
      newKingAddress,
      newKingName,
    } as const;
  });

  if (outcome.notFound) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  // Best-effort on-chain king update — never blocks the response with a throw.
  if (
    outcome.kingChanged &&
    outcome.newKingAddress &&
    outcome.challengeSlug
  ) {
    const seed = getSeed(outcome.challengeSlug);
    if (seed) {
      const txHash = await setKingOnChain(seed.id, outcome.newKingAddress);
      if (txHash) {
        await mutate((db) => {
          addActivity(db, {
            type: 'payout',
            text: `On-chain king set for ${outcome.newKingName} (tx ${txHash.slice(0, 10)}…)`,
            challengeSlug: outcome.challengeSlug!,
          });
        });
        console.log(`[result] setKing tx: ${txHash}`);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
