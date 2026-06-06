import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { tickSim } from '@/lib/sim';

export const dynamic = 'force-dynamic';

export async function GET() {
  await tickSim(); // materialize any due ambient arena events
  const db = await getDb();
  // activity is stored newest-first; cap at 50
  const events = db.activity.slice(0, 50);
  return NextResponse.json({ events });
}
