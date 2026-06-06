'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChallengeView } from '@/lib/ui-types';
import { fmtUsd, FEE } from '@/lib/ui-types';
import { PoolValue, FeeSplit } from './Primitives';

const PAYTO = process.env.NEXT_PUBLIC_PAYTO_ADDRESS;
const ESCROW = PAYTO || '0xb8e0cCc76d8C9200427Fa4271df9d191082C841D';

function Sparkline() {
  const pts = [60, 58, 62, 61, 66, 64, 70, 72, 71, 78, 80, 84, 83, 90, 96, 100];
  const w = 320;
  const h = 34;
  const max = Math.max(...pts);
  const min = Math.min(...pts);
  const path = pts
    .map((v, i) => {
      const x = (i / (pts.length - 1)) * w;
      const y = h - ((v - min) / (max - min)) * (h - 4) - 2;
      return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1);
    })
    .join(' ');
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <path d={path} fill="none" stroke="var(--gold)" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      <path d={path + ` L${w} ${h} L0 ${h} Z`} fill="var(--gold)" opacity="0.07" />
    </svg>
  );
}

export default function PrizePoolCard({ c }: { c: ChallengeView }) {
  const [flashKey, setFlashKey] = useState(0);
  const prev = useRef(c.pool);

  useEffect(() => {
    if (c.pool > prev.current) {
      setFlashKey((k) => k + 1);
    }
    prev.current = c.pool;
  }, [c.pool]);

  const delta = c.pool > prev.current ? `+${(c.pool - prev.current).toFixed(2)} ↑` : `+${(c.entryFeeUsd * FEE.pool).toFixed(3)} ↑`;

  return (
    <div className="card rail-card poolcard">
      <span className="rail-label">Prize pool</span>
      <div className="pool-top">
        <PoolValue amount={c.pool} flashKey={flashKey} className="money money-xl" />
        <span className="pool-delta">{delta}</span>
      </div>
      <Sparkline />
      <FeeSplit king={Math.round(FEE.king * 100)} pool={Math.round(FEE.pool * 100)} plat={Math.round(FEE.platform * 100)} fee={c.entryFeeUsd} />
      <a
        className="basescan"
        href={`https://sepolia.basescan.org/address/${ESCROW}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        view escrow on Basescan ↗
      </a>
    </div>
  );
}
