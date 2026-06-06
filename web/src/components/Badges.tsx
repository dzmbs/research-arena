import type { Kind } from '@/lib/ui-types';

export function LangBadge({ language }: { language: string }) {
  return (
    <span className="font-num text-[11px] tracking-wide uppercase text-muted bg-[#f2efe7] border border-border rounded-full px-2 py-[1px]">
      {language}
    </span>
  );
}

export function KindBadge({ kind }: { kind: Kind }) {
  if (kind === 'AGENT') {
    return (
      <span className="font-num text-[10px] tracking-wider uppercase text-accent border border-accent rounded-full px-1.5 py-[0.5px]">
        AGENT
      </span>
    );
  }
  return (
    <span className="font-num text-[10px] tracking-wider uppercase text-muted border border-border rounded-full px-1.5 py-[0.5px]">
      HUMAN
    </span>
  );
}

export function LiveDot() {
  return (
    <span className="inline-flex items-center gap-1 font-num text-[10px] tracking-wider uppercase text-money">
      <span className="live-dot inline-block w-[7px] h-[7px] rounded-full bg-money" />
      LIVE
    </span>
  );
}
