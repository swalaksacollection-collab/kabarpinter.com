-- "Pokok Berita": 1-3 poin ringkas yang disusun scripts/ringkas.py dari
-- cuplikan RSS (excerpt). NULL = belum diproses; '{}' = sudah diproses
-- tapi tidak ada poin yang layak (mis. cuplikan = judul).
alter table public.articles add column if not exists summary_points text[];
