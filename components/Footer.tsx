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
              <li><a href="/kategori/news">PinterNews</a></li>
              <li><a href="/kategori/finance">PinterFinance</a></li>
              <li><a href="/kategori/hot">PinterHot</a></li>
              <li><a href="/kategori/sport">PinterSport</a></li>
              <li><a href="/kategori/wolipop">PinterStyle</a></li>
              <li><a href="/opini">✍️ Ulasan Pakar</a></li>
            </ul>
          </div>
          <div>
            <h4>Tentang</h4>
            <ul>
              <li><a href="/tentang">Tentang Kami</a></li>
              <li><a href="/redaksi">Tim Redaksi</a></li>
              <li><a href="/pedoman">Pedoman Media Siber</a></li>
              <li><a href="/etika">Kode Etik</a></li>
              <li><a href="/privasi">Kebijakan Privasi</a></li>
              <li><a href="/kontak">Kontak</a></li>
              <li><a href="/kontributor/masuk">Jadi Kontributor/Pakar</a></li>
            </ul>
          </div>
          <div>
            <h4>Pengiklan</h4>
            <ul>
              <li><a href="/pasang-iklan">Pasang Iklan</a></li>
              <li><a href="/rate-card">Rate Card</a></li>
              <li><a href="/affiliate">Program Affiliate</a></li>
              <li><a href="/sponsorship">Sponsorship Konten</a></li>
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
