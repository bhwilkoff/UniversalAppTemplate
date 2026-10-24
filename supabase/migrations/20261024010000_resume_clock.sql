-- Stop, then Start, carries on where the clock stopped. Found in the live
-- Meet test of October 24, 2026: Start went back to the part's full time,
-- so a leader who paused for a question lost what had run. The leader's
-- panel now sends the start time that leaves the stopped remainder; the
-- database keeps a start in the past (within six hours) and still never
-- lets a clock start later than its own now.
create or replace function private.show_state_rules() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and (new.session_id <> old.session_id or new.cohort_id <> old.cohort_id) then
    raise exception 'The show stays with its own session.';
  end if;
  if tg_op = 'INSERT' or new.current_scene is distinct from old.current_scene then
    new.scene_started_at := case when new.current_scene is null then null else now() end;
  elsif new.scene_started_at is distinct from old.scene_started_at and new.scene_started_at is not null then
    -- A start in the past resumes a stopped clock; never later than now.
    new.scene_started_at := least(now(), greatest(new.scene_started_at, now() - interval '6 hours'));
  end if;
  if new.stage = 'answers' and not exists (
       select 1 from public.live_checks k where k.id = new.stage_ref and k.session_id = new.session_id) then
    raise exception 'Only a question asked in this session can go on its main stage.';
  end if;
  if new.stage = 'presenter' and not exists (
       select 1 from public.live_queue q where q.id = new.stage_ref and q.session_id = new.session_id) then
    raise exception 'Only work in this session''s wings can go on its main stage.';
  end if;
  new.updated_by := auth.uid();
  new.updated_at := now();
  return new;
end;
$$;
