import { Logo } from "./Logo";

const NAV = [
  { href: "/", label: "Beranda" },
  { href: "/daily-brief", label: "Daily Brief" },
  { href: "/kategori/tren-viral", label: "Tren Viral" },
  { href: "/kategori/karir-skill", label: "Karir & Skill" },
  { href: "/kategori/peluang-bisnis", label: "Peluang Bisnis" },
  { href: "/kategori/umkm-inspirasi", label: "UMKM" },
  { href: "/kategori/ekonomi-uang", label: "Ekonomi" },
];

export function Header() {
  return (
    <header className="border-b border-brand-charcoal/10 bg-brand-cream">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Logo />
        <a
          href="/cari"
          className="rounded-full bg-brand-charcoal px-4 py-2 text-sm text-brand-cream"
        >
          Cari
        </a>
      </div>
      <nav className="mx-auto max-w-6xl overflow-x-auto px-4 pb-3">
        <ul className="flex gap-4 text-sm text-brand-charcoal/80">
          {NAV.map((item) => (
            <li key={item.href}>
              <a href={item.href} className="whitespace-nowrap hover:text-brand-amber">
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
