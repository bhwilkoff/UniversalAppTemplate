-- Workbooks (Ben, November 11, 2026: asked how Minerva's workbooks should work
-- here, he chose "Built into Human Shaped"). A session's workbook is a list of
-- blocks: instructions, free responses, multiple choice (one answer or
-- several), fill-in tables, and a link to hand in. An individual workbook is
-- answered by each person on the session's Before; a group workbook by each
-- breakout room together, in the add-on. A breakout part names the group
-- workbooks it deals out to its rooms (scenes.config.workbooks). Courses from
-- Course Builder bring theirs (DECISIONS.md, "Workbooks").

create table public.workbooks (
  id          uuid primary key default gen_random_uuid(),
  cohort_id   uuid not null references public.cohorts (id) on delete cascade,
  session_id  uuid not null references public.sessions (id) on delete cascade,
  kind        text not null default 'individual' check (kind in ('individual', 'group')),
  position    smallint not null default 0 check (position between 0 and 99),
  title       text not null check (char_length(title) between 1 and 200),
  blocks      jsonb not null default '[]'::jsonb check (jsonb_typeof(blocks) = 'array' and jsonb_array_length(blocks) <= 120 and pg_column_size(blocks) <= 400000),
  source      jsonb check (source is null or (jsonb_typeof(source) = 'object' and pg_column_size(source) <= 2000)),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index workbooks_by_session on public.workbooks (session_id, position);
alter table public.workbooks enable row level security;

create function private.workbook_cohort() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.sessions s where s.id = new.session_id and s.cohort_id = new.cohort_id) then
    raise exception 'That session is not in that cohort.';
  end if;
  if tg_op = 'UPDATE' and (new.session_id <> old.session_id or new.cohort_id <> old.cohort_id) then
    raise exception 'A workbook stays with its session.';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger workbook_cohort before insert or update on public.workbooks
  for each row execute function private.workbook_cohort();

create policy workbooks_read on public.workbooks for select to authenticated using (private.in_cohort(cohort_id));
create policy workbooks_write on public.workbooks for insert to authenticated with check (private.teaches(cohort_id));
create policy workbooks_change on public.workbooks for update to authenticated using (private.teaches(cohort_id)) with check (private.teaches(cohort_id));
create policy workbooks_remove on public.workbooks for delete to authenticated using (private.teaches(cohort_id));
grant select, insert, update, delete on public.workbooks to authenticated;

-- Whether this person is in a group, a breakout room's guests included.
create function private.member_of_group(g uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.group_members gm join public.groups gr on gr.id = gm.group_id
    where gm.group_id = g and (gm.user_id = auth.uid() or gm.user_id = private.claimed_member(gr.cohort_id)));
$$;
revoke all on function private.member_of_group(uuid) from public;
grant execute on function private.member_of_group(uuid) to authenticated;

-- One answer per block: a person's own for an individual workbook, a room's
-- for a group one. The value is { text } or { picks: [n] } or { cells: [[text]] }.
create table public.workbook_answers (
  workbook_id uuid not null references public.workbooks (id) on delete cascade,
  cohort_id   uuid not null references public.cohorts (id) on delete cascade,
  user_id     uuid references public.profiles (id) on delete cascade,
  group_id    uuid references public.groups (id) on delete cascade,
  block       text not null check (block ~ '^[a-z0-9-]{1,40}$'),
  value       jsonb not null check (jsonb_typeof(value) = 'object' and pg_column_size(value) <= 20000),
  updated_by  uuid references public.profiles (id) on delete set null,
  updated_at  timestamptz not null default now(),
  check ((user_id is null) <> (group_id is null))
);
create unique index workbook_answers_person on public.workbook_answers (workbook_id, user_id, block) where user_id is not null;
create unique index workbook_answers_group on public.workbook_answers (workbook_id, group_id, block) where group_id is not null;
alter table public.workbook_answers enable row level security;

