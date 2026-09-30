"use client";

import { useState } from "react";

// Decorative floating widget matching detik.com's live-video corner
// widget. This is NOT a real live stream — there is no video backend —
// it's a static placeholder so the layout matches; closing it just
// hides it for the current page view (no persistence).
export function LiveWidget() {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  return (
    <div className="live-widget">
      <button
        className="live-widget__close"
        onClick={() => setVisible(false)}
        aria-label="Tutup"
      >
        ×
      </button>
      <div className="live-widget__thumb">
        <span className="live-widget__badge">
          <span className="live-widget__dot" />
          LIVE
        </span>
        Video belum tersedia
      </div>
      <div className="live-widget__body">
        <p className="live-widget__title">Update Berita Hari Ini</p>
      </div>
    </div>
  );
}
