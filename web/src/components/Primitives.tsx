'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import type { Kind } from '@/lib/ui-types';

/* ---- deterministic identicon (symmetric 5x5) ---- */
export function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function Identicon({
  seed = 'x',
  size = 32,
  kind = 'HUMAN',
}: {
  seed?: string;
  size?: number;
  kind?: Kind;
}) {
  const h = hashStr(seed);
  const hue = kind === 'AGENT' ? 218 + (h % 18) : 210 + (h % 40);
  const sat = kind === 'AGENT' ? 92 : 14 + (h % 16);
  const light = kind === 'AGENT' ? 52 : 30 + (h % 14);
  const fg = `hsl(${hue} ${sat}% ${light}%)`;
  const bg = kind === 'AGENT' ? '#EAF0FF' : '#F1F2F5';
  const cells: React.ReactNode[] = [];
  const n = 5;
  const cell = size / n;
  for (let x = 0; x < Math.ceil(n / 2); x++) {
    for (let y = 0; y < n; y++) {
      const on = (h >> (x * 5 + y)) & 1;
      if (on) {
        cells.push(
          <rect key={`${x}-${y}`} x={x * cell} y={y * cell} width={cell} height={cell} fill={fg} />
        );
        if (x !== n - 1 - x)
          cells.push(
            <rect key={`m${x}-${y}`} x={(n - 1 - x) * cell} y={y * cell} width={cell} height={cell} fill={fg} />
          );
      }
    }
  }
  return (
    <svg
      className="identicon"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ background: bg }}
    >
      {cells}
    </svg>
  );
}

/* ---- crown ---- */
export function Crown({ size = 16, color }: { size?: number; color?: string }) {
  return (
    <svg
      className="crown"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={color ? { color } : undefined}
    >
      <path d="M3 7l3.5 3L12 4l5.5 6L21 7l-1.6 11H4.6L3 7z" fill="currentColor" />
      <rect x="4.6" y="18.2" width="14.8" height="2" rx="1" fill="currentColor" />
    </svg>
  );
}

/* ---- badges ---- */
export function LangBadge({ lang }: { lang: string }) {
  return <span className="badge lang">{lang}</span>;
}

export function ActorBadge({ kind }: { kind: Kind }) {
  if (kind === 'AGENT')
    return (
      <span className="badge agent">
        <span className="chip-agent" />
        AGENT
      </span>
    );
  return <span className="badge human">HUMAN</span>;
}

export function LiveBadge() {
  return (
    <span className="badge live">
      <span className="dot-live" style={{ width: 6, height: 6 }} />
      LIVE
    </span>
  );
}

/* ---- count-up money value with gold flash ---- */
export function useCountUp(target: number) {
  const [val, setVal] = useState(target);
  const raf = useRef<number | null>(null);
  const valRef = useRef(target);
  valRef.current = val;
  useEffect(() => {
    const from = valRef.current;
    const to = target;
    if (from === to) return;
    const start = performance.now();
    const dur = 600;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      setVal(from + (to - from) * e);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return val;
}

export function PoolValue({
  amount,
  flashKey,
  className = 'money money-xl',
}: {
  amount: number;
  flashKey?: number;
  className?: string;
}) {
  const v = useCountUp(amount);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (flashKey === undefined) return;
    const el = ref.current;
    if (!el) return;
    el.classList.remove('flash-gold');
    void el.offsetWidth;
    el.classList.add('flash-gold');
  }, [flashKey]);
  return (
    <span ref={ref} className={className}>
      ${v.toFixed(2)}
    </span>
  );
}

/* ---- fee split bar ---- */
export function FeeSplit({
  king = 70,
  pool = 20,
  plat = 10,
  fee = 0.25,
}: {
  king?: number;
  pool?: number;
  plat?: number;
  fee?: number;
}) {
  const usd = (pct: number) => '$' + ((fee * pct) / 100).toFixed(3);
  return (
    <div className="feesplit">
      <div className="fs-bar">
        <div className="fs-seg fs-king" style={{ flexBasis: king + '%' }} />
        <div className="fs-seg fs-pool" style={{ flexBasis: pool + '%' }} />
        <div className="fs-seg fs-plat" style={{ flexBasis: plat + '%' }} />
      </div>
      <div className="fs-legend">
        <div className="fs-row">
          <span className="sw" style={{ background: 'var(--gold)' }} />
          <span className="fl">Current king</span>
          <span className="fv">{usd(king)}</span>
          <span className="fpct">{king}%</span>
        </div>
        <div className="fs-row">
          <span className="sw" style={{ background: 'var(--blue)' }} />
          <span className="fl">Prize pool</span>
          <span className="fv">{usd(pool)}</span>
          <span className="fpct">{pool}%</span>
        </div>
        <div className="fs-row">
          <span className="sw" style={{ background: 'var(--line-2)' }} />
          <span className="fl">Platform</span>
          <span className="fv">{usd(plat)}</span>
          <span className="fpct">{plat}%</span>
        </div>
      </div>
    </div>
  );
}

/* ---- real logos ---- */
export function LogoBaseSquare({ size = 16 }: { size?: number }) {
  return <Image src="/logos/base-square.svg" alt="Base" width={size} height={size} className="logo-img" />;
}
export function LogoBaseLockup({ height = 22 }: { height?: number }) {
  return (
    <Image
      src="/logos/base-lockup.svg"
      alt="Base"
      width={Math.round((height * 1280) / 323.84)}
      height={height}
      className="logo-img"
    />
  );
}
export function LogoPrivySymbol({ size = 22 }: { size?: number }) {
  return (
    <Image
      src="/logos/privy-symbol.svg"
      alt="Privy"
      width={Math.round((size * 120) / 156)}
      height={size}
      className="logo-img"
    />
  );
}
export function LogoPrivyWordmark({ height = 20 }: { height?: number }) {
  return (
    <Image
      src="/logos/privy-wordmark.svg"
      alt="Privy"
      width={Math.round((height * 258) / 78)}
      height={height}
      className="logo-img"
      // the wordmark's glyphs sit high in its viewBox — nudge to optical center
      style={{ transform: 'translateY(2px)' }}
    />
  );
}
export function LogoX402({ height = 20, onDark = false }: { height?: number; onDark?: boolean }) {
  // official x402 wordmark: light variant (black) for light surfaces, dark variant (white) for navy/dark
  return (
    <Image
      src={onDark ? '/logos/x402-dark.svg' : '/logos/x402-light.svg'}
      alt="x402"
      width={Math.round((height * 130) / 49)}
      height={height}
      className="logo-img"
    />
  );
}
export function LogoUSDC({ size = 16 }: { size?: number }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        background: 'var(--blue)',
        color: '#fff',
        fontSize: size * 0.62,
        fontWeight: 700,
        borderRadius: 999,
        display: 'inline-grid',
        placeItems: 'center',
        flex: 'none',
        lineHeight: 1,
      }}
    >
      $
    </span>
  );
}
