export function Footer() {
  return (
    <footer className="mt-16 border-t border-brand-charcoal/10 bg-brand-charcoal py-10 text-brand-cream">
      <div className="mx-auto max-w-6xl px-4 text-sm">
        <p className="text-lg font-bold">
          Kabar<span className="text-brand-amber">Pinter</span>
        </p>
        <p className="mt-2 max-w-xl text-brand-cream/70">
          Portal berita tren viral, kebijakan, peluang karir, dan cerita UMKM
          Indonesia. Dikurasi otomatis, sebagian ditulis oleh kontributor.
        </p>
        <p className="mt-6 text-brand-cream/50">
          © {new Date().getFullYear()} Kabarpinter.com
        </p>
      </div>
    </footer>
  );
}
