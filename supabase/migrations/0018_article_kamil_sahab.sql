-- Berita redaksi: rangkuman liputan Kamil Sahab (film politik + MC Award 2027).
-- Ditulis ulang oleh redaksi dari tiga laporan (Putraindo News 21 & 26 Okt 2026,
-- Pakuan Pos 26 Okt 2026). Foto disimpan di public/berita/ (dipasang sebagai
-- /berita/*.jpg). Jalankan di Supabase SQL editor (project nkkkzkteyrelxcnsvyif).
-- Body memakai penanda: "## Subjudul" dan "![keterangan](/berita/foto.jpg)".

insert into articles (
  source_type, status, title, slug, excerpt, body, image_url,
  category_slug, source_name, score, published_at
) values (
  'rss', 'published',
  'Kamil Sahab Siapkan Film Bertema Politik dan MC Award 2027',
  'kamil-sahab-siapkan-film-politik-dan-mc-award-2027',
  'Produser film Kamil Sahab menyiapkan dua kabar sekaligus: film bertema politik setelah puluhan judul, serta MC Award 2027 yang menempatkan literasi sebagai fondasi profesi pembawa acara.',
  $body$Produser film Kamil Sahab (di sejumlah media ditulis Kamil Sahib) kembali jadi sorotan lewat dua rencana sekaligus: sebuah film bertema politik dan kembalinya ajang MC Award pada 2027. Keduanya disampaikan dalam rentang sepekan, pada 20 dan 26 Oktober 2026.
## Dari puluhan film ke tema politik
Menurut laporan Putraindo News, Kamil telah memproduksi lebih dari 50 film dan kini menyiapkan karya berikutnya yang menyentuh dunia politik. Rencana itu ia sampaikan kepada awak media di Jakarta, Selasa (20/10/2026). "Saat ini saya sedang mempersiapkan film bertema politik," ujarnya.
![Produser film Kamil Sahab. Foto: Ist](/berita/kamil-sahab-film-politik.jpg)
Selain film, Kamil berencana meluncurkan podcast untuk membagikan pandangan dan prediksinya tentang iklim politik Indonesia. Ia dikenal pula memiliki minat pada dunia ramalan, dan menilai publik yang peduli pada politik nasional menunggu penjelasan langsung tentang dasar prediksi tersebut.
## MC Award 2027: literasi jadi fondasi
Pada 26 Oktober 2026, Kamil juga bicara soal MC Award, ajang bagi pembawa acara yang digelar Yayasan Karya Pembawa Acara Indonesia. Penyelenggaraan 2027 dipimpin Ir. Edyson Hasibuan, bekerja sama dengan QQPRO Artist Management, dan didukung Perpustakaan Nasional.
Kamil, yang pernah menjadi juri pada edisi 2024, menekankan bahwa profesi MC erat dengan literasi. Pembawa acara dituntut berwawasan luas dan piawai berkomunikasi. "Seorang MC yang baik harus memiliki literasi yang mumpuni," katanya.
![Kamil Sahib bersama dorongan literasi untuk MC Indonesia. Foto: Ist](/berita/kamil-sahib-pakuanpos.jpg)
CEO QQPRO, Bunda Astrid, menyebut sejumlah pembawa acara ternama sedang disiapkan sebagai juri 2027 dan beberapa di antaranya sudah menyatakan dukungan. Edisi 2024 diikuti sekitar 20 peserta, yang oleh Kamil disebut sebagai langkah awal. Panitia berharap peserta 2027 lebih banyak, dan ajang ini dikembangkan menjadi bagian dari festival literasi dengan kegiatan di beberapa daerah.$body$,
  'https://kabarpinter.com/berita/kamil-sahib-mc-award-2027.jpg',
  'hot', 'Redaksi Kabarpinter.com', 60, '2026-10-26 13:00:00+07'
) on conflict (slug) do nothing;
