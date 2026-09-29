-- net.http_post defaults to a 5000ms timeout, but fetch-rss fetches up
-- to 6 upstream feeds sequentially (each with its own 10s fetch timeout
-- for a hung source, per Global Constraints) and can legitimately take
-- well over 5 seconds end-to-end. Found by manually re-triggering the
-- function after adding fetch timeouts: net._http_response recorded
-- "Timeout of 5000 ms reached" and zero new article rows were written,
-- meaning the scheduled 15-minute cron job would have hit this same cap
-- on every run - the ingestion pipeline would go quietly dead the
-- moment upstream feeds were fully healthy and slow enough to add up
-- past 5s, not just on the pre-existing dead-source cases.
select cron.unschedule('fetch-rss-every-15-min');

select cron.schedule(
  'fetch-rss-every-15-min',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://nkkkzkteyrelxcnsvyif.supabase.co/functions/v1/fetch-rss',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    timeout_milliseconds := 45000
  );
  $$
);
