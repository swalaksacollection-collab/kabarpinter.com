"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

// One Google AdSense display unit. The loader script is shared (same `id`, so
// next/script loads it once however many units are on the page).
export function AdUnit({
  client,
  slotId,
  slotKey,
}: {
  client: string;
  slotId: string;
  slotKey: string;
}) {
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return; // StrictMode runs effects twice in dev
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // AdSense blocked or not ready: the empty unit simply collapses.
    }
  }, []);

  return (
    <div className={`ad-slot ad-slot--${slotKey}`}>
      <span className="ad-slot__label">Iklan</span>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={client}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
      <Script
        id="adsense-loader"
        async
        strategy="afterInteractive"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
        crossOrigin="anonymous"
      />
    </div>
  );
}