create function private.workbook_answer_rules() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  w public.workbooks;
begin
  select * into w from public.workbooks where id = new.workbook_id;
  if w.id is null or w.cohort_id <> new.cohort_id then raise exception 'That workbook is not in that cohort.'; end if;
  if (w.kind = 'individual') <> (new.user_id is not null) then raise exception 'An individual workbook is answered by a person, a group workbook by a room.'; end if;
  if new.group_id is not null and not exists (select 1 from public.groups g where g.id = new.group_id and g.cohort_id = new.cohort_id) then
    raise exception 'That room is not in this cohort.';
  end if;
  if tg_op = 'UPDATE' and (new.workbook_id <> old.workbook_id or new.user_id is distinct from old.user_id or new.group_id is distinct from old.group_id or new.block <> old.block) then
    raise exception 'An answer stays with its block.';
  end if;
  new.updated_by := auth.uid();
  new.updated_at := now();
  return new;
end $$;
create trigger workbook_answer_rules before insert or update on public.workbook_answers
  for each row execute function private.workbook_answer_rules();

create policy workbook_answers_read on public.workbook_answers for select to authenticated
  using (private.teaches(cohort_id)
         or (user_id is not null and (user_id = auth.uid() or user_id = private.claimed_member(cohort_id)))
         or (group_id is not null and private.member_of_group(group_id)));
create policy workbook_answers_write on public.workbook_answers for insert to authenticated
  with check (private.in_cohort(cohort_id) and (
    (user_id is not null and (user_id = auth.uid() or user_id = private.claimed_member(cohort_id)))
    or (group_id is not null and private.member_of_group(group_id))));
create policy workbook_answers_change on public.workbook_answers for update to authenticated
  using ((user_id is not null and (user_id = auth.uid() or user_id = private.claimed_member(cohort_id)))
         or (group_id is not null and private.member_of_group(group_id)))
  with check (private.in_cohort(cohort_id));
create policy agents_cannot_insert on public.workbook_answers as restrictive for insert to authenticated with check (private.not_an_agent());
create policy agents_cannot_update on public.workbook_answers as restrictive for update to authenticated using (private.not_an_agent());
grant select, insert, update on public.workbook_answers to authenticated;

-- A session with anyone's workbook answers stays (with session_keeps_work).
create or replace function private.session_keeps_work() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.live_checks k join public.live_answers a on a.check_id = k.id where k.session_id = old.id)
     or exists (select 1 from public.prep_answers p where p.session_id = old.id)
     or exists (select 1 from public.shares sh where sh.session_id = old.id)
     or exists (select 1 from public.session_talk t where t.session_id = old.id)
     or exists (select 1 from public.workbooks w join public.workbook_answers a on a.workbook_id = w.id where w.session_id = old.id) then
    raise exception 'This session has people''s work in it, so it stays.';
  end if;
  return old;
end;
$$;

-- A breakout part names the group workbooks it deals out to its rooms, in turn.
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
    when 'presenter' then array['prompt', 'feature']
    when 'question' then array['prompt', 'options', 'kind', 'points', 'question_id', 'show_tally']
    when 'design' then array['template']
    when 'rooms' then array['prompt', 'room_scenes', 'groups', 'group_size', 'sorting', 'group_docs', 'workbooks']
    when 'reflection' then array['prompt']
    else null end;
  if allowed is null then return false; end if;
  allowed := allowed || array['show', 'results_of'];
  for key in select jsonb_object_keys(c) loop
    if not key = any (allowed) then return false; end if;
  end loop;
  if c ? 'prompt' and (jsonb_typeof(c->'prompt') <> 'string' or char_length(c->>'prompt') > 500) then return false; end if;
  if c ? 'template' and (jsonb_typeof(c->'template') <> 'string' or char_length(c->>'template') > 60) then return false; end if;
  if c ? 'kind' and (jsonb_typeof(c->'kind') <> 'string' or not (c->>'kind') in ('choice', 'multi', 'short', 'scale', 'words', 'rank')) then return false; end if;
  if c ? 'points' and (jsonb_typeof(c->'points') <> 'number' or (c->>'points') !~ '^([3-9]|10)$') then return false; end if;
  if c ? 'question_id' and (jsonb_typeof(c->'question_id') <> 'string' or (c->>'question_id') !~ uuid_re) then return false; end if;
  if c ? 'results_of' and (jsonb_typeof(c->'results_of') <> 'string' or (c->>'results_of') !~ uuid_re) then return false; end if;
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

