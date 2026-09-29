-- Fixes two real holes found by final code review (not exploitable yet
-- since profiles has 0 rows, but this schema is explicitly the
-- foundation the next sub-project's contributor UI builds on):
--
-- 1. "profiles: user can update own row" had no WITH CHECK and no
--    column restriction, so any authenticated user could run
--    `update profiles set role = 'editor' where id = auth.uid()`,
--    grant themselves editor, and then read/update every article.
--    Fixed by revoking column-level UPDATE privilege on `role` from
--    `authenticated` entirely - role changes must go through the
--    service role (e.g. an admin action) from now on.
--
-- 2. "articles: contributor can insert own" only checked
--    `contributor_id = auth.uid()` - a contributor could insert a row
--    with status='published' directly, bypassing editor review
--    entirely. Fixed by requiring source_type='contributor' and
--    status in ('draft','submitted') at insert time too.
--
-- Also closes a related gap: there was no way for a contributor to
-- ever get a `profiles` row (no insert policy, no trigger from
-- auth.users), so the contributor flow this schema exists to support
-- was not actually reachable. Added both.

-- A column-specific `revoke update (role) ...` is NOT enough here: Supabase
-- grants `GRANT ALL` at the whole-table level to `authenticated` by default,
-- and that table-wide grant already covers every column regardless of any
-- later column-specific revoke (verified live: has_column_privilege still
-- returned true after a column-only revoke). The table-wide UPDATE grant
-- must be revoked and replaced with an explicit column list.
revoke update on public.profiles from authenticated;
grant update (display_name, bio) on public.profiles to authenticated;

drop policy "articles: contributor can insert own" on articles;
create policy "articles: contributor can insert own"
  on articles for insert with check (
    contributor_id = auth.uid()
    and source_type = 'contributor'
    and status in ('draft', 'submitted')
  );

create policy "profiles: user can insert own row"
  on profiles for insert with check (auth.uid() = id);

create function handle_new_user() returns trigger
  language plpgsql security definer
  set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.email),
    'contributor'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
