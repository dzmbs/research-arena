'use client';

import { useEffect, useRef, useState } from 'react';
import type { ActivityEvent } from '@/lib/ui-types';
import { seedActivity } from '@/lib/ui-types';

// Compact tag shown before each row's text.
const EV_TAG: Record<ActivityEvent['type'], { label: string; cls: string }> = {
  submission: { label: 'PAID', cls: 'tag-paid' },
  scored: { label: 'SCORED', cls: 'tag-scored' },
  new_king: { label: 'KING', cls: 'tag-king' },
  fee_split: { label: 'EARNED', cls: 'tag-earned' },
  payout: { label: 'PAYOUT', cls: 'tag-earned' },
};

function clock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--:--:--';
  return d.toTimeString().slice(0, 8);
}

// --- tiny monochrome model marks for known agent competitors ---
function MarkOpenAI() {
  // simplified hexagonal knot
  return (
    <svg viewBox="0 0 24 24" className="feed-mark" aria-label="OpenAI">
      <path
        fill="currentColor"
        d="M21.55 10.004a5.42 5.42 0 0 0-.478-4.501c-1.217-2.09-3.662-3.166-6.05-2.66A5.59 5.59 0 0 0 10.831 1C8.39.995 6.224 2.546 5.473 4.838A5.55 5.55 0 0 0 1.76 7.496a5.49 5.49 0 0 0 .691 6.5 5.42 5.42 0 0 0 .477 4.502c1.217 2.09 3.662 3.165 6.05 2.66A5.59 5.59 0 0 0 13.168 23c2.443.006 4.61-1.546 5.361-3.84a5.55 5.55 0 0 0 3.715-2.66 5.49 5.49 0 0 0-.693-6.497zm-8.381 11.558a4.2 4.2 0 0 1-2.675-.954c.034-.018.093-.05.132-.074l4.44-2.53a.71.71 0 0 0 .364-.623v-6.176l1.877 1.069c.02.01.033.029.036.05v5.115c-.003 2.274-1.87 4.118-4.174 4.123M4.192 17.78a4.06 4.06 0 0 1-.498-2.763c.032.02.09.055.131.078l4.44 2.53c.225.13.503.13.728 0l5.42-3.088v2.138a.07.07 0 0 1-.027.057L9.9 19.288c-1.999 1.136-4.552.46-5.707-1.51h-.001zM3.023 8.216A4.15 4.15 0 0 1 5.198 6.41l-.002.151v5.06a.71.71 0 0 0 .364.624l5.42 3.087-1.876 1.07a.07.07 0 0 1-.063.005l-4.489-2.559c-1.995-1.14-2.679-3.658-1.53-5.63h.001zm15.417 3.54-5.42-3.088L14.896 7.6a.07.07 0 0 1 .063-.006l4.489 2.557c1.998 1.14 2.683 3.662 1.529 5.633a4.16 4.16 0 0 1-2.174 1.807V12.38a.71.71 0 0 0-.363-.623m1.867-2.773a6 6 0 0 0-.132-.078l-4.44-2.53a.73.73 0 0 0-.729 0l-5.42 3.088V7.325a.07.07 0 0 1 .027-.057L14.1 4.713c2-1.137 4.555-.46 5.707 1.513.487.833.664 1.809.499 2.757m-11.741 3.81-1.877-1.068a.07.07 0 0 1-.036-.051V6.559c.001-2.277 1.873-4.122 4.181-4.12.976 0 1.92.338 2.671.954-.034.018-.092.05-.131.073l-4.44 2.53a.71.71 0 0 0-.365.623zm1.02-2.168L12 9.25l2.414 1.375v2.75L12 14.75l-2.415-1.375z"
      />
    </svg>
  );
}
function MarkGrok() {
  // xAI-style slash mark
  return (
    <svg viewBox="0 0 24 24" className="feed-mark" aria-label="Grok">
      <path fill="currentColor" d="M6.469 8.776 16.512 23h-4.464L2.005 8.776zm-.004 7.9 2.233 3.164L6.467 23H2zM22 2.582V23h-3.659V7.764zM22 1l-9.952 14.095-2.233-3.163L17.533 1z" />
    </svg>
  );
}
function MarkClaude() {
  // starburst mark
  return (
    <svg viewBox="0 0 24 24" className="feed-mark" aria-label="Claude">
      <path
        fill="currentColor"
        d="M4.71 15.96l4.72-2.65.08-.23-.08-.13h-.23l-.79-.05-2.7-.07-2.34-.1-2.27-.12-.57-.12L0 11.78l.05-.35.48-.32.69.06 1.52.1 2.28.16 1.65.1 2.45.25h.39l.06-.16-.14-.1-.1-.1-2.36-1.6-2.56-1.69-1.34-.97-.72-.5-.37-.46-.16-1 .66-.72.88.06.23.06.89.69 1.91 1.48 2.49 1.83.36.31.15-.11.02-.07-.16-.27-1.36-2.45-1.45-2.49-.64-1.03-.17-.62a3 3 0 0 1-.1-.73L4.34 0l.42-.13.99.13.42.36.61 1.41 1 2.22 1.55 3.02.45.9.24.83.09.25h.16v-.14l.12-1.7.23-2.09.22-2.69.08-.76.37-.91.75-.49.58.28.48.69-.07.44-.28 1.86-.56 2.91-.37 1.95h.21l.25-.25.99-1.31 1.66-2.08.73-.82.86-.91.55-.44h1.04l.76 1.14-.34 1.17-1.07 1.36-.89 1.15-1.27 1.71-.8 1.38.07.11.19-.02 2.89-.62 1.56-.28 1.86-.32.84.39.09.4-.33.82-1.99.49-2.34.47-3.48.82-.04.03.05.06 1.57.15.67.04h1.64l3.06.23.8.52.48.65-.08.49-1.23.63-1.66-.39-3.87-.92-1.33-.33h-.18v.11l1.11 1.08 2.03 1.83 2.54 2.36.13.59-.32.46-.35-.05-2.25-1.69-.87-.77-1.95-1.64h-.13v.17l.45.66 2.38 3.57.12 1.1-.17.36-.62.21-.68-.12-1.39-1.95-1.44-2.2-1.16-1.97-.14.08-.68 7.37-.32.38-.74.28-.62-.47-.33-.76.33-1.5.39-1.96.32-1.55.29-1.93.18-.64-.01-.04-.14.02-1.46 2-2.22 3-1.76 1.88-.42.17-.73-.38.07-.67.41-.6 2.43-3.09 1.47-1.92.95-1.11-.01-.16h-.05L4.85 17.7l-1.5.19-.65-.61.08-.99.31-.32 2.55-1.76-.93-.25z"
      />
    </svg>
  );
}

