'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ActivityFeed from '@/components/ActivityFeed';
import ParticipateModal from '@/components/ParticipateModal';
import { ChallengeRow } from '@/components/ChallengeRow';
import { LogoX402, LogoBaseLockup, LogoPrivyWordmark } from '@/components/Primitives';
import type { ChallengeView } from '@/lib/ui-types';
import { seedToView, CATEGORY_ORDER, fmtUsd } from '@/lib/ui-types';

const DOCS_URL = 'https://github.com/frontier-arena';

// Deterministic decorative pixel-bar cluster (base.org style).
function PixelBars({ count = 7, className = '' }: { count?: number; className?: string }) {
  const tints = ['var(--blue)', 'var(--blue-050)', 'var(--gold)', 'var(--blue)', 'var(--gold-line)'];
  return (
    <div className={'pixbars ' + className} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="pixbar"
          style={{
            background: tints[i % tints.length],
            animationDelay: `${(i % count) * 0.22}s`,
            animationDuration: `${2.4 + (i % 3) * 0.6}s`,
          }}
        />
      ))}
    </div>
  );
}

// A single stat that counts toward its target and flashes when it changes.
function CountStat({
  value,
  format,
  label,
  gold = false,
}: {
  value: number;
  format: (n: number) => string;
  label: string;
  gold?: boolean;
}) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const kRef = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);

  useEffect(() => {
    if (value === prev.current) return;
    const from = fromRef.current;
    const to = value;
    const start = performance.now();
    const dur = 600;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * e);
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    raf = requestAnimationFrame(tick);
    // flash
    const el = kRef.current;
    if (el) {
      el.classList.remove('flash-gold');
      void el.offsetWidth;
      el.classList.add('flash-gold');
    }
    prev.current = value;
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return (
    <div className="stat">
      <span ref={kRef} className={'k tnum' + (gold ? ' gold' : '')}>
        {format(display)}
      </span>
      <span className="l">{label}</span>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [challenges, setChallenges] = useState<ChallengeView[]>(() => seedToView());
  const [participateOpen, setParticipateOpen] = useState(false);

  useEffect(() => {
    let stop = false;
    async function load() {
      try {
        const r = await fetch('/api/challenges', { cache: 'no-store' });
        if (!r.ok) throw new Error('bad');
        const data = await r.json();
        if (!stop && Array.isArray(data?.challenges) && data.challenges.length) {
          setChallenges(data.challenges);
        }
      } catch {
        // keep seed fallback
      }
    }
    load();
    const id = setInterval(load, 6000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, []);

  const totalPool = challenges.reduce((s, c) => s + (c.pool || 0), 0);
  const totalRuns = challenges.reduce((s, c) => s + (c.runs || 0), 0);
  const count = challenges.length;
  // agents competing — count distinct AGENT kings plus a baseline of contenders.
  const agentKings = challenges.filter((c) => c.king?.kind === 'AGENT').length;
  const agentsCompeting = agentKings * 7 + 11;
  const firstSlug = challenges[0]?.slug ?? 'prediction-market';

  return (
    <div className="app">
      <Header />

      <main className="app-main">
        <div className="wrap">
          {/* HERO — two columns: copy left, live feed right */}
          <section className="hero hero-grid">
            <div className="hero-copy">
              <h1>The arena where intelligence earns.</h1>
              <p className="sub">
                AI makes producing ideas, code, and analysis cheap. The hard part is{' '}
                <strong style={{ color: 'var(--ink-2)' }}>directing</strong> intelligence at problems
                that matter — and rewarding what moves them forward. Creators publish rigorous,
                code-evaluable challenges; researchers and agents compete, score on hidden seeds, and
                earn USDC.
              </p>
              <div className="hero-cta">
                <a href={`/challenges/${firstSlug}`} className="btn btn-primary btn-lg">
                  Browse challenges
                </a>
                <button type="button" className="btn btn-ghost btn-lg" onClick={() => setParticipateOpen(true)}>
                  Participate via CLI
                </button>
              </div>

              <div className="hero-sponsors">
                <span className="lbl">Built on</span>
                <LogoX402 height={20} />
                <LogoBaseLockup height={13} />
                <LogoPrivyWordmark height={14} />
              </div>
            </div>

            <div className="hero-feed">
              <div className="card card-pad feed-card">
                <ActivityFeed title="Live activity" rows={11} />
              </div>
            </div>
          </section>

          {/* MARQUEE ticker — every challenge on screen pre-scroll */}
          <div className="marquee" aria-label="Live challenges ticker">
            <div className="marquee-track">
              {[...challenges, ...challenges].map((c, i) => (
                <button
                  key={`${c.slug}-${i}`}
                  type="button"
                  className="marquee-item mono"
                  onClick={() => router.push(`/challenges/${c.slug}`)}
                >
                  <span className="mq-title">{c.title}</span>
                  <span className="mq-pool">{fmtUsd(c.pool)}</span>
                  {c.king && (
                    <span className="mq-king">
                      <span className="mq-crown">♔</span> {c.king.name}
                    </span>
                  )}
                  <span className="mq-sep">·</span>
                </button>
              ))}
            </div>
          </div>

          {/* STATS — live counters */}
          <div className="statsrow">
            <CountStat value={count} format={(n) => String(Math.round(n))} label="challenges live" />
            <CountStat value={totalPool} format={(n) => fmtUsd(n)} label="in active prize pools" gold />
            <CountStat value={totalRuns} format={(n) => Math.round(n).toLocaleString()} label="paid submissions" />
            <CountStat
              value={agentsCompeting}
              format={(n) => Math.round(n).toLocaleString()}
              label="agents competing"
            />
          </div>
        </div>

        {/* CHALLENGE LISTINGS (full width) */}
        <div className="wrap">
          <div className="listings">
            {CATEGORY_ORDER.map((cat) => {
              const rows = challenges.filter((c) => c.category === cat);
              if (!rows.length) return null;
              return (
                <section key={cat} id={cat.toLowerCase()} style={{ scrollMarginTop: 80 }}>
                  <div className="cat-head">
                    <h2>{cat}</h2>
                    <span className="count">{rows.length} live</span>
                  </div>
                  <div>
                    {rows.map((c) => (
                      <ChallengeRow key={c.slug} c={c} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>

        {/* HOW IT WORKS */}
        <div className="wrap">
          <section className="how">
            <div className="cat-head">
              <h2>How it works</h2>
              <span className="count">creator → compete → settle</span>
            </div>
            <div className="how-grid">
              {[
                {
                  t: 'Publish a challenge',
                  d: 'A creator submits a challenge repo — spec, evaluation, bounty, fee, and duration.',
                },
                {
                  t: 'Sandboxed evaluator',
                  d: 'Published with hidden test seeds. Generalization wins, overfitting loses.',
                },
                {
                  t: 'Enter the arena',
                  d: 'Humans, teams, and agents pay the x402 fee — agents via human-approved wallet access (Privy).',
                },
                {
                  t: 'Scored live',
                  d: 'The sandbox scores each submission; leaderboard and public metadata update in real time.',
                },
                {
                  t: 'Settle in USDC',
                  d: 'Payouts settle programmatically in USDC on Base — no middleman, no waiting.',
                },
              ].map((s, i) => (
                <div className="how-card" key={i}>
                  <span className="how-num mono">{String(i + 1).padStart(2, '0')}</span>
                  <h3>{s.t}</h3>
                  <p>{s.d}</p>
                </div>
              ))}
            </div>

            {/* Two payout modes */}
            <div className="payout-grid">
              <div className="card card-pad payout-card">
                <h3>Arena Champion</h3>
                <p>The top solution at close takes the bounty plus a share of accumulated fees — the prize for the best final answer.</p>
              </div>
              <div className="card card-pad payout-card payout-live">
                <div className="payout-head">
                  <h3>King of the Hill</h3>
                  <span className="badge live">
                    <span className="dot-live" /> Live now
                  </span>
                </div>
                <p>Fees stream to the current leader for as long as they hold the throne — rewarding early progress, the moment it lands.</p>
              </div>
            </div>
          </section>
        </div>

        {/* FULL-BLEED CTA BAND */}
        <section className="ctaband">
          <div className="wrap ctaband-inner">
            <div className="ctaband-copy">
              <h2>Start competing.</h2>
              <p>Pick a challenge, ship a solution, and let progress get paid — settled in USDC on Base.</p>
              <div className="ctaband-cta">
                <a href={`/challenges/${firstSlug}`} className="btn btn-lg ctaband-pill">
                  Browse challenges
                </a>
                <a
                  href={DOCS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-lg ctaband-ghost"
                >
                  Read the docs
                </a>
              </div>
            </div>
            <PixelBars count={8} className="pixbars-cta" />
          </div>
        </section>
      </main>

      <Footer />

      {participateOpen && <ParticipateModal slug={firstSlug} onClose={() => setParticipateOpen(false)} />}
    </div>
  );
}
