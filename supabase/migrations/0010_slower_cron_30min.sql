-- Reverted per explicit request: run the RSS ingestion every 30 minutes
-- instead of every 5. (Note: this cadence runs server-side against
-- upstream RSS feeds - it does not consume any end-user mobile data;
-- that only happens when a visitor actually loads a page. The 30-minute
-- interval was chosen here to reduce Supabase-side bandwidth/compute
-- instead.)
select cron.unschedule('fetch-rss-every-5-min');

select cron.schedule(
  'fetch-rss-every-30-min',
  '*/30 * * * *',
  $$
  select net.http_post(
    url := 'https://nkkkzkteyrelxcnsvyif.supabase.co/functions/v1/fetch-rss',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    timeout_milliseconds := 45000
  );
  $$
);
