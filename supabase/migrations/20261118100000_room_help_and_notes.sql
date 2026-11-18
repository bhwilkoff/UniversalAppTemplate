-- Breakouts that a leader can reach (Ben, November 18, 2026, after Week 3:
-- "start working on these breakout improvements"). Two things a breakout
-- room had no way to do:
--   a 'note' signal: the leader writes once and every room's panel shows it
--     while the rooms run, as Meet Plus's broadcast does;
--   a 'help' request: a room asks its leader to come, as Meet's own "Ask for
--     help" does; its body names the room.
alter table public.live_signals drop constraint live_signals_kind_check;
alter table public.live_signals add constraint live_signals_kind_check
  check (kind in ('rooms', 'together', 'card', 'stage', 'recording', 'talk', 'note'));
alter table public.live_signals drop constraint live_signals_body;
alter table public.live_signals add constraint live_signals_body check (
  case when kind in ('card', 'note') then body is not null and char_length(btrim(body)) between 1 and 200
       else body is null end);

alter table public.live_requests drop constraint live_requests_kind_check;
alter table public.live_requests add constraint live_requests_kind_check
  check (kind in ('question', 'card', 'board', 'breakouts', 'other', 'help'));
