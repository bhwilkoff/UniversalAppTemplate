-- More of what Course Builder's lesson plans do, in the add-on (Ben, November
-- 11, 2026, on the audit's list: "All of them and you can decide on order"):
--   people  several people featured at once (show_state.featured, up to 8),
--           chosen at random, as someone quiet, or by how they voted
--   room    one breakout room's people and workbook answers, for its debrief
--   answer  one written answer, chosen by a leader, with its author's name
--           only when the leader shows it (show_state.named)
-- A learner cannot read another person's answer or another room's workbook,
-- so every panel asks on_stage() for exactly what a leader put up, and only
-- people in the cohort get it. Any part can say whom to feature and how
-- many (feature, feature_count); a question part can be asked again of an
-- earlier one (rerun_of).

alter table public.show_state add column featured uuid[] check (featured is null or cardinality(featured) between 1 and 8),
  add column named boolean not null default false;
alter table public.show_state drop constraint if exists show_state_stage_check;
alter table public.show_state add constraint show_state_stage_check
  check (stage in ('scene', 'welcome', 'answers', 'presenter', 'blank', 'path', 'rooms', 'board', 'doc', 'person', 'people', 'room', 'answer'));
alter table public.show_state drop constraint if exists show_state_ref;
alter table public.show_state add constraint show_state_ref
  check ((stage in ('answers', 'presenter', 'person', 'room', 'answer')) = (stage_ref is not null));
alter table public.show_state add constraint show_state_people check ((stage = 'people') = (featured is not null));

create or replace function private.in_cohort_as(c uuid, u uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.enrollments e where e.cohort_id = c and e.user_id = u and e.status <> 'left')
      or exists (select 1 from public.call_guests g where g.cohort_id = c and g.user_id = u)
      or exists (select 1 from public.cohort_teachers t where t.cohort_id = c and t.user_id = u);
$$;
revoke all on function private.in_cohort_as(uuid, uuid) from public;

create or replace function private.show_state_rules() returns trigger
language plpgsql security definer set search_path to '' as $$
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
  if new.stage = 'people' then
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
  if new.stage <> 'answer' then new.named := false; end if;
  new.updated_by := auth.uid();
  new.updated_at := now();
  return new;
end;
$$;

create or replace function private.show_state_event() returns trigger
language plpgsql security definer set search_path to '' as $$
begin
  if tg_op = 'INSERT' or new.current_scene is distinct from old.current_scene
     or new.stage is distinct from old.stage or new.stage_ref is distinct from old.stage_ref
     or new.featured is distinct from old.featured then
    insert into public.session_events (cohort_id, session_id, user_id, kind, detail)
    values (new.cohort_id, new.session_id, null, 'stage',
            left(case when new.stage in ('person', 'room', 'answer') then new.stage || ':' || new.stage_ref::text
                      when new.stage = 'people' then 'people:' || array_to_string(new.featured, ',')
                      else new.stage || ':' || coalesce(new.current_scene, '') end, 200));
  end if;
  return null;
end;
$$;

