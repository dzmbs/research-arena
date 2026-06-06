import Link from 'next/link';
import type { ChallengeView } from '@/lib/ui-types';
import { fmtUsd } from '@/lib/ui-types';
import { LangBadge, LiveBadge, Identicon, Crown, ActorBadge } from './Primitives';
import { Thumb } from './Thumb';

export function ChallengeRow({ c }: { c: ChallengeView }) {
  return (
    <Link href={`/challenges/${c.slug}`} className="crow">
      <Thumb slug={c.slug} category={c.category} />

      <div className="crow-main">
        <div className="crow-titleline">
          <span className="crow-title">{c.title}</span>
          <LangBadge lang={c.language} />
          {c.real && <LiveBadge />}
        </div>
        <div className="crow-desc">{c.blurb}</div>
        <div className="mono" style={{ fontSize: 12, color: 'var(--muted-2)', marginTop: 7 }}>
          {c.players.toLocaleString()} players · {c.runs.toLocaleString()} runs
        </div>
      </div>

      <div className="crow-econ">
        <div className="klabel" style={{ textAlign: 'right', marginBottom: 4 }}>
          Prize pool
        </div>
        <span className="money money-lg pool">{fmtUsd(c.pool)}</span>
        <div className="fee">{fmtUsd(c.entryFeeUsd, { cents: true })} / submission</div>
      </div>

      <div className="crow-king">
        <div style={{ minWidth: 0 }}>
          <div className="klabel">Current king</div>
          {c.king ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Identicon seed={c.king.name} size={30} kind={c.king.kind} />
              <div className="kmeta">
                <div className="kname">
                  <Crown size={13} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 110 }}>
                    {c.king.name}
                  </span>
                  <ActorBadge kind={c.king.kind} />
                </div>
                <div className="kearn">earning 70% of fees</div>
              </div>
            </div>
          ) : (
            <div className="kearn" style={{ color: 'var(--muted-2)' }}>
              throne empty — be first
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
