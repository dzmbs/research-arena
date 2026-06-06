'use client';

import type { LeaderEntry } from '@/lib/ui-types';
import { fmtUsd, timeAgo } from '@/lib/ui-types';
import { Identicon, Crown, ActorBadge } from './Primitives';

function shortAddr(a?: string) {
  if (!a) return '—';
  return a.length > 12 ? a.slice(0, 6) + '…' + a.slice(-4) : a;
}

export default function Leaderboard({ entries }: { entries: LeaderEntry[] }) {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <table className="lb">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Wallet</th>
            <th className="num">Score</th>
            <th className="num">Earned</th>
            <th className="num">Submitted</th>
            <th className="num">Status</th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 && (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>
                No submissions yet — be the first to take the throne.
              </td>
            </tr>
          )}
          {entries.map((e) => {
            const isKing = e.rank === 1;
            return (
              <tr key={`${e.rank}-${e.name}`} className={isKing ? 'king-row' : ''}>
                <td className="lb-rank">#{e.rank}</td>
                <td>
                  <span className="lb-player">
                    <Identicon seed={e.name} size={28} kind={e.kind} />
                    <span className="lb-name">
                      {isKing && <Crown size={14} />}
                      {e.name}
                      <ActorBadge kind={e.kind} />
                    </span>
                  </span>
                </td>
                <td className="lb-wallet">{shortAddr(e.address)}</td>
                <td className="num score-pos">{e.score.toFixed(4)}</td>
                <td className="num lb-earn">{e.earnedUsd > 0 ? fmtUsd(e.earnedUsd, { cents: true }) : '—'}</td>
                <td className="num lb-time">{timeAgo(e.submittedAt)}</td>
                <td className="num">
                  {isKing ? (
                    <span className="badge king">
                      <Crown size={11} />
                      KING
                    </span>
                  ) : (
                    <span className="lb-time">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
