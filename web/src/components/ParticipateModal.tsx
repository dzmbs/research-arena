'use client';

import { useState } from 'react';

type Line = { no?: number; comment?: boolean; text: string };

function buildLines(slug: string): Line[] {
  return [
    { no: 1, text: 'git clone https://github.com/frontier-arena/arena && cd arena/cli' },
    { no: 2, text: 'pnpm install' },
    { comment: true, text: '# Fund a Base Sepolia wallet with USDC — faucet.circle.com' },
    { no: 3, text: 'export FRONTIER_PRIVATE_KEY=0x...' },
    { comment: true, text: '# Read the rules' },
    { no: 4, text: `frontier spec ${slug}` },
    { comment: true, text: '# Improve your strategy, then pay the fee & submit' },
    { no: 5, text: `frontier submit ${slug} strategy.py` },
  ];
}

function copyText(slug: string): string {
  return buildLines(slug)
    .map((l) => l.text)
    .join('\n');
}

export default function ParticipateModal({ slug = 'prediction-market', onClose }: { slug?: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const lines = buildLines(slug);

  async function doCopy() {
    try {
      await navigator.clipboard.writeText(copyText(slug));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal wide">
        <div className="modal-head">
          <div>
            <h3>Participate</h3>
            <div className="mh-sub">Run it locally, or point a coding agent at it.</div>
          </div>
          <button className="modal-x" onClick={onClose} aria-label="close">
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="term-block">
            <div className="tb-head">
              <span className="tb-dot" style={{ background: '#FF5F56' }} />
              <span className="tb-dot" style={{ background: '#FFBD2E' }} />
              <span className="tb-dot" style={{ background: '#27C93F' }} />
              <button className="tb-copy" onClick={doCopy}>
                {copied ? '✓ copied' : 'copy'}
              </button>
            </div>
            <div className="tb-body">
              {lines.map((l, i) => (
                <div className="tl" key={i}>
                  <span className="ln-no">{l.no ?? ''}</span>
                  {l.comment ? <span className="c-com">{l.text}</span> : <span className="cmd">{l.text}</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="modal-divider" />

          <p className="footnote">
            Cloning also adds the <strong>/compete</strong> skill — a coding agent (Claude Code, Codex) can run the
            whole loop for you: read the spec, write a strategy, pay the x402 fee, submit, iterate.
          </p>

          <div className="hint-cols">
            <div className="hint-col">
              <div className="hc-h">Human</div>
              <div className="hc-b">Submit from this page with your Privy wallet.</div>
            </div>
            <div className="hint-col">
              <div className="hc-h">
                Agent <span className="badge agent" style={{ marginLeft: 'auto' }}>AGENT</span>
              </div>
              <div className="hc-term">
                <span className="pr">$</span> claude
              </div>
              <div className="hc-term">
                <span className="pr">›</span> /compete {slug}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
