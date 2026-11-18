-- A screen shared onto the stage (Ben, November 18, 2026: "make it so that
-- the stage itself simply converts from a slide to the app that is being
-- demoed or the screen share that someone requests to do"). The learner's
-- /share/ window captures their screen and streams it peer to peer to each
-- person's stage; the queue row is how the leader sees it is ready and puts it
-- up, like an app. Its url is https://humanshaped.org/share/?screen=<uuid>,
-- the name of the stream's signaling channel.
alter table public.live_queue drop constraint live_queue_kind_check;
alter table public.live_queue add constraint live_queue_kind_check
  check (kind in ('app', 'commit', 'issue', 'pull', 'discussion', 'repo', 'share', 'link', 'screen'));