-- What a leader put on this session's stage that only they could read: one
-- written answer (with its author's name only when shown), or one room's
-- people and workbook answers. Anyone in the cohort may ask; it returns
-- nothing else.
create function public.on_stage(s uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  st public.show_state;
  out jsonb;
begin
  select * into st from public.show_state where session_id = s;
  if st.session_id is null or not private.in_cohort(st.cohort_id) then return null; end if;
  if st.stage = 'answer' then
    select jsonb_build_object('kind', 'answer', 'prompt', k.prompt, 'text', a.body,
             'who', case when st.named then coalesce(nullif(p.display_name, ''), p.github_login, 'Someone') end)
      into out
      from public.live_answers a join public.live_checks k on k.id = a.check_id
      left join public.profiles p on p.id = a.user_id
     where a.id = st.stage_ref;
    return out;
  end if;
  if st.stage = 'room' then
    select jsonb_build_object('kind', 'room', 'name', g.name,
             'people', coalesce((select jsonb_agg(coalesce(nullif(p.display_name, ''), p.github_login, cg.name, 'A guest') order by 1)
                                   from public.group_members gm
                                   left join public.profiles p on p.id = gm.user_id
                                   left join public.call_guests cg on cg.user_id = gm.user_id and cg.cohort_id = g.cohort_id
                                  where gm.group_id = g.id), '[]'::jsonb),
             'answers', coalesce((select jsonb_agg(jsonb_build_object('workbook', w.id, 'title', w.title, 'block', wa.block, 'value', wa.value) order by w.position, wa.block)
                                    from public.workbook_answers wa join public.workbooks w on w.id = wa.workbook_id
                                   where wa.group_id = g.id and w.session_id = s), '[]'::jsonb))
      into out
      from public.groups g where g.id = st.stage_ref;
    return out;
  end if;
  return null;
end;
$$;
revoke all on function public.on_stage(uuid) from public, anon;
grant execute on function public.on_stage(uuid) to authenticated;

-- Featuring can sit on any part, with how many to feature; a question part
-- can be asked again of an earlier one.
create or replace function private.scene_config_ok(k text, c jsonb)
returns boolean language plpgsql immutable set search_path to '' as $$
declare
  allowed text[];
  key text;
  item jsonb;
  uuid_re constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
begin
  if c is null or jsonb_typeof(c) <> 'object' then return false; end if;
  if pg_column_size(c) > 12000 then return false; end if;
  allowed := case k
    when 'talk' then array[]::text[]
    when 'break' then array[]::text[]
    when 'presenter' then array['prompt']
    when 'question' then array['prompt', 'options', 'kind', 'points', 'question_id', 'show_tally', 'rerun_of']
    when 'design' then array['template']
    when 'rooms' then array['prompt', 'room_scenes', 'groups', 'group_size', 'sorting', 'group_docs', 'workbooks']
    when 'reflection' then array['prompt']
    else null end;
  if allowed is null then return false; end if;
  allowed := allowed || array['show', 'results_of', 'feature', 'feature_count'];
  for key in select jsonb_object_keys(c) loop
    if not key = any (allowed) then return false; end if;
  end loop;
  if c ? 'prompt' and (jsonb_typeof(c->'prompt') <> 'string' or char_length(c->>'prompt') > 500) then return false; end if;
  if c ? 'template' and (jsonb_typeof(c->'template') <> 'string' or char_length(c->>'template') > 60) then return false; end if;
  if c ? 'kind' and (jsonb_typeof(c->'kind') <> 'string' or not (c->>'kind') in ('choice', 'multi', 'short', 'scale', 'words', 'rank')) then return false; end if;
  if c ? 'points' and (jsonb_typeof(c->'points') <> 'number' or (c->>'points') !~ '^([3-9]|10)$') then return false; end if;
  if c ? 'question_id' and (jsonb_typeof(c->'question_id') <> 'string' or (c->>'question_id') !~ uuid_re) then return false; end if;
  if c ? 'results_of' and (jsonb_typeof(c->'results_of') <> 'string' or (c->>'results_of') !~ uuid_re) then return false; end if;
  if c ? 'rerun_of' and (jsonb_typeof(c->'rerun_of') <> 'string' or (c->>'rerun_of') !~ uuid_re) then return false; end if;
  if c ? 'feature_count' and (jsonb_typeof(c->'feature_count') <> 'number' or (c->>'feature_count') !~ '^[1-8]$') then return false; end if;
  if c ? 'show_tally' and jsonb_typeof(c->'show_tally') <> 'boolean' then return false; end if;
  if c ? 'feature' and (jsonb_typeof(c->'feature') <> 'string' or not (c->>'feature') in ('teacher', 'random', 'quiet', 'group')) then return false; end if;
  if c ? 'sorting' and (jsonb_typeof(c->'sorting') <> 'string' or not (c->>'sorting') in ('random', 'roster')) then return false; end if;
  if c ? 'groups' and (jsonb_typeof(c->'groups') <> 'number' or (c->>'groups') !~ '^([1-9]|[1-3][0-9]|40)$') then return false; end if;
  if c ? 'group_size' and (jsonb_typeof(c->'group_size') <> 'number' or (c->>'group_size') !~ '^([1-9]|[1-3][0-9]|40)$') then return false; end if;
  if c ? 'workbooks' then
    if jsonb_typeof(c->'workbooks') <> 'array' or jsonb_array_length(c->'workbooks') > 40 then return false; end if;
    for item in select jsonb_array_elements(c->'workbooks') loop
      if jsonb_typeof(item) <> 'string' or (item #>> '{}') !~ uuid_re then return false; end if;
    end loop;
  end if;
  if c ? 'show' then
    if jsonb_typeof(c->'show') <> 'object'
       or coalesce(jsonb_typeof(c->'show'->'url'), '') <> 'string'
       or (c->'show'->>'url') !~ '^https://' or char_length(c->'show'->>'url') > 2000
       or (c->'show' ? 'name' and (jsonb_typeof(c->'show'->'name') <> 'string' or char_length(c->'show'->>'name') > 200))
       or exists (select 1 from jsonb_object_keys(c->'show') x where x not in ('url', 'name')) then
      return false;
    end if;
  end if;
  if c ? 'group_docs' then
    if jsonb_typeof(c->'group_docs') <> 'array' or jsonb_array_length(c->'group_docs') > 40 then return false; end if;
    for item in select jsonb_array_elements(c->'group_docs') loop
      if jsonb_typeof(item) <> 'object'
         or coalesce(jsonb_typeof(item->'url'), '') <> 'string' or (item->>'url') !~ '^https://' or char_length(item->>'url') > 2000
         or coalesce(jsonb_typeof(item->'name'), '') <> 'string' or char_length(item->>'name') not between 1 and 120
         or exists (select 1 from jsonb_object_keys(item) x where x not in ('name', 'url')) then
        return false;
      end if;
    end loop;
  end if;
  if c ? 'options' then
    if jsonb_typeof(c->'options') <> 'array' or jsonb_array_length(c->'options') not between 2 and 8 then return false; end if;
    for item in select jsonb_array_elements(c->'options') loop
      if jsonb_typeof(item) <> 'string' or char_length(item #>> '{}') not between 1 and 120 then return false; end if;
    end loop;
  end if;
  if c ? 'room_scenes' then
    if jsonb_typeof(c->'room_scenes') <> 'array' or jsonb_array_length(c->'room_scenes') > 12 then return false; end if;
    for item in select jsonb_array_elements(c->'room_scenes') loop
      if jsonb_typeof(item) <> 'object'
         or coalesce(jsonb_typeof(item->'title'), '') <> 'string'
         or coalesce(jsonb_typeof(item->'minutes'), '') <> 'number'
         or char_length(item->>'title') not between 1 and 120
         or (item->>'minutes')::numeric not between 1 and 120
         or exists (select 1 from jsonb_object_keys(item) x where x not in ('title', 'minutes')) then
        return false;
      end if;
    end loop;
  end if;
  return true;
end;
$$;

