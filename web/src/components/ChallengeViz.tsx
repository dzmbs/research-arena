// Sketch-style hero visualizations for challenge detail pages.
// Light/airy, ink axes + blue accents, mono annotation labels.
// Deterministic (seeded by slug); no randomness at render.

import { hashStr } from './Primitives';

const INK = '#1B1F27';
const FAINT = '#DDE0E8';
const BLUE = '#0052FF';
const MUTED = '#8A909C';

function Grid({ w, h }: { w: number; h: number }) {
  const lines: React.ReactNode[] = [];
  for (let x = 60; x < w - 10; x += 70) {
    lines.push(<line key={`v${x}`} x1={x} y1={20} x2={x} y2={h - 40} stroke={FAINT} strokeWidth={1} />);
  }
  for (let y = 40; y < h - 40; y += 60) {
    lines.push(<line key={`h${y}`} x1={60} y1={y} x2={w - 20} y2={y} stroke={FAINT} strokeWidth={1} />);
  }
  return <g opacity={0.7}>{lines}</g>;
}

function Axes({ w, h }: { w: number; h: number }) {
  return (
    <g>
      <line x1={60} y1={20} x2={60} y2={h - 40} stroke={INK} strokeWidth={1.4} strokeLinecap="round" />
      <line x1={60} y1={h - 40} x2={w - 20} y2={h - 40} stroke={INK} strokeWidth={1.4} strokeLinecap="round" />
    </g>
  );
}

/* binary prediction market: step-function probability path around dashed 50% */
function PredictionViz({ w, h }: { w: number; h: number }) {
  const x0 = 60;
  const x1 = w - 20;
  const mid = (h - 40 + 20) / 2;
  const steps = [0.5, 0.62, 0.55, 0.7, 0.66, 0.78, 0.72, 0.85, 0.8, 0.9];
  const yFor = (p: number) => h - 40 - p * (h - 60);
  let d = '';
  const seg = (x1 - x0) / steps.length;
  steps.forEach((p, i) => {
    const xa = x0 + i * seg;
    const xb = x0 + (i + 1) * seg;
    const y = yFor(p);
    d += `${i === 0 ? 'M' : 'L'} ${xa.toFixed(1)} ${y.toFixed(1)} L ${xb.toFixed(1)} ${y.toFixed(1)} `;
  });
  return (
    <g>
      {/* faint blue band around 50% */}
      <rect x={x0} y={mid - 26} width={x1 - x0} height={52} fill={BLUE} opacity={0.05} />
      <line x1={x0} y1={mid} x2={x1} y2={mid} stroke={MUTED} strokeWidth={1.2} strokeDasharray="5 5" />
      <text x={x1 - 4} y={mid - 6} textAnchor="end" fontFamily="var(--font-mono)" fontSize={11} fill={MUTED}>
        p = 0.50
      </text>
      <path d={d.trim()} fill="none" stroke={BLUE} strokeWidth={2.1} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x1} cy={yFor(0.9)} r={3.4} fill={BLUE} />
      <text x={x0 + 6} y={36} fontFamily="var(--font-mono)" fontSize={12} fill={INK}>
        YES
      </text>
      <text x={x0 + 6} y={h - 48} fontFamily="var(--font-mono)" fontSize={12} fill={MUTED}>
        NO
      </text>
      <text x={x1} y={h - 18} textAnchor="end" fontFamily="var(--font-mono)" fontSize={11} fill={MUTED}>
        p(t) = Pr(Z_t &gt; 0)
      </text>
      <text x={50} y={28} textAnchor="end" fontFamily="var(--font-mono)" fontSize={10} fill={MUTED}>
        1.0
      </text>
      <text x={50} y={h - 40} textAnchor="end" fontFamily="var(--font-mono)" fontSize={10} fill={MUTED}>
        0.0
      </text>
      <text x={(x0 + x1) / 2} y={h - 14} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={10} fill={MUTED}>
        time →
      </text>
    </g>
  );
}

