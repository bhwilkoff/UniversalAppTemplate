-- An exchange opens with its maker's video (Ben, October 12, 2026: "When
-- you start an exchange, you should be able to upload/record the first
-- video because that forms the 'prompt' of the video."). start_exchange
-- makes the exchange and its opening video together, so no exchange starts
-- empty; it replaces create_exchange.

create function public.start_exchange(
  title text, cohort uuid, drive_file_id text, mime text default null,
  kind text default 'camera', seconds integer default null, note text default null
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  e public.exchanges;
begin
  if auth.uid() is null or not private.not_an_agent() then
    raise exception 'Sign in to start an exchange.';
  end if;
  if nullif(btrim(start_exchange.title), '') is null then
    raise exception 'Give the exchange a name people will recognize.';
  end if;
  if start_exchange.drive_file_id is null then
    raise exception 'An exchange opens with a video.';
  end if;
  if cohort is not null and not private.in_cohort(cohort) then
    raise exception 'Only the people in a cohort can start an exchange inside it.';
  end if;
  if (select count(*) from public.exchanges x where x.created_by = auth.uid() and x.created_at > now() - interval '1 day') >= 30 then
    raise exception 'That is a lot of exchanges for one day. Try again tomorrow.';
  end if;
  insert into public.exchanges (created_by, cohort_id, title)
  values (auth.uid(), cohort, btrim(start_exchange.title))
  returning * into e;
  insert into public.exchange_posts (exchange_id, author_id, drive_file_id, mime, kind, seconds, note)
  values (e.id, auth.uid(), start_exchange.drive_file_id, start_exchange.mime, coalesce(start_exchange.kind, 'camera'),
          start_exchange.seconds, nullif(btrim(start_exchange.note), ''));
  return e.token;
end;
$$;

revoke all on function public.start_exchange(text, uuid, text, text, text, integer, text) from public;
grant execute on function public.start_exchange(text, uuid, text, text, text, integer, text) to authenticated;

drop function public.create_exchange(text, text, uuid);
