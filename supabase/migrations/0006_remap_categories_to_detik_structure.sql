-- Restructures categories from the original UMKM/career-focused taxonomy
-- to match detik.com's actual vertical structure, per explicit request to
-- replicate detik.com's format/layout/sitemap rather than the original
-- niche taxonomy. Order matters: insert new categories first, remap
-- existing rows to the new slugs, THEN drop the old categories (both
-- sources.category_slug and articles.category_slug reference
-- categories.slug by value, so old rows must be repointed before the
-- old category rows can be safely deleted).

insert into categories (slug, label, priority) values
  ('news', '📰 detikNews', 10),
  ('finance', '💰 detikFinance', 9),
  ('hot', '🔥 detikHot', 9),
  ('inet', '💻 detikInet', 7),
  ('sport', '⚽ detikSport', 7),
  ('oto', '🚗 detikOto', 6),
  ('travel', '✈️ detikTravel', 6),
  ('food', '🍔 detikFood', 6),
  ('health', '🏥 detikHealth', 7),
  ('wolipop', '💄 Wolipop', 6),
  ('20detik', '🎥 20detik', 6);

update sources set category_slug = case category_slug
  when 'ekonomi-uang' then 'finance'
  when 'politik' then 'news'
  when 'tren-viral' then 'hot'
  else category_slug
end
where category_slug is not null;

update articles set category_slug = case category_slug
  when 'tren-viral' then 'hot'
  when 'peluang-bisnis' then 'finance'
  when 'karir-skill' then 'news'
  when 'konsumen-data' then 'news'
  when 'ekspor-impor' then 'finance'
  when 'umkm-inspirasi' then 'finance'
  when 'ekonomi-uang' then 'finance'
  when 'politik' then 'news'
  else category_slug
end
where category_slug is not null;

delete from categories where slug in (
  'tren-viral', 'peluang-bisnis', 'karir-skill', 'konsumen-data',
  'ekspor-impor', 'umkm-inspirasi', 'ekonomi-uang', 'politik'
);
