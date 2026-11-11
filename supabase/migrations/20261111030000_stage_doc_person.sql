-- Two more things a leader can put on every main stage, for courses brought in
-- from Course Builder (DECISIONS.md, "Courses come in from Course Builder"):
--   doc     the current part's document (scenes.config.show), framed
--   person  someone in the cohort, featured by name: chosen at random or as
--           someone quiet so far (Ben, November 10, 2026: "Quiet student
--           should function based upon any data that we can actually use")
-- A featured person is recorded in session_events as person:<their id>, so
-- the next pick can leave out who has already been featured.

alter table public.show_state drop constraint if exists show_state_stage_check;
alter table public.show_state add constraint show_state_stage_check
  check (stage in ('scene', 'welcome', 'answers', 'presenter', 'blank', 'path', 'rooms', 'board', 'doc', 'person'));
alter table public.show_state drop constraint if exists show_state_ref;
alter table public.show_state add constraint show_state_ref
  check ((stage in ('answers', 'presenter', 'person')) = (stage_ref is not null));

create or replace function private.show_state_rules() returns trigger
language plpgsql set search_path to '' as $$
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
  if new.stage = 'person' and not (
       exists (select 1 from public.enrollments e where e.cohort_id = new.cohort_id and e.user_id = new.stage_ref and e.status <> 'left')
       or exists (select 1 from public.call_guests g where g.cohort_id = new.cohort_id and g.user_id = new.stage_ref)
       or exists (select 1 from public.cohort_teachers t where t.cohort_id = new.cohort_id and t.user_id = new.stage_ref)) then
    raise exception 'Only someone in this cohort can be featured.';
  end if;
  new.updated_by := auth.uid();
  new.updated_at := now();
  return new;
end;
$$;

create or replace function private.show_state_event() returns trigger
language plpgsql security definer set search_path to '' as $$
begin
  if tg_op = 'INSERT' or new.current_scene is distinct from old.current_scene
     or new.stage is distinct from old.stage or new.stage_ref is distinct from old.stage_ref then
    insert into public.session_events (cohort_id, session_id, user_id, kind, detail)
    values (new.cohort_id, new.session_id, null, 'stage',
            left(case when new.stage = 'person' then 'person:' || new.stage_ref::text
                      else new.stage || ':' || coalesce(new.current_scene, '') end, 200));
  end if;
  return null;
end;
$$;