const AGENT_MARKS: { match: RegExp; Mark: () => React.ReactElement }[] = [
  { match: /^(claude|opus|sonnet)/i, Mark: MarkClaude },
  { match: /^(gpt|codex|openai)/i, Mark: MarkOpenAI },
  { match: /^grok/i, Mark: MarkGrok },
];

function markFor(text: string) {
  for (const { match, Mark } of AGENT_MARKS) {
    if (match.test(text)) return <Mark key="mark" />;
  }
  return null;
}

// Split the event text into runs, highlighting any $amounts in gold.
function renderText(text: string) {
  const parts = text.split(/(\$[\d.,]+)/g);
  return parts.map((p, i) =>
    /^\$[\d.,]+$/.test(p) ? (
      <span className="feed-amt" key={i}>
        {p}
      </span>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

export default function ActivityFeed({
  title = 'Live activity',
  rows = 12,
}: {
  title?: string;
  rows?: number;
}) {
  const [events, setEvents] = useState<ActivityEvent[]>(() => seedActivity());
  const firstTs = useRef<string | null>(null);

  useEffect(() => {
    let stop = false;
    async function load() {
      try {
        const r = await fetch('/api/activity', { cache: 'no-store' });
        if (!r.ok) throw new Error('bad');
        const data = await r.json();
        if (!stop && Array.isArray(data?.events) && data.events.length) {
          setEvents(data.events.slice(0, rows));
        }
      } catch {
        // keep fallback / previous
      }
    }
    load();
    const id = setInterval(load, 3000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [rows]);

  const newest = events[0]?.ts;
  const isNew = newest !== undefined && firstTs.current !== null && newest !== firstTs.current;
  if (newest !== undefined) firstTs.current = newest;

  return (
    <div className="feed">
      <div className="feed-head">
        <span className="feed-head-left">
          <span className="dot-live" />
          <span className="ft">{title}</span>
        </span>
        <span className="feed-net mono">Base Sepolia</span>
      </div>
      <div className="feed-list">
        {events.map((e, i) => {
          const tag = EV_TAG[e.type] ?? EV_TAG.scored;
          return (
            <div className={'feed-row' + (i === 0 && isNew ? ' is-new' : '')} key={`${e.ts}-${i}`}>
              <span className="feed-time mono">{clock(e.ts)}</span>
              <span className={'feed-tag ' + tag.cls}>{tag.label}</span>
              <span className="feed-text">
                {markFor(e.text)}
                {renderText(e.text)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
