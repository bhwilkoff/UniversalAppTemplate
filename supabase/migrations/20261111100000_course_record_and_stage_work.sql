-- Drafts stay with their leaders, a course keeps everything Course Builder
-- sent, sessions carry what they practice and what comes after, and a
-- pre-class answer can go on the stage (Ben, November 11, 2026: "Learners
-- should never be able to join a draft cohort", "I would like to preserve
-- everything from the export", and yes to the audit's inspirations).

-- A draft's session can run in a call for its leaders only: nobody else in
-- that call follows it or becomes its guest.
create or replace function private.call_cohort(k text) returns uuid
language plpgsql stable security definer set search_path to 'public' as $$
declare
  c uuid;
begin
  select r.cohort_id into c from public.call_runs r join public.cohorts co on co.id = r.cohort_id
   where r.code = k and r.ends_at > now() and (co.status <> 'draft' or private.teaches(co.id));
  if c is not null then return c; end if;
  select s.cohort_id into c from public.sessions s join public.cohorts co on co.id = s.cohort_id
   where s.meet_url ilike '%' || k || '%' and co.status in ('open', 'running')
   order by s.starts_at desc nulls last limit 1;
  if c is not null then return c; end if;
  select g.cohort_id into c from public.groups g join public.cohorts co on co.id = g.cohort_id
   where g.meet_url ilike '%' || k || '%' and co.status in ('open', 'running') limit 1;
  return c;
end;
$$;
revoke all on function private.call_cohort(text) from public;

-- Everything a course export carried, kept with the cohort it became, for
-- its leaders: outcomes, grading weights, layouts, filters, and what no page
-- uses yet. Only the import function writes it.
create table public.course_sources (
  cohort_id    uuid primary key references public.cohorts (id) on delete cascade,
  source       text not null default 'coursebuilder' check (source in ('coursebuilder')),
  course_ref   text check (course_ref is null or char_length(course_ref) <= 40),
  export       jsonb not null,
  received_at  timestamptz not null default now()
);
alter table public.course_sources enable row level security;
create policy course_sources_read on public.course_sources for select to authenticated
  using (private.teaches(cohort_id));

-- An import can bring a new export into a course already here, keeping its
-- parts as they are.
alter table public.course_imports add column refresh_of uuid references public.cohorts (id) on delete cascade;

-- What a cohort's sessions practice (from the course's outcomes, never
-- scored), and what each session asks of people afterward.
alter table public.cohorts add column outcomes jsonb not null default '[]'::jsonb
  check (jsonb_typeof(outcomes) = 'array' and jsonb_array_length(outcomes) <= 300 and pg_column_size(outcomes) <= 120000);
alter table public.sessions add column after text check (after is null or char_length(after) <= 20000),
  add column outcomes jsonb not null default '[]'::jsonb
  check (jsonb_typeof(outcomes) = 'array' and jsonb_array_length(outcomes) <= 60);

-- A pre-class answer on the stage: stage 'work', a workbook answer from one
-- of this session's own workbooks, its author named only when shown. A
-- workbook answer gets its own id so the stage can point at one.
alter table public.workbook_answers add column id uuid not null default gen_random_uuid();
alter table public.workbook_answers add constraint workbook_answers_id unique (id);
alter table public.show_state drop constraint if exists show_state_stage_check;
alter table public.show_state add constraint show_state_stage_check
  check (stage in ('scene', 'welcome', 'answers', 'presenter', 'blank', 'path', 'rooms', 'board', 'doc', 'person', 'people', 'room', 'answer', 'work'));
alter table public.show_state drop constraint if exists show_state_ref;
alter table public.show_state add constraint show_state_ref
  check ((stage in ('answers', 'presenter', 'person', 'room', 'answer', 'work')) = (stage_ref is not null));

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
$$;

create or replace function public.on_stage(s uuid) returns jsonb
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
  if st.stage = 'work' then
    select jsonb_build_object('kind', 'work', 'title', w.title, 'workbook', w.id,
             'block', (select b from jsonb_array_elements(w.blocks) b where b->>'key' = a.block limit 1),
             'value', a.value,
             'who', case when st.named then coalesce(nullif(p.display_name, ''), p.github_login, cg.name, 'Someone') end)
      into out
      from public.workbook_answers a join public.workbooks w on w.id = a.workbook_id
      left join public.profiles p on p.id = a.user_id
      left join public.call_guests cg on cg.user_id = a.user_id and cg.cohort_id = w.cohort_id
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

-- A call running someone's draft is still taken: another leader cannot run
-- their own session over it, though they cannot see whose it is.
create or replace function public.run_in_call(code text, session uuid) returns uuid
language plpgsql security definer set search_path to 'public' as $$
declare
  k text := lower(trim(code));
  c uuid;
  other uuid;
begin
  if auth.uid() is null or k !~ '^[a-z]{3}-[a-z]{4}-[a-z]{3}$' then raise exception 'That is not a Meet call.'; end if;
  select s.cohort_id into c from public.sessions s where s.id = session;
  if c is null then raise exception 'That session does not exist.'; end if;
  if not private.teaches(c) then raise exception 'Only a leader of this cohort can do this.'; end if;
  -- A run this leader set earlier in the call can be replaced by any cohort they lead.
  delete from public.call_runs r where r.code = k and r.set_by = auth.uid() and r.cohort_id <> c;
  select r.cohort_id into other from public.call_runs r where r.code = k and r.ends_at > now();
  if other is null then other := private.call_cohort(k); end if;
  if other is not null and other <> c then raise exception 'This call belongs to another cohort.'; end if;
  insert into public.call_runs (code, cohort_id, session_id, set_by)
  values (k, c, session, auth.uid())
  on conflict on constraint call_runs_pkey do update
    set cohort_id = excluded.cohort_id, session_id = excluded.session_id, set_by = excluded.set_by,
        set_at = now(), ends_at = now() + interval '3 hours';
  return c;
end;
$$;
