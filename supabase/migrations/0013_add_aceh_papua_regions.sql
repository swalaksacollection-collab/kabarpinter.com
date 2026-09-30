-- Adds Aceh and Papua to the Daerah region set (migration 0011),
-- with the same ANTARA regional-bureau pattern used for the other 6
-- regions. Both feeds verified live before this migration was written.
insert into sources (name, feed_url, category_slug, region_slug, trust, enabled) values
  ('ANTARA Aceh',  'https://aceh.antaranews.com/rss/terkini.xml',  null, 'aceh',  5, true),
  ('ANTARA Papua', 'https://papua.antaranews.com/rss/terkini.xml', null, 'papua', 5, true)
on conflict do nothing;
