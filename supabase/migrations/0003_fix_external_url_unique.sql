-- The partial unique index (`where external_url is not null`) cannot be
-- used as an ON CONFLICT (external_url) target in a plain upsert -
-- Postgres requires the conflict target to match a real constraint/index
-- exactly, and a partial index's predicate isn't inferred from a bare
-- column list. A plain UNIQUE constraint already allows multiple NULLs
-- (each NULL is distinct from every other NULL under standard SQL/Postgres
-- semantics), so the partial predicate bought nothing and broke upsert.
drop index if exists articles_external_url_idx;
alter table articles add constraint articles_external_url_key unique (external_url);
