-- Fills the remaining thin categories (hot, sport, wolipop/PinterStyle,
-- food/PinterFood) with real dedicated or keyword-matched feeds, and
-- retires a feed that has gone dead.
--
-- Kontan's feed URL now serves an HTML page instead of XML (already
-- anticipated by fetch-rss/index.ts's "did not look like an RSS/XML
-- feed" guard, which is why it only ever showed up as a silent error,
-- not a crash) — disable it rather than leave it erroring every run.
-- finance is already well covered by ANTARA Ekonomi alone.
update sources set enabled = false where name = 'Kontan';

insert into sources (name, feed_url, category_slug, trust, enabled) values
  ('CNN Olahraga',       'https://www.cnnindonesia.com/olahraga/rss', 'sport', 5, true),
  ('Liputan6 Bola',      'https://feed.liputan6.com/rss/bola',        'sport', 5, true),
  ('CNN Hiburan',        'https://www.cnnindonesia.com/hiburan/rss',  'hot',   5, true),
  ('Liputan6 Showbiz',   'https://feed.liputan6.com/rss/showbiz',     'hot',   5, true),
  -- Uncategorized on purpose (see migration 0007's note): general
  -- lifestyle feeds get sorted into travel / food / PinterStyle / health
  -- per-item by matchTheme's keyword matching.
  ('Liputan6 Lifestyle', 'https://feed.liputan6.com/rss/lifestyle',   null,    5, true)
on conflict do nothing;
