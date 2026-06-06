import { NextResponse, type NextRequest } from 'next/server';
import { getDb, leaderboard } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = await getDb();
  const sub = db.submissions.find((s) => s.id === id);
  if (!sub) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  let rank: number | undefined;
  if (sub.status === 'scored') {
    const rows = leaderboard(db, sub.challengeSlug);
    const idx = rows.findIndex(
      (r) => r.name === sub.name && r.address === sub.address,
    );
    if (idx >= 0) rank = idx + 1;
  }

  return NextResponse.json({
    status: sub.status,
    score: sub.score,
    rank,
    error: sub.error,
  });
}
