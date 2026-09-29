create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema public;

select cron.schedule(
  'fetch-rss-every-15-min',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://nkkkzkteyrelxcnsvyif.supabase.co/functions/v1/fetch-rss',
    headers := jsonb_build_object('Content-Type', 'application/json')
  );
  $$
);
