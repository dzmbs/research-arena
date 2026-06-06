import { NextResponse, type NextRequest } from 'next/server';
import { mutate } from '@/lib/db';

export const dynamic = 'force-dynamic';

function authOk(request: NextRequest): boolean {
  const expected = process.env.WORKER_SECRET || 'frontier-dev-secret';
  return request.headers.get('x-worker-secret') === expected;
}

export async function GET(request: NextRequest) {
  if (!authOk(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const job = await mutate((db) => {
    const next = db.submissions.find((s) => s.status === 'queued');
    if (!next) return null;
    next.status = 'running';
    return { id: next.id, challengeSlug: next.challengeSlug, code: next.code };
  });

  if (!job) return new NextResponse(null, { status: 204 });
  return NextResponse.json(job);
}
