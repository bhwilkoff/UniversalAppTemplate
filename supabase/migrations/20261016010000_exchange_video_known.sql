-- The video relay (tools/video-relay, Ben, October 16, 2026: the exchange
-- videos took "a VERY long time to load") streams a Drive file to the
-- browser only when it is a video in an exchange, so it cannot be used to
-- fetch any other Drive file. It asks this, with the public key, and learns
-- only yes or no: never which exchange, whose video, or who may watch it
-- (the file itself is shared by link in its owner's Drive either way).

create function public.exchange_video_known(drive_file_id text)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.exchange_posts p where p.drive_file_id = exchange_video_known.drive_file_id);
$$;

revoke execute on function public.exchange_video_known(text) from public;
grant execute on function public.exchange_video_known(text) to anon, authenticated;
