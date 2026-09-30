import Link from "next/link";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div className="footer__brand">
            <span className="logo">
              Kabar<span className="logo__accent">Pinter.com</span>
            </span>
            <p>
              Portal berita tren viral, kebijakan, peluang karir, dan cerita
              UMKM Indonesia. Dikurasi otomatis, sebagian ditulis oleh
              kontributor.
            </p>
          </div>
          <div>
            <h4>Kategori</h4>
            <ul>
              <li><Link href="/kategori/news">PinterNews</Link></li>
              <li><Link href="/kategori/finance">PinterFinance</Link></li>
              <li><Link href="/kategori/hot">PinterHot</Link></li>
              <li><Link href="/kategori/sport">PinterSport</Link></li>
              <li><Link href="/kategori/wolipop">PinterStyle</Link></li>
              <li><Link href="/opini">✍️ Ulasan Pakar</Link></li>
            </ul>
          </div>
          <div>
            <h4>Tentang</h4>
            <ul>
              <li><Link href="/tentang">Tentang Kami</Link></li>
              <li><Link href="/redaksi">Tim Redaksi</Link></li>
              <li><Link href="/pedoman">Pedoman Media Siber</Link></li>
              <li><Link href="/etika">Kode Etik</Link></li>
              <li><Link href="/privasi">Kebijakan Privasi</Link></li>
              <li><Link href="/kontak">Kontak</Link></li>
              <li><Link href="/kontributor/masuk">Jadi Kontributor/Pakar</Link></li>
            </ul>
          </div>
          <div>
            <h4>Pengiklan</h4>
            <ul>
              <li><Link href="/pasang-iklan">Pasang Iklan</Link></li>
              <li><Link href="/rate-card">Rate Card</Link></li>
              <li><Link href="/affiliate">Program Affiliate</Link></li>
              <li><Link href="/sponsorship">Sponsorship Konten</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer__bottom">
          <span>© {new Date().getFullYear()} Kabarpinter.com</span>
          <span>Dikurasi otomatis · Diverifikasi tim redaksi</span>
        </div>
      </div>
    </footer>
  );
}
