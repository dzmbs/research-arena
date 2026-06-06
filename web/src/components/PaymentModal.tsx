'use client';

import type { ChallengeView, SubmissionStatus } from '@/lib/ui-types';
import { fmtUsd, FEE } from '@/lib/ui-types';
import { LogoUSDC, LogoX402, LogoBaseSquare } from './Primitives';

export type PayPhase = 'paying' | 'settled' | 'running' | 'scored' | 'error';

// Maps the REAL submission flow onto the designer's payment visuals.
// - "paying": x402 fetch in flight (proc-log animates)
// - "settled": response arrived (payment confirmed; tx hash if present)
// - "running": worker scoring (queued/running)
// - "scored": final rank reveal
export default function PaymentModal({
  c,
  phase,
  txHash,
  result,
  errMsg,
  paywarn,
  onClose,
}: {
  c: ChallengeView;
  phase: PayPhase;
  txHash?: string;
  result?: SubmissionStatus | null;
  errMsg?: string;
  paywarn?: boolean;
  onClose: () => void;
}) {
  const feeStr = fmtUsd(c.entryFeeUsd, { cents: true });
  const settledOrLater = phase === 'settled' || phase === 'running' || phase === 'scored';
  const closable = phase === 'scored' || phase === 'error';

  const title =
    phase === 'paying'
      ? 'Processing payment'
      : phase === 'settled'
        ? 'Payment confirmed'
        : phase === 'running'
          ? 'Running simulation'
          : phase === 'scored'
            ? 'Scored'
            : 'Submission failed';

  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && closable) onClose();
      }}
    >
      <div className="modal">
        <div className="modal-head">
          <h3>{title}</h3>
          {closable && (
            <button className="modal-x" onClick={onClose} aria-label="close">
              ×
            </button>
          )}
        </div>

        {/* PAYING / SETTLED — proc-log */}
        {(phase === 'paying' || phase === 'settled') && (
          <div className="modal-body">
            <div className="proc">
              <div style={{ margin: '8px 0 18px' }}>
                {phase === 'paying' ? (
                  <span className="spinner blue" style={{ width: 26, height: 26 }} />
                ) : (
                  <div className="success-icon" style={{ margin: '0 auto 6px' }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
            <div className="proc-log">
              <div className="ln" style={{ animationDelay: '0s' }}>
                <span className="mk run">›</span>
                <span>
                  POST /challenges/{c.slug}/submit → <span className="h402">HTTP 402 Payment Required</span>
                </span>
              </div>
              <div className="ln" style={{ animationDelay: '.4s' }}>
                <span className="mk run">›</span>
                <span>
                  X-PAYMENT signed (EIP-3009) · {feeStr} USDC
                </span>
              </div>
              <div className="ln" style={{ animationDelay: '.8s' }}>
                <span className="mk run">›</span>
                <span>broadcasting on Base Sepolia…</span>
              </div>
              {settledOrLater ? (
                <div className="ln" style={{ animationDelay: '1s' }}>
                  <span className="mk ok">✓</span>
                  <span>
                    <span className="ok">settled on Base Sepolia</span>
                    {txHash && (
                      <>
                        {' · '}
                        <a className="lnk" href={`https://sepolia.basescan.org/tx/${txHash}`} target="_blank" rel="noopener noreferrer">
                          {txHash.slice(0, 10)}… ↗
                        </a>
                      </>
                    )}
                  </span>
                </div>
              ) : (
                <div className="ln pend" style={{ animationDelay: '1.2s' }}>
                  <span className="mk run">›</span>
                  <span>awaiting settlement…</span>
                </div>
              )}
            </div>

            {phase === 'settled' && (
              <div className="x402-note">
                <div>
                  fee splits {Math.round(FEE.king * 100)}% king · {Math.round(FEE.pool * 100)}% pool ·{' '}
                  {Math.round(FEE.platform * 100)}% platform
                </div>
                <div>
                  <span className="ok">✓</span> submission queued
                </div>
              </div>
            )}
          </div>
        )}

        {/* RUNNING */}
        {phase === 'running' && (
          <div className="modal-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 6 }}>
              <span className="spinner blue" />
              <span style={{ fontWeight: 600 }}>Running simulations…</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: '72%' }} />
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--muted)',
              }}
            >
              <span>randomized parameters</span>
              <span>scoring…</span>
            </div>
          </div>
        )}

        {/* SCORED */}
        {phase === 'scored' && result && (
          <>
            <div className="modal-body">
              <div className="rank-reveal">
                <div className="rr-num">
                  {result.rank != null ? `#${result.rank}` : '✓'} <span className="arrow">↑</span>
                </div>
                <div className="rr-l">
                  scored{' '}
                  <span className="mono" style={{ color: 'var(--green)' }}>
                    {result.score?.toFixed(4)}
                  </span>
                  {result.total ? ` · of ${result.total} players` : ''}
                </div>
              </div>
              <div className="kv-list" style={{ marginTop: 8 }}>
                <div className="kv-item">
                  <span className="kvl">Your rank</span>
                  <span className="kvv">
                    {result.rank != null ? `#${result.rank}` : '—'}
                    {result.total ? ` of ${result.total}` : ''}
                  </span>
                </div>
                <div className="kv-item">
                  <span className="kvl">Score</span>
                  <span className="kvv">{result.score?.toFixed(4)}</span>
                </div>
              </div>
              <div
                className="x402-note"
                style={{ background: 'var(--gold-050)', borderColor: 'var(--gold-line)', color: 'var(--gold-deep)' }}
              >
                {result.rank === 1
                  ? 'You are the king — 70% of every incoming submission fee now streams to you, per x402 payment.'
                  : 'Reach #1 and 70% of every incoming submission fee streams to you — automatically, per x402 payment.'}
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-primary btn-block" onClick={onClose}>
                Done
              </button>
            </div>
          </>
        )}

        {/* ERROR */}
        {phase === 'error' && (
          <>
            <div className="modal-body">
              <div className="success-icon" style={{ background: '#FBEEEC', color: 'var(--red)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                </svg>
              </div>
              <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>{errMsg || 'Something went wrong.'}</div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost btn-block" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        )}

        {/* footer meta on paying/settled */}
        {(phase === 'paying' || phase === 'settled') && (
          <div className="modal-foot" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--muted)', fontSize: 12.5 }}>
            <LogoUSDC size={14} />
            <span>{feeStr} USDC</span>
            <span>·</span>
            <LogoBaseSquare size={14} />
            <span>Base Sepolia</span>
            <span>·</span>
            <LogoX402 height={13} />
          </div>
        )}

        {paywarn && phase === 'settled' && (
          <div style={{ padding: '0 24px 16px', textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>
            demo mode — no live payment required
          </div>
        )}
      </div>
    </div>
  );
}
