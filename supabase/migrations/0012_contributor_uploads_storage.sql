-- Storage bucket for images contributors/pakar upload with their
-- articles (the "Ulasan Pakar" submission form). Public read (images
-- need to render on the public site) but writes restricted to each
-- user's own folder (uploads/<user_id>/<file>), enforced via
-- storage.foldername() rather than trusting the client.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contributor-uploads',
  'contributor-uploads',
  true,
  5242880, -- 5MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "contributor uploads: public read"
  on storage.objects for select
  using (bucket_id = 'contributor-uploads');

create policy "contributor uploads: users upload to own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'contributor-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "contributor uploads: users manage own files"
  on storage.objects for update
  using (
    bucket_id = 'contributor-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "contributor uploads: users delete own files"
  on storage.objects for delete
  using (
    bucket_id = 'contributor-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
