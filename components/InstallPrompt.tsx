"use client";

import { useEffect, useState } from "react";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const KEY_INSTALLED = "kp_installed";
const KEY_DISMISS = "kp_install_dismiss_until";
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

function read(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function write(k: string, v: string) {
  try {
    localStorage.setItem(k, v);
  } catch {}
}

/**
 * Popup ajakan install aplikasi (PWA) di HP. Tidak tampil di desktop,
 * saat dibuka dari aplikasi terpasang, setelah install, atau 7 hari
 * setelah user menekan "Nanti".
 */
export function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);

  useEffect(() => {
    const ua = navigator.userAgent;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (standalone) {
      write(KEY_INSTALLED, "1"); // dibuka dari aplikasi terpasang
      return;
    }
    if (!isMobile || read(KEY_INSTALLED) === "1") return;
    if (Date.now() < Number(read(KEY_DISMISS) || 0)) return;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const showSoon = () => {
      timer = setTimeout(() => {
        if (!cancelled && read(KEY_INSTALLED) !== "1") setVisible(true);
      }, 2500);
    };

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as InstallEvent);
      showSoon();
    };
    const onInstalled = () => {
      write(KEY_INSTALLED, "1");
      setVisible(false);
    };
    window.addEventListener("appinstalled", onInstalled);

    const nav = navigator as Navigator & {
      getInstalledRelatedApps?: () => Promise<unknown[]>;
    };
    const related = nav.getInstalledRelatedApps
      ? nav.getInstalledRelatedApps().catch(() => [])
      : Promise.resolve([]);

    related.then((apps) => {
      if (cancelled) return;
      if (apps.length) {
        write(KEY_INSTALLED, "1"); // app sudah terpasang, buka dari tab browser
        return;
      }
      if (isIOS) {
        setIos(true);
        showSoon();
      } else {
        window.addEventListener("beforeinstallprompt", onPrompt);
      }
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!visible) return null;

  const later = () => {
    write(KEY_DISMISS, String(Date.now() + DISMISS_MS));
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") write(KEY_INSTALLED, "1");
    setDeferred(null);
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Install aplikasi Kabarpinter"
      style={{
        position: "fixed",
        left: 12,
        right: 12,
        bottom: 12,
        zIndex: 99999,
        maxWidth: 480,
        margin: "0 auto",
        padding: 14,
        borderRadius: 14,
        background: "var(--chrome, #0d0d0d)",
        color: "var(--on-chrome, #fdfcfa)",
        border: "1px solid var(--yellow, #f5c518)",
        boxShadow: "0 8px 30px rgba(0,0,0,.45)",
        fontFamily: "var(--font-body)",
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/android-chrome-192x192.png"
          alt=""
          width={48}
          height={48}
          style={{ borderRadius: 10, flex: "none" }}
        />
        <div>
          <strong style={{ display: "block", fontSize: 15 }}>
            Pasang Kabarpinter di HP kamu
          </strong>
          <p style={{ fontSize: 13, lineHeight: 1.4, marginTop: 2, opacity: 0.85 }}>
            {ios ? (
              <>
                Tap ikon <b>Bagikan</b>, lalu pilih <b>Tambah ke Layar Utama</b>.
              </>
            ) : (
              "Akses berita lebih cepat langsung dari layar utama, tanpa buka browser."
            )}
          </p>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        {ios ? (
          <button type="button" onClick={later} style={btn("var(--yellow, #f5c518)", "#0d0d0d", 700)}>
            Mengerti
          </button>
        ) : (
          <>
            <button type="button" onClick={later} style={btn("#334155", "#e2e8f0", 400)}>
              Nanti
            </button>
            <button type="button" onClick={install} style={btn("var(--yellow, #f5c518)", "#0d0d0d", 700)}>
              Pasang
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function btn(bg: string, color: string, weight: number): React.CSSProperties {
  return {
    flex: 1,
    padding: 10,
    border: 0,
    borderRadius: 10,
    fontSize: 14,
    fontWeight: weight,
    cursor: "pointer",
    background: bg,
    color,
  };
}
