-- Rename user-visible category labels away from the "detik..." naming
-- (per explicit request to stop using detikNews/detikFinance/detikHot/
-- detikInet/etc as displayed names), and add real RSS sources so every
-- vertical actually gets filled daily instead of relying only on
-- keyword-matching leftover items from the 3 original feeds.
--
-- Internal category `slug` values (news, finance, hot, inet, sport, oto,
-- travel, food, health, wolipop, "20detik") are left unchanged — they are
-- not shown to users, only the `label` column and the app's own display
-- maps are. "20detik" and "wolipop" get new display labels too
-- (PinterClip / PinterStyle) since the old labels were detik.com's own
-- sub-brand names.

update categories set label = '📰 PinterNews'    where slug = 'news';
update categories set label = '💰 PinterFinance' where slug = 'finance';
update categories set label = '🔥 PinterHot'     where slug = 'hot';
update categories set label = '💻 PinterInet'    where slug = 'inet';
update categories set label = '⚽ PinterSport'   where slug = 'sport';
update categories set label = '🚗 PinterOto'     where slug = 'oto';
update categories set label = '✈️ PinterTravel'  where slug = 'travel';
update categories set label = '🍔 PinterFood'    where slug = 'food';
update categories set label = '🏥 PinterHealth'  where slug = 'health';
update categories set label = '💄 PinterStyle'   where slug = 'wolipop';
update categories set label = '🎥 PinterClip'    where slug = '20detik';

-- New sources: give every vertical a real, live feed instead of leaving
-- inet/sport/oto/travel/food/health/wolipop entirely dependent on
-- spillover keyword-matches from the news/finance/hot feeds. All URLs
-- were verified live (HTTP 200, real <item> entries) before this
-- migration was written.
insert into sources (name, feed_url, category_slug, trust, enabled) values
  ('ANTARA Hukum',      'https://www.antaranews.com/rss/hukum.xml',    'news',    5, true),
  ('ANTARA Hiburan',    'https://www.antaranews.com/rss/hiburan.xml',  'hot',     5, true),
  ('ANTARA Tekno',      'https://www.antaranews.com/rss/tekno.xml',    'inet',    5, true),
  ('CNN Teknologi',     'https://www.cnnindonesia.com/teknologi/rss',  'inet',    5, true),
  ('ANTARA Olahraga',   'https://www.antaranews.com/rss/olahraga.xml', 'sport',   5, true),
  ('ANTARA Otomotif',   'https://www.antaranews.com/rss/otomotif.xml', 'oto',     5, true),
  ('CNN Otomotif',      'https://www.cnnindonesia.com/otomotif/rss',   'oto',     5, true),
  ('Liputan6 Otomotif', 'https://feed.liputan6.com/rss/otomotif',      'oto',     5, true),
  ('Liputan6 Kesehatan','https://feed.liputan6.com/rss/kesehatan',     'health',  5, true),
  -- Lifestyle feeds left uncategorized on purpose: they bundle
  -- travel/food/fashion/parenting together upstream, so per-item
  -- keyword-matching (matchTheme) sorts each item into travel / food /
  -- wolipop (PinterStyle) / health individually, better than forcing
  -- the whole feed into one bucket.
  ('ANTARA Lifestyle',  'https://www.antaranews.com/rss/lifestyle.xml', null, 5, true),
  ('CNN Gaya Hidup',    'https://www.cnnindonesia.com/gaya-hidup/rss',  null, 5, true)
on conflict do nothing;
