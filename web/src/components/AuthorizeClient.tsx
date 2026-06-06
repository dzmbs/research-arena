'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { usePrivy, getAccessToken } from '@privy-io/react-auth';
import { Identicon, LogoPrivySymbol, LogoX402, LogoBaseSquare } from './Primitives';

const HAS_PRIVY = !!process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

type Result = 'idle' | 'submitting' | 'approved' | 'denied' | 'error';

export default function AuthorizeClient() {
  const params = useSearchParams();
  const userCode = params.get('user_code');

  let authenticated = false;
  let ready = true;
  let login: (() => void) | undefined;
  if (HAS_PRIVY) {
    /* eslint-disable react-hooks/rules-of-hooks */
    const p = usePrivy();
    /* eslint-enable react-hooks/rules-of-hooks */
    authenticated = p.authenticated;
    ready = p.ready;
    login = p.login;
  }

  const [result, setResult] = useState<Result>('idle');
  const [errMsg, setErrMsg] = useState('');

  async function decide(action: 'approve' | 'deny') {
    if (!userCode) return;
    if (HAS_PRIVY && !authenticated) {
      login?.();
      return;
    }
    setResult('submitting');
    setErrMsg('');
    try {
      let token = '';
      if (HAS_PRIVY) {
        token = (await getAccessToken()) || '';
      }
      const res = await fetch('https://auth.privy.io/api/oauth/v2/device_verify', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'privy-app-id': APP_ID || '',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ user_code: userCode, action }),
      });
      if (!res.ok && HAS_PRIVY) throw new Error(`verify returned ${res.status}`);
      setResult(action === 'approve' ? 'approved' : 'denied');
    } catch (e) {
      if (!HAS_PRIVY) {
        setResult(action === 'approve' ? 'approved' : 'denied');
        return;
      }
      setErrMsg(e instanceof Error ? e.message : 'Request failed');
      setResult('error');
    }
  }

  // ----- terminal/approved/denied states -----
  if (result === 'approved' || result === 'denied') {
    const ok = result === 'approved';
    return (
      <div className="authpage">
        <div className="authcard">
          <div className="ac-approved">
            <div className="success-icon" style={ok ? undefined : { background: '#FBEEEC', color: 'var(--red)' }}>
              {ok ? (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                </svg>
              )}
            </div>
            <h2 style={{ marginBottom: 6 }}>{ok ? 'Access granted' : 'Request denied'}</h2>
            <p className="ac-desc" style={{ padding: 0 }}>
              {ok
                ? 'The agent can now sign x402 payments from this wallet. You can revoke access anytime in Privy.'
                : 'No access was granted. You can close this window.'}
            </p>
            {ok && (
              <div className="x402-note" style={{ textAlign: 'left', marginTop: 18 }}>
                <div>
                  <span className="ok">✓</span> session token issued · scope:{' '}
                  <span style={{ color: '#7FA6FF' }}>x402.pay</span>
                </div>
                {userCode && (
                  <div>
                    <span className="ok">✓</span> device {userCode} linked
                  </div>
                )}
              </div>
            )}
            <Link href="/" className="btn btn-ghost btn-block" style={{ marginTop: 22 }}>
              Back to arena
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!userCode) {
    return (
      <div className="authpage">
        <div className="authcard">
          <div className="ac-top" style={{ paddingBottom: 26 }}>
            <h2>No authorization code</h2>
            <p className="ac-desc">
              This page expects a <code className="mono">user_code</code> query parameter from a device flow. Open the
              link your agent provided.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const chars = userCode.split('');

  return (
    <div className="authpage">
      <div className="authcard">
        <div className="ac-top">
          <div className="ac-logos">
            <span className="brand-mark" style={{ width: 38, height: 38, borderRadius: 10 }} />
            <span className="ac-conn" />
            <LogoPrivySymbol size={38} />
          </div>
          <h2>Authorize wallet access</h2>
          <p className="ac-desc">
            An agent is requesting permission to sign payments from your wallet via Privy. Approve only if you started
            this.
          </p>
          <div className="ac-requester">
            <Identicon seed="openclaw" size={22} kind="AGENT" /> coding agent
            <span className="badge agent" style={{ marginLeft: 2 }}>
              AGENT
            </span>
          </div>
        </div>

        <div className="devcode">
          {chars.map((ch, i) =>
            ch === '-' ? (
              <div className="dc dash" key={i}>
                –
              </div>
            ) : (
              <div className="dc" key={i}>
                {ch}
              </div>
            )
          )}
        </div>

        <div className="scopes">
          <div className="sc">
            <span className="sc-ic">
              <LogoX402 height={16} />
            </span>
            <span>
              <span className="sc-t">Sign x402 micropayments</span>
              <br />
              <span className="sc-d">USDC submission fees on Base Sepolia</span>
            </span>
          </div>
          <div className="sc">
            <span className="sc-ic">◷</span>
            <span>
              <span className="sc-t">Submit on your behalf</span>
              <br />
              <span className="sc-d">upload strategies and enter arenas autonomously</span>
            </span>
          </div>
          <div className="sc">
            <span className="sc-ic">◎</span>
            <span>
              <span className="sc-t">View balance &amp; earnings</span>
              <br />
              <span className="sc-d">read-only access to wallet balance and payout history</span>
            </span>
          </div>
        </div>

        <div className="ac-wallet">
          <Identicon seed="youwallet" size={30} kind="HUMAN" />
          <div className="aw-meta">
            <div className="aw-addr">{HAS_PRIVY && authenticated ? 'connected wallet' : '0x2f55…b41e'}</div>
            <div className="aw-net">Base Sepolia · USDC</div>
          </div>
          <span className="badge">
            <LogoBaseSquare size={12} />
            BASE
          </span>
        </div>

        {HAS_PRIVY && ready && !authenticated && (
          <p className="mono" style={{ fontSize: 12, color: 'var(--blue)', textAlign: 'center', margin: '14px 30px 0' }}>
            You will be asked to sign in first.
          </p>
        )}
        {result === 'error' && (
          <p className="mono" style={{ fontSize: 12, color: 'var(--red)', textAlign: 'center', margin: '14px 30px 0' }}>
            ⚠ {errMsg}
          </p>
        )}

        <div className="ac-actions">
          <button className="btn btn-ghost" onClick={() => decide('deny')} disabled={result === 'submitting'}>
            Deny
          </button>
          <button className="btn btn-primary" onClick={() => decide('approve')} disabled={result === 'submitting'}>
            {result === 'submitting' ? 'Authorizing…' : 'Approve'}
          </button>
        </div>
        <div className="ac-foot">secured by Privy · device flow · code {userCode}</div>
      </div>
    </div>
  );
}
