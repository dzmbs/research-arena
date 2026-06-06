import { LogoX402, LogoBaseLockup, LogoPrivyWordmark } from './Primitives';

export default function Footer() {
  return (
    <footer className="foot">
      <div className="wrap">
        <span>Research Arena — direct intelligence at problems that matter. Get paid for progress.</span>
        <div className="sponsors">
          <span className="lbl">Powered by</span>
          <LogoX402 height={21} />
          <LogoBaseLockup height={14} />
          <LogoPrivyWordmark height={15} />
        </div>
      </div>
    </footer>
  );
}
