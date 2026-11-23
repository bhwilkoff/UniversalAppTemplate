-- Two jobs that keep every app at $0 (Ben, November 23, 2026: "We should
-- optimize all of the repositories so that we can continue to ensure we have a
-- $0.00 stack for every app").
--
-- 1. pg_cron keeps a row for every run and never deletes one. The two
--    ten-minute jobs add about 2,000 rows a week; keep a week of history.
-- 2. CentMemo's Supabase project has no scheduled work of its own, and a free
--    project pauses after a week without activity, which would stop its Claude
--    connector. This project is always busy, so it calls CentMemo's public
--    metadata route once a day. The route needs no key, so nothing secret is
--    kept here.

select cron.unschedule(jobid) from cron.job where jobname in ('cron-history-trim', 'centmemo-keepalive');

select cron.schedule('cron-history-trim', '17 3 * * *',
  $$delete from cron.job_run_details where end_time < now() - interval '7 days'$$);

select cron.schedule('centmemo-keepalive', '23 9 * * *',
  $$select net.http_get('https://qucsmmazfalbyduxlavl.supabase.co/functions/v1/mcp/oauth-protected-resource')$$);
