'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChallengeView, SubmissionStatus } from '@/lib/ui-types';
import { fmtUsd } from '@/lib/ui-types';
import { LogoUSDC, LogoX402 } from './Primitives';
import PaymentModal, { type PayPhase } from './PaymentModal';
import ParticipateModal from './ParticipateModal';

const HAS_PRIVY = !!process.env.NEXT_PUBLIC_PRIVY_APP_ID;

import {
  usePrivy as usePrivyRaw,
  useWallets as useWalletsRaw,
  useX402Fetch as useX402FetchRaw,
} from '@privy-io/react-auth';

// Best-effort decode of the x402 settlement header to surface a tx hash.
function txFromResponse(r: Response): string | undefined {
  try {
    const h = r.headers.get('x-payment-response');
    if (!h) return undefined;
    let json: unknown;
    try {
      json = JSON.parse(atob(h));
    } catch {
      json = JSON.parse(h);
    }
    const obj = json as Record<string, unknown>;
    const tx =
      (obj?.transaction as string) ||
      (obj?.txHash as string) ||
      ((obj?.payload as Record<string, unknown>)?.transaction as string);
    return typeof tx === 'string' ? tx : undefined;
  } catch {
    return undefined;
  }
}

export default function SubmitPanel({ c }: { c: ChallengeView }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [phase, setPhase] = useState<PayPhase>('paying');
  const [txHash, setTxHash] = useState<string | undefined>(undefined);
  const [result, setResult] = useState<SubmissionStatus | null>(null);
  const [errMsg, setErrMsg] = useState('');
  const [paywarn, setPaywarn] = useState(false);
  const [participateOpen, setParticipateOpen] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Privy state (hooks must be called unconditionally)
  let authenticated = false;
  let ready = true;
  let login: (() => void) | undefined;
  let walletAddress: string | undefined;
  let wrapFetchWithPayment:
    | ((o: { walletAddress?: string; fetch: typeof fetch; maxValue?: bigint }) => typeof fetch)
    | undefined;

  if (HAS_PRIVY) {
    /* eslint-disable react-hooks/rules-of-hooks */
    const privy = usePrivyRaw();
    const { wallets } = useWalletsRaw();
    const x402 = useX402FetchRaw();
    /* eslint-enable react-hooks/rules-of-hooks */
    authenticated = privy.authenticated;
    ready = privy.ready;
    login = privy.login;
    walletAddress = wallets?.[0]?.address;
    wrapFetchWithPayment = x402.wrapFetchWithPayment as typeof wrapFetchWithPayment;
  }

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function pollStatus(id: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/submissions/${id}`, { cache: 'no-store' });
        if (!r.ok) throw new Error('status fetch failed');
        const s: SubmissionStatus = await r.json();
        if (s.status === 'running' || s.status === 'queued') setPhase('running');
        else if (s.status === 'scored') {
          setResult(s);
          setPhase('scored');
          if (pollRef.current) clearInterval(pollRef.current);
        } else if (s.status === 'error') {
          setErrMsg(s.error || 'Scoring failed.');
          setPhase('error');
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {
        // transient — keep polling
      }
    }, 2000);
  }

  // Demo fallback: simulate the lifecycle locally when no submissionId comes back.
  // Rank is computed against the REAL leaderboard so the modal never contradicts it.
  function simulateLifecycle() {
    setPaywarn(true);
    setPhase('settled');
    setTimeout(() => setPhase('running'), 1400);
    setTimeout(async () => {
      const score = Number((0.6 + Math.random() * 0.35).toFixed(4));
      let rank = 1;
      let total = 1;
      try {
        const r = await fetch(`/api/challenges/${c.slug}/leaderboard`, { cache: 'no-store' });
        const data = await r.json();
        const scores: number[] = (data?.entries ?? []).map((e: { score: number }) => e.score);
        rank = scores.filter((s) => s > score).length + 1;
        total = scores.length + 1;
      } catch {
        /* lone competitor */
      }
      setResult({ status: 'scored', score, rank, total });
      setPhase('scored');
    }, 4200);
  }

  async function handleSubmit() {
    if (HAS_PRIVY && !authenticated) {
      login?.();
      return;
    }
    setErrMsg('');
    setResult(null);
    setTxHash(undefined);
    setPaywarn(false);
    setPhase('paying');
    setModalOpen(true);

    const url = `/api/challenges/${c.slug}/submit`;
    const body = JSON.stringify({
      name: name.trim() || 'anon',
      address: walletAddress || '',
      code,
      kind: 'HUMAN',
    });

    const doFetch =
      HAS_PRIVY && wrapFetchWithPayment && walletAddress
        ? // cap at 1 USDC — the default (0.1) sits exactly at our fee and can reject it
          wrapFetchWithPayment({ walletAddress, fetch, maxValue: BigInt(1_000_000) })
        : fetch;

    try {
      const r = await doFetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
      });
      // Response arrived → payment settled. Surface tx hash if present.
      const tx = txFromResponse(r as Response);
      if (tx) setTxHash(tx);
      if (!r.ok) throw new Error(`submit returned ${r.status}`);
      const data = await r.json();
      setPhase('settled');
      if (data?.submissionId) {
        setTimeout(() => pollStatus(String(data.submissionId)), 900);
      } else {
        // Real settlement but no worker job id — fall back to local lifecycle visuals.
        setTimeout(() => simulateLifecycle(), 900);
      }
    } catch (err) {
      if (HAS_PRIVY && authenticated && walletAddress) {
        // A REAL payment attempt failed — surface it, never fake success.
        // (Most common cause: the embedded wallet has no Base Sepolia USDC.)
        setErrMsg(
          err instanceof Error && err.message
            ? `${err.message} — does your wallet have Base Sepolia USDC? (faucet.circle.com)`
            : 'Payment failed — does your wallet have Base Sepolia USDC? (faucet.circle.com)',
        );
        setPhase('error');
        return;
      }
      // Privy not configured at all — simulate so the flow still demos.
      simulateLifecycle();
    }
  }

  function closeModal() {
    setModalOpen(false);
    if (pollRef.current) clearInterval(pollRef.current);
  }

  const feeLabel = fmtUsd(c.entryFeeUsd, { cents: true });
  const buttonText = HAS_PRIVY && ready && !authenticated ? 'Sign in to compete' : `Pay ${feeLabel} & Submit`;

  return (
    <div className="card rail-card submitcard">
      <span className="rail-label" style={{ color: 'var(--blue)' }}>
        Submit your strategy
      </span>

      <label className="field-label">Display name</label>
      <input className="txt" value={name} onChange={(e) => setName(e.target.value)} placeholder="anon" />

      <label className="field-label">Strategy code</label>
      <textarea
        className="txt"
        rows={5}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder={'# your strategy here\ndef strategy(...):\n    ...'}
      />

      <div
        className={'dropzone' + (fileName ? ' has-file' : '')}
        style={{ marginTop: 12 }}
        onClick={() => document.getElementById(`file-${c.slug}`)?.click()}
      >
        {fileName ? (
          <>
            <div className="dz-file">▣ {fileName}</div>
            <div className="dz-hint">loaded · click to replace</div>
          </>
        ) : (
          <>
            <div className="dz-file" style={{ color: 'var(--muted)' }}>
              drop a strategy file
            </div>
            <div className="dz-hint">or click to browse</div>
          </>
        )}
        <input
          id={`file-${c.slug}`}
          type="file"
          style={{ display: 'none' }}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) {
              setCode(await f.text());
              setFileName(f.name);
            }
          }}
        />
      </div>

      <button className="btn btn-primary btn-block btn-lg" onClick={handleSubmit}>
        <LogoUSDC size={15} /> {buttonText}
      </button>

      <button
        type="button"
        className="btn btn-ghost btn-block"
        style={{ marginTop: 10 }}
        onClick={() => setParticipateOpen(true)}
      >
        ◇ Let an agent compete
      </button>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 7,
          marginTop: 12,
          fontSize: 12.5,
          color: 'var(--muted)',
          flexWrap: 'wrap',
        }}
      >
        <span>paid over</span>
        <LogoX402 height={13} />
        <span>·</span>
        <span className="navlink" style={{ color: 'var(--blue)', cursor: 'pointer' }} onClick={() => setParticipateOpen(true)}>
          or use the CLI ↗
        </span>
      </div>

      {modalOpen && (
        <PaymentModal
          c={c}
          phase={phase}
          txHash={txHash}
          result={result}
          errMsg={errMsg}
          paywarn={paywarn}
          onClose={closeModal}
        />
      )}
      {participateOpen && <ParticipateModal slug={c.slug} onClose={() => setParticipateOpen(false)} />}
    </div>
  );
}
