-- Content should feel continuously live, not just "eventually fresh".
-- The Edge Function already self-throttles to at most once every 5
-- minutes (THROTTLE_MINUTES in fetch-rss/index.ts) based on the most
-- recent inserted article - so scheduling cron at the same 5-minute
-- cadence lets it refresh as often as it safely can, instead of leaving
-- 10 of every 15 minutes on the table. A run that finds nothing new
-- simply inserts 0 rows; it does not stack or duplicate work.
select cron.unschedule('fetch-rss-every-15-min');

select cron.schedule(
  'fetch-rss-every-5-min',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://nkkkzkteyrelxcnsvyif.supabase.co/functions/v1/fetch-rss',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    timeout_milliseconds := 45000
  );
  $$
);
