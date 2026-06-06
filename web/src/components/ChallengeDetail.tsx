'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Header from './Header';
import Footer from './Footer';
import Markdown from './Markdown';
import Leaderboard from './Leaderboard';
import SubmitPanel from './SubmitPanel';
import PrizePoolCard from './PrizePoolCard';
import KingCard from './KingCard';
import ActivityFeed from './ActivityFeed';
import NewKingToast from './NewKingToast';
import { ChallengeViz } from './ChallengeViz';
import { LangBadge, LiveBadge } from './Primitives';
import type { ChallengeView, LeaderEntry } from '@/lib/ui-types';
import { seedChallenge, seedLeaderboard } from '@/lib/ui-types';
import { seedSpec } from '@/lib/ui-spec';

export default function ChallengeDetail({ slug }: { slug: string }) {
  const seed = seedChallenge(slug);
  const [challenge, setChallenge] = useState<ChallengeView | null>(seed ?? null);
  const [spec, setSpec] = useState<string>(() => seedSpec(slug, seed?.title));
  // Real challenges must NEVER flash mock rows — start empty and fill from the API.
  const [entries, setEntries] = useState<LeaderEntry[]>(() =>
    seed?.real ? [] : seedLeaderboard(slug),
  );
  const [toastName, setToastName] = useState<string | null>(null);
  const lastKing = useRef<string | null>(seed?.king?.name ?? null);

  // Load detail + spec once.
  useEffect(() => {
    let stop = false;
    (async () => {
      try {
        const r = await fetch(`/api/challenges/${slug}`, { cache: 'no-store' });
        if (!r.ok) throw new Error('bad');
        const data = await r.json();
        if (stop) return;
        const ch = data.challenge ?? data;
        if (ch && ch.slug) setChallenge(ch);
        if (data.spec) setSpec(data.spec);
      } catch {
        // keep seed
      }
    })();
    return () => {
      stop = true;
    };
  }, [slug]);

  // Poll challenge + leaderboard every 4s; detect king change & pool ticks.
  useEffect(() => {
    let stop = false;
    async function load() {
      try {
        const r = await fetch(`/api/challenges/${slug}/leaderboard`, { cache: 'no-store' });
        if (r.ok) {
          const data = await r.json();
          if (!stop && Array.isArray(data?.entries)) {
            setEntries(data.entries);
            const newKing = data.entries[0]?.name;
            if (newKing && lastKing.current && newKing !== lastKing.current) {
              setToastName(newKing);
              setTimeout(() => setToastName(null), 6000);
            }
            if (newKing) lastKing.current = newKing;
          }
        }
      } catch {
        /* keep */
      }
      try {
        const r2 = await fetch(`/api/challenges/${slug}`, { cache: 'no-store' });
        if (r2.ok) {
          const d = await r2.json();
          const ch = d.challenge ?? d;
          if (!stop && ch?.slug) setChallenge(ch);
        }
      } catch {
        /* keep */
      }
    }
    const id = setInterval(load, 4000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [slug]);

  if (!challenge) {
    return (
      <div className="app">
        <Header />
        <main className="app-main">
          <div className="wrap" style={{ padding: '80px 0', textAlign: 'center' }}>
            <h1 style={{ fontSize: 28, fontWeight: 600 }}>Challenge not found</h1>
            <Link href="/" className="mono">
              ← back to arena
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const king = entries[0] ?? null;

  return (
    <div className="app">
      <Header />
      {toastName && <NewKingToast name={toastName} onClose={() => setToastName(null)} />}

      <main className="app-main">
        <div className="wrap">
          <div className="detail-top">
            <div className="crumb">
              <Link href="/" className="navlink">
                arena
              </Link>
              <span>/</span>
              <span>{challenge.category.toLowerCase()}</span>
              <span>/</span>
              <span style={{ color: 'var(--ink-2)' }}>{challenge.slug}</span>
            </div>
            <div className="detail-titleline">
              <h1>{challenge.title}</h1>
              <LangBadge lang={challenge.language} />
              {challenge.real && <LiveBadge />}
            </div>
            <div className="detail-meta">
              <span>{challenge.category}</span>
              <span className="sep">·</span>
              <span className="mono">{challenge.players.toLocaleString()} players</span>
              <span className="sep">·</span>
              <span className="mono">{challenge.runs.toLocaleString()} runs</span>
              <span className="sep">·</span>
              <span className="mono">scored over many simulations</span>
            </div>
          </div>

          <div className="detail-grid">
            {/* LEFT: viz + spec + leaderboard */}
            <div className="min-w-0">
              <ChallengeViz slug={challenge.slug} />

              <div className="spec">
                <Markdown source={spec} />
              </div>

              <div style={{ marginTop: 44 }}>
                <div className="lb-head">
                  <div>
                    <h2>Leaderboard</h2>
                    <div className="lb-sub">Strategies ranked by score · king earns 70% of fees</div>
                  </div>
                </div>
                <Leaderboard entries={entries} />
              </div>
            </div>

            {/* RIGHT RAIL */}
            <aside className="rail">
              <PrizePoolCard c={challenge} />
              <KingCard c={challenge} king={king} />
              <SubmitPanel c={challenge} />
              <div className="card card-pad">
                <ActivityFeed />
              </div>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
