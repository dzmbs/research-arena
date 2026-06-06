// Sketch-style inline SVG thumbnails (designer system): blue stroke on a
// cool diagonal-stripe field, mapped per challenge.

const CURVES: Record<string, string> = {
  amm: 'M6 56 C18 18, 30 14, 58 12',
  prop: 'M6 54 C22 22, 34 18, 58 14',
  pred: 'M6 40 H20 V26 H34 V40 H48 V20 H58',
  pen: 'M14 50 L46 16',
  negot: 'M16 32 a14 8 0 1 0 28 0 a14 8 0 1 0 -28 0',
  mono: 'M14 18 H50 V50 H14 Z M14 34 H50 M32 18 V50',
  poker: 'M20 16 h18 v32 h-18 z M26 22 l6 12 -6 8',
  prime: 'M12 50 L20 20 L28 50 M34 20 V50 M42 20 h10 M42 35 h8 M42 50 h10',
  convex: 'M6 54 C20 30, 40 26, 58 50',
};

function kindForSlug(slug: string, category: string): string {
  if (slug.includes('prediction')) return 'pred';
  if (slug.includes('prop')) return 'prop';
  if (slug.includes('amm')) return 'amm';
  if (slug.includes('persuasion') || slug.includes('pen')) return 'pen';
  if (slug.includes('negoti')) return 'negot';
  if (slug.includes('poker')) return 'poker';
  if (slug.includes('prime') || slug.includes('sieve')) return 'prime';
  if (slug.includes('convex') || slug.includes('rout')) return 'convex';
  const byCat: Record<string, string> = {
    Trading: 'amm',
    Language: 'pen',
    Gaming: 'poker',
    Math: 'prime',
  };
  return byCat[category] ?? 'amm';
}

export function Thumb({ slug, category }: { slug: string; category: string }) {
  const kind = kindForSlug(slug, category);
  const d = CURVES[kind] || CURVES.amm;
  const pid = `stripe-${slug}`;
  return (
    <svg className="crow-thumb" width="64" height="64" viewBox="0 0 64 64" aria-hidden>
      <defs>
        <pattern id={pid} width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill="#F6F8FC" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="#E9EBF0" strokeWidth="3" />
        </pattern>
      </defs>
      <rect width="64" height="64" fill={`url(#${pid})`} />
      <path
        d={d}
        stroke="#0052FF"
        strokeWidth="1.6"
        fill="none"
        opacity="0.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