/* constant-product AMM bonding curve x·y=k */
function AmmViz({ w, h }: { w: number; h: number }) {
  const x0 = 60;
  const x1 = w - 20;
  const y0 = 20;
  const y1 = h - 40;
  const k = 1;
  const pts: [number, number][] = [];
  const n = 60;
  for (let i = 0; i <= n; i++) {
    const fx = 0.16 + (i / n) * 0.84; // normalized reserve x
    const fy = k / fx;
    pts.push([fx, fy]);
  }
  const maxY = k / 0.16;
  const sx = (fx: number) => x0 + ((fx - 0.16) / 0.84) * (x1 - x0);
  const sy = (fy: number) => y1 - (fy / maxY) * (y1 - y0);
  const d = pts.map(([fx, fy], i) => `${i === 0 ? 'M' : 'L'} ${sx(fx).toFixed(1)} ${sy(fy).toFixed(1)}`).join(' ');
  // reserve point
  const px = 0.45;
  const py = k / px;
  return (
    <g>
      <path d={d} fill="none" stroke={BLUE} strokeWidth={2.1} strokeLinejoin="round" strokeLinecap="round" />
      {/* reserve point + dropdowns */}
      <line x1={sx(px)} y1={sy(py)} x2={sx(px)} y2={y1} stroke={MUTED} strokeWidth={1} strokeDasharray="4 4" />
      <line x1={x0} y1={sy(py)} x2={sx(px)} y2={sy(py)} stroke={MUTED} strokeWidth={1} strokeDasharray="4 4" />
      <circle cx={sx(px)} cy={sy(py)} r={4} fill={BLUE} />
      {/* fee bracket */}
      <line x1={sx(px) + 12} y1={sy(py) - 4} x2={sx(px) + 12} y2={sy(py) - 30} stroke={INK} strokeWidth={1.2} />
      <line x1={sx(px) + 8} y1={sy(py) - 4} x2={sx(px) + 16} y2={sy(py) - 4} stroke={INK} strokeWidth={1.2} />
      <line x1={sx(px) + 8} y1={sy(py) - 30} x2={sx(px) + 16} y2={sy(py) - 30} stroke={INK} strokeWidth={1.2} />
      <text x={sx(px) + 20} y={sy(py) - 14} fontFamily="var(--font-mono)" fontSize={11} fill={INK}>
        fee
      </text>
      <text x={(x0 + x1) / 2 + 20} y={y0 + 18} fontFamily="var(--font-mono)" fontSize={12} fill={INK}>
        x · y = k
      </text>
      <text x={(x0 + x1) / 2} y={h - 14} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={11} fill={MUTED}>
        Reserve X →
      </text>
      <text
        x={20}
        y={(y0 + y1) / 2}
        fontFamily="var(--font-mono)"
        fontSize={11}
        fill={MUTED}
        transform={`rotate(-90 20 ${(y0 + y1) / 2})`}
        textAnchor="middle"
      >
        Reserve Y →
      </text>
    </g>
  );
}

/* generic curve variant, seeded by slug */
function GenericViz({ w, h, seed }: { w: number; h: number; seed: string }) {
  const x0 = 60;
  const x1 = w - 20;
  const y0 = 20;
  const y1 = h - 40;
  const r = hashStr(seed);
  const n = 7;
  const pts: [number, number][] = [];
  let cur = 0.3 + ((r % 30) / 100);
  for (let i = 0; i <= n; i++) {
    const x = x0 + (i / n) * (x1 - x0);
    const wig = (((r >> (i + 1)) & 0xff) / 255 - 0.4) * 0.32;
    cur = Math.max(0.08, Math.min(0.95, cur + wig + 0.06));
    const y = y1 - cur * (y1 - y0);
    pts.push([x, y]);
  }
  const d = pts
    .map(([x, y], i) => {
      if (i === 0) return `M ${x.toFixed(1)} ${y.toFixed(1)}`;
      const [px, py] = pts[i - 1];
      const cx = (px + x) / 2;
      return `C ${cx.toFixed(1)} ${py.toFixed(1)} ${cx.toFixed(1)} ${y.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <g>
      <path d={d} fill="none" stroke={BLUE} strokeWidth={2.1} strokeLinejoin="round" strokeLinecap="round" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={2.6} fill={BLUE} opacity={0.55} />
      ))}
      <text x={(x0 + x1) / 2} y={h - 14} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={11} fill={MUTED}>
        simulation index →
      </text>
      <text
        x={20}
        y={(y0 + y1) / 2}
        fontFamily="var(--font-mono)"
        fontSize={11}
        fill={MUTED}
        transform={`rotate(-90 20 ${(y0 + y1) / 2})`}
        textAnchor="middle"
      >
        score →
      </text>
    </g>
  );
}

const CAPTIONS: Record<string, string> = {
  'prediction-market': 'probability path of a binary market — manage limit orders to capture edge',
  'simple-amm': 'constant-product bonding curve — your fee strategy is scored against arbitrage + retail flow',
  'prop-amm': 'control the full swap function — bonding curve adapts to market conditions',
};

export function ChallengeViz({ slug }: { slug: string }) {
  const w = 680;
  const h = 300;
  let body: React.ReactNode;
  if (slug === 'prediction-market') body = <PredictionViz w={w} h={h} />;
  else if (slug === 'simple-amm' || slug === 'prop-amm') body = <AmmViz w={w} h={h} />;
  else body = <GenericViz w={w} h={h} seed={slug} />;

  const caption = CAPTIONS[slug] ?? 'scored over many randomized simulations — higher is better';

  return (
    <div className="viz-panel">
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${slug} visualization`}>
        <Grid w={w} h={h} />
        <Axes w={w} h={h} />
        {body}
      </svg>
      <div className="viz-cap">{caption}</div>
    </div>
  );
}
