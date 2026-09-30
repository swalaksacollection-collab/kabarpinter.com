-- Adds real per-region ("Daerah") content: a region_slug dimension on
-- both sources and articles (independent from category_slug - a
-- regional story is still topically categorized via matchTheme, and is
-- also tagged to its region), plus dedicated regional RSS sources so
-- the /daerah pages actually fill with real, current news instead of
-- being decorative (see the old comment on DAERAH in Header.tsx).

alter table sources add column if not exists region_slug text;
alter table articles add column if not exists region_slug text;
create index if not exists articles_region_idx on articles (region_slug);

-- ANTARA's regional bureau sites, one feed per region. All verified live
-- (HTTP 200, real <item> entries) before this migration was written.
-- Sulsel's bureau is branded "Makassar" (ANTARA's actual domain for that
-- region), not "sulsel" - sulsel.antaranews.com does not exist.
insert into sources (name, feed_url, category_slug, region_slug, trust, enabled) values
  ('ANTARA Jabar',             'https://jabar.antaranews.com/rss/terkini.xml',   null, 'jabar',  5, true),
  ('ANTARA Jateng',            'https://jateng.antaranews.com/rss/terkini.xml',  null, 'jateng', 5, true),
  ('ANTARA Jatim',             'https://jatim.antaranews.com/rss/terkini.xml',   null, 'jatim',  5, true),
  ('ANTARA Sumut',             'https://sumut.antaranews.com/rss/terkini.xml',   null, 'sumut',  5, true),
  ('ANTARA Makassar (Sulsel)', 'https://makassar.antaranews.com/rss/terkini.xml',null, 'sulsel', 5, true),
  ('ANTARA Bali',              'https://bali.antaranews.com/rss/terkini.xml',    null, 'bali',   5, true)
on conflict do nothing;
