-- Apps side by side (Ben, November 11, 2026, from the Forum study: "a part
-- can ask for apps side by side to compare two or three learners' builds").
-- The stage 'apps' features two or three people, as 'people' does, and each
-- panel frames their own apps from the cohort's enrollments.
alter table public.show_state drop constraint if exists show_state_stage_check;
alter table public.show_state add constraint show_state_stage_check
  check (stage in ('scene', 'welcome', 'answers', 'presenter', 'blank', 'path', 'rooms', 'board', 'doc', 'person', 'people', 'room', 'answer', 'work', 'apps'));
alter table public.show_state drop constraint if exists show_state_people;
alter table public.show_state add constraint show_state_people check ((stage in ('people', 'apps')) = (featured is not null));

CREATE OR REPLACE FUNCTION private.show_state_rules()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  p uuid;
begin
  if tg_op = 'UPDATE' and (new.session_id <> old.session_id or new.cohort_id <> old.cohort_id) then
    raise exception 'The show stays with its own session.';
  end if;
  if tg_op = 'INSERT' or new.current_scene is distinct from old.current_scene then
    new.scene_started_at := case when new.current_scene is null then null else now() end;
  elsif new.scene_started_at is distinct from old.scene_started_at and new.scene_started_at is not null then
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
  if new.stage = 'person' and not private.in_cohort_as(new.cohort_id, new.stage_ref) then
    raise exception 'Only someone in this cohort can be featured.';
  end if;
  if new.stage in ('people', 'apps') then
    foreach p in array new.featured loop
      if not private.in_cohort_as(new.cohort_id, p) then raise exception 'Only people in this cohort can be featured.'; end if;
    end loop;
  else
    new.featured := null;
  end if;
  if new.stage = 'room' and not exists (select 1 from public.groups g where g.id = new.stage_ref and g.cohort_id = new.cohort_id) then
    raise exception 'Only a room of this cohort can go on its main stage.';
  end if;
  if new.stage = 'answer' and not exists (
       select 1 from public.live_answers a join public.live_checks k on k.id = a.check_id
        where a.id = new.stage_ref and k.session_id = new.session_id) then
    raise exception 'Only an answer given in this session can go on its main stage.';
  end if;
  if new.stage = 'work' and not exists (
       select 1 from public.workbook_answers a join public.workbooks w on w.id = a.workbook_id
        where a.id = new.stage_ref and w.session_id = new.session_id and a.user_id is not null) then
    raise exception 'Only someone''s answer to this session''s own workbook can go on its main stage.';
  end if;
  if new.stage not in ('answer', 'work') then new.named := false; end if;
  new.updated_by := auth.uid();
  new.updated_at := now();
  return new;
end;
$function$
;
