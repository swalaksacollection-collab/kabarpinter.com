"use client";

import { useState } from "react";

const SITE_URL = "https://kabarpinter.com";

function IconWrap({ children }: { children: React.ReactNode }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      {children}
    </svg>
  );
}

const PLATFORMS = [
  {
    name: "WhatsApp",
    className: "share-btn--whatsapp",
    href: (url: string, title: string) =>
      `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
    icon: (
      <IconWrap>
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.33 4.95L2 22l5.29-1.39a9.9 9.9 0 0 0 4.75 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm0 18.03h-.01a8.1 8.1 0 0 1-4.14-1.13l-.3-.18-3.14.82.84-3.06-.19-.31a8.13 8.13 0 0 1-1.24-4.35c0-4.5 3.66-8.16 8.17-8.16a8.1 8.1 0 0 1 5.78 2.4 8.1 8.1 0 0 1 2.39 5.77c0 4.51-3.67 8.2-8.16 8.2Zm4.47-6.13c-.24-.12-1.45-.72-1.68-.8-.22-.08-.39-.12-.55.12-.16.24-.63.8-.78.97-.14.16-.29.18-.53.06-.24-.12-1.02-.38-1.95-1.21-.72-.64-1.2-1.44-1.35-1.68-.14-.24-.02-.37.11-.49.11-.11.24-.29.36-.43.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.32-.75-1.81-.2-.48-.4-.41-.55-.42h-.47c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.13 3.64.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.45-.59 1.65-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28Z" />
      </IconWrap>
    ),
  },
  {
    name: "Facebook",
    className: "share-btn--facebook",
    href: (url: string) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    icon: (
      <IconWrap>
        <path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14C17.17 2.1 15.9 2 14.6 2 11.9 2 10 3.66 10 6.7v2.8H7v4h3V22h4V13.5Z" />
      </IconWrap>
    ),
  },
  {
    name: "Messenger",
    className: "share-btn--messenger",
    href: (url: string) => `fb-messenger://share/?link=${encodeURIComponent(url)}`,
    icon: (
      <IconWrap>
        <path d="M12 2C6.48 2 2 6.15 2 11.27c0 2.91 1.45 5.5 3.72 7.2V22l3.4-1.87c.91.25 1.87.39 2.88.39 5.52 0 10-4.15 10-9.27S17.52 2 12 2Zm1.01 12.48-2.55-2.72-4.98 2.72 5.48-5.82 2.61 2.72 4.92-2.72-5.48 5.82Z" />
      </IconWrap>
    ),
  },
  {
    name: "X",
    className: "share-btn--x",
    href: (url: string, title: string) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
    icon: (
      <IconWrap>
        <path d="M18.24 2h3.3l-7.2 8.23L23 22h-6.63l-5.2-6.8L5.2 22H1.9l7.7-8.8L1 2h6.8l4.7 6.2L18.24 2Zm-1.16 18h1.83L7.02 3.9H5.06L17.08 20Z" />
      </IconWrap>
    ),
  },
  {
    name: "Telegram",
    className: "share-btn--telegram",
    href: (url: string, title: string) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    icon: (
      <IconWrap>
        <path d="M21.9 4.3 18.6 20c-.25 1.1-.9 1.37-1.83.86l-5.05-3.72-2.44 2.35c-.27.27-.5.5-1.02.5l.36-5.15L18.2 6.6c.4-.36-.09-.56-.62-.2L6.5 13.2 1.5 11.6c-1.08-.34-1.1-1.08.23-1.6L20.5 3.1c.9-.33 1.7.2 1.4 1.2Z" />
      </IconWrap>
    ),
  },
] as const;

export function ShareButtons({ title, path }: { title: string; path: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${SITE_URL}${path}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable (older browsers, non-HTTPS
      // contexts) - fail quietly rather than throwing in the UI.
    }
  }

  return (
    <div className="share-buttons" role="group" aria-label="Bagikan artikel">
      {PLATFORMS.map((p) => (
        <a
          key={p.name}
          href={p.href(url, title)}
          target="_blank"
          rel="noopener noreferrer"
          className={`share-btn ${p.className}`}
          aria-label={`Bagikan ke ${p.name}`}
          title={p.name}
        >
          {p.icon}
        </a>
      ))}
      <button
        type="button"
        onClick={copyLink}
        className="share-btn share-btn--copy"
        aria-label="Salin tautan"
        title={copied ? "Tersalin!" : "Salin tautan"}
      >
        {copied ? (
          <IconWrap>
            <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
          </IconWrap>
        ) : (
          <IconWrap>
            <path d="M3.9 12c0-1.16.94-2.1 2.1-2.1h4v-1.8H6a3.9 3.9 0 0 0 0 7.8h4v-1.8H6c-1.16 0-2.1-.94-2.1-2.1ZM8 13h8v-2H8v2Zm10-5h-4v1.8h4a2.1 2.1 0 0 1 0 4.2h-4V16h4a3.9 3.9 0 0 0 0-7.8Z" />
          </IconWrap>
        )}
      </button>
    </div>
  );
}
