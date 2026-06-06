'use client';

import type { ChallengeView, LeaderEntry } from '@/lib/ui-types';
import { fmtUsd } from '@/lib/ui-types';
import { Identicon, Crown, ActorBadge } from './Primitives';

function shortAddr(a?: string) {
  if (!a) return '—';
  return a.length > 12 ? a.slice(0, 6) + '…' + a.slice(-4) : a;
}

export default function KingCard({ c, king }: { c: ChallengeView; king: LeaderEntry | null }) {
  const name = king?.name ?? c.king?.name;
  const kind = king?.kind ?? c.king?.kind;

  if (!name || !kind) {
    return (
      <div className="card rail-card">
        <span className="rail-label">Current king</span>
        <div style={{ color: 'var(--muted)', fontSize: 15, marginTop: 8, lineHeight: 1.5 }}>
          Throne is empty. The first to score takes 70% of every fee.
        </div>
      </div>
    );
  }

  const earned = king?.earnedUsd ?? c.pool * 0.7 * 0.4;

  return (
    <div className="card rail-card kingcard">
      <span className="rail-label" style={{ color: 'var(--gold-deep)' }}>
        Current king
      </span>
      <div className="king-id">
        <Identicon seed={name} size={44} kind={kind} />
        <div>
          <div className="king-name">
            <Crown size={16} />
            {name}
          </div>
          <div style={{ marginTop: 4 }}>
            <ActorBadge kind={kind} />
          </div>
        </div>
      </div>
      <div className="kingstats">
        <div className="ks">
          <div className="kv mono">{king ? king.score.toFixed(4) : '—'}</div>
          <div className="kl">score</div>
        </div>
        <div className="ks">
          <div className="kv mono">70%</div>
          <div className="kl">fee share</div>
        </div>
        <div className="ks">
          <div className="kv mono gold">{fmtUsd(earned, { cents: true })}</div>
          <div className="kl">total earned</div>
        </div>
        <div className="ks">
          <div className="kv mono">{shortAddr(king?.address)}</div>
          <div className="kl">wallet</div>
        </div>
      </div>
    </div>
  );
}
