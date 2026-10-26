-- Berita redaksi: artikel yang dibuat staf (editor/admin) lewat "Impor Berita".
-- ADDITIVE: hanya melonggarkan constraint source_type dan menambah policy untuk
-- source_type = 'redaksi'. Artikel RSS dan kontributor tidak tersentuh.

alter table articles drop constraint if exists articles_source_type_check;
alter table articles
  add constraint articles_source_type_check
  check (source_type in ('rss', 'contributor', 'redaksi'));

create policy "articles: editors can insert redaksi"
  on articles for insert to authenticated
  with check (is_editor() and source_type = 'redaksi');

create policy "articles: editors can delete redaksi"
  on articles for delete to authenticated
  using (is_editor() and source_type = 'redaksi');

-- Artikel Kamil Sahab (0018) menjadi artikel redaksi supaya bisa diedit di panel.
update articles set source_type = 'redaksi'
where slug = 'kamil-sahab-siapkan-film-politik-dan-mc-award-2027';
