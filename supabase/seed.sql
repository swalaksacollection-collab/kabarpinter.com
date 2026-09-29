insert into categories (slug, label, priority) values
  ('tren-viral', '🔥 Tren Hari Ini', 10),
  ('peluang-bisnis', '💡 Peluang Bisnis', 10),
  ('karir-skill', '💼 Karir & Skill', 9),
  ('konsumen-data', '📊 Tren Konsumen', 8),
  ('ekspor-impor', '🌏 Ekspor-Impor', 8),
  ('umkm-inspirasi', '🚀 Kisah UMKM', 9),
  ('ekonomi-uang', '💰 Ekonomi & Uang', 7),
  ('politik', '🏛️ Politik', 5);

insert into sources (name, feed_url, category_slug, trust) values
  ('ANTARA Top News', 'https://www.antaranews.com/rss/top-news.xml', null, 10),
  ('ANTARA Ekonomi', 'https://www.antaranews.com/rss/ekonomi.xml', 'ekonomi-uang', 10),
  ('ANTARA Politik', 'https://www.antaranews.com/rss/politik.xml', 'politik', 10),
  ('Tribunnews', 'https://www.tribunnews.com/rss', 'tren-viral', 7),
  ('Liputan6 News', 'https://feed.liputan6.com/rss/news', null, 9),
  ('Kontan', 'https://www.kontan.co.id/feed', 'ekonomi-uang', 9);
