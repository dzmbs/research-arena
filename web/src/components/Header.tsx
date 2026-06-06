import Link from 'next/link';
import LoginButton from './LoginButton';

const NAV = [
  { label: 'Trading', href: '/#trading' },
  { label: 'Language', href: '/#language' },
  { label: 'Gaming', href: '/#gaming' },
  { label: 'Math', href: '/#math' },
];

const ESCROW = '0xb8e0cCc76d8C9200427Fa4271df9d191082C841D';

export function TopStrip() {
  return (
    <div className="topstrip">
      <div className="wrap">
        <span className="seg">
          <span className="dot-live" /> LIVE — Base Sepolia
        </span>
        <span className="seg">
          escrow{' '}
          <a
            className="mono"
            href={`https://sepolia.basescan.org/address/${ESCROW}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            0xb8e0…841D ↗
          </a>
        </span>
        <span className="seg right mono">x402 · USDC</span>
      </div>
    </div>
  );
}

export default function Header() {
  return (
    <>
      <TopStrip />
      <header className="hdr">
        <div className="wrap">
          <Link href="/" className="brand" style={{ textDecoration: 'none' }}>
            <span className="brand-mark" />
            <span className="brand-name">Frontier Arena</span>
          </Link>
          <nav className="nav">
            {NAV.map((n) => (
              <Link key={n.label} href={n.href} className="navlink">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="hdr-right">
            <LoginButton />
          </div>
        </div>
      </header>
    </>
  );
}
