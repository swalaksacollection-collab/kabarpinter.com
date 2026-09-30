// Decorative ad-slot placeholder, matching detik.com's homepage sponsor
// banner layout. Not a real ad — no ad server or sponsor is wired up.
export function SponsorBanner() {
  return (
    <div className="sponsor-banner">
      <span className="sponsor-banner__label">Ruang Iklan</span>
      <span className="sponsor-banner__text">
        Tertarik memasang iklan di sini? Lihat{" "}
        <a href="/pasang-iklan" style={{ color: "var(--red)", fontWeight: 600 }}>
          Pasang Iklan
        </a>
        .
      </span>
    </div>
  );
}
