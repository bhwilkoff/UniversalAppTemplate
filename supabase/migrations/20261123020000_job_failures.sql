-- What a ten-minute job could not do, so it waits and then stops instead of
-- trying the same thing every tick (Ben, November 23, 2026: "fix the re-scan
-- of the exact same failures. We should never build something that does
-- that."). The rule is supabase/functions/_shared/retry.js: an hour, a day, a
-- week, then given up on and listed in the job's answer. A success deletes the
-- row. Only the service role reads or writes it.

create table if not exists public.job_failures (
  job        text not null,
  item       text not null,
  tries      integer not null default 1,
  reason     text,
  failed_at  timestamptz not null default now(),
  next_at    timestamptz,
  primary key (job, item)
);

alter table public.job_failures enable row level security;
revoke all on public.job_failures from anon, authenticated;
