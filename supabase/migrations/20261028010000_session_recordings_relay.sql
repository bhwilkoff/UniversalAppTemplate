-- Session recordings play on the session page through the video relay
-- (Ben, October 28, 2026: "We want the videos to be able to be watched by
-- people within the cohort. The sharing and video playback should work
-- automatically."). Drive's own player refused a viewer who was not signed
-- in, the same limit exchange videos hit, so the recorder's Drive link is
-- played the way exchange videos are. The relay asks only this function, so
-- it now also says yes for a file that is a session's recording. It still
-- answers yes or no and nothing else; who may see the session page, and so
-- the file's id, stays with sessions_read (the cohort and its leaders).

create or replace function public.exchange_video_known(drive_file_id text)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.exchange_posts p where p.drive_file_id = exchange_video_known.drive_file_id)
      or exists (select 1 from public.sessions s
                  where substring(s.recording_url from '^https://drive\.google\.com/file/d/([A-Za-z0-9_-]{10,200})') = exchange_video_known.drive_file_id);
$$;

revoke execute on function public.exchange_video_known(text) from public;
grant execute on function public.exchange_video_known(text) to anon, authenticated;
