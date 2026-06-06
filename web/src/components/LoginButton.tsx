'use client';

import { usePrivy } from '@privy-io/react-auth';

const HAS_PRIVY = !!process.env.NEXT_PUBLIC_PRIVY_APP_ID;

function short(addr?: string) {
  if (!addr) return '';
  return addr.slice(0, 6) + '…' + addr.slice(-4);
}

export default function LoginButton() {
  if (!HAS_PRIVY) {
    return (
      <button type="button" className="btn btn-primary btn-sm" title="Privy not configured — demo mode">
        Sign in
      </button>
    );
  }
  return <PrivyButton />;
}

function PrivyButton() {
  const { ready, authenticated, user, login, logout } = usePrivy();

  if (!ready) {
    return <span className="mono" style={{ fontSize: 13, color: 'var(--muted)', padding: '8px 12px' }}>…</span>;
  }

  if (!authenticated) {
    return (
      <button type="button" onClick={() => login()} className="btn btn-primary btn-sm">
        Sign in
      </button>
    );
  }

  const addr =
    user?.wallet?.address ||
    user?.linkedAccounts?.find((a) => 'address' in a && a.address)?.['address' as never];

  return (
    <div className="flex items-center gap-2">
      <span className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>
        {short(addr as string) || 'connected'}
      </span>
      <button type="button" onClick={() => logout()} className="btn btn-ghost btn-sm">
        Sign out
      </button>
    </div>
  );
}
