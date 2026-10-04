-- The rehearsal rooms' own clock (research/notes/run-of-show-design.md,
-- milestone R6). A room runs the rooms scene's own scenes in turn, one
-- presenter at a time, and every view in the room counts down the same
-- step from the same moment: step_started_at, set by the database
-- whenever the room moves to another step or another presenter, and
-- left alone when someone asks for the teacher or says they are fine.
-- A page cannot set it, so no one's clock can be pushed ahead or back.
--
-- Only adds: a column and a trigger beside the one the room board
-- already has (migration 20261003180000), so it applies on its own.

alter table public.live_room_state add column step_started_at timestamptz;

create function private.room_step_clock() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.step is distinct from old.step or new.presenter is distinct from old.presenter then
    new.step_started_at := now();
  else
    new.step_started_at := old.step_started_at;
  end if;
  return new;
end;
$$;
revoke all on function private.room_step_clock() from public, anon, authenticated;

create trigger live_room_state_step_clock before insert or update on public.live_room_state
  for each row execute function private.room_step_clock();
