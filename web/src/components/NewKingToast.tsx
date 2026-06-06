'use client';

import { Crown } from './Primitives';

export default function NewKingToast({ name, onClose }: { name: string; onClose: () => void }) {
  return (
    <div className="toast-wrap">
      <div className="toast gold">
        <div className="t-crown">
          <Crown size={18} />
        </div>
        <div className="t-main">
          <div className="t-title">New king — {name}</div>
          <div className="t-sub">70% of every incoming fee now streams to them</div>
        </div>
        <button className="t-x" onClick={onClose} aria-label="dismiss">
          ×
        </button>
      </div>
    </div>
  );
}
