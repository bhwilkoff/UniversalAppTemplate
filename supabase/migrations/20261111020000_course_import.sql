-- Courses come in from Minerva's Course Builder (Ben, November 10, 2026:
-- "we are going to build it out fully based upon the content that I have
-- already developed inside of Course Builder"). The course-import function
-- opens a leader's export link with itself as the import_url, Course Builder
-- posts the course there, and it arrives as a draft cohort with sessions you
-- set (DECISIONS.md, "Courses come in from Course Builder").
--
-- A part can now carry what the export holds and the add-on will run:
--   any part: show (a document or page to put on the stage, {url, name}) and
--             results_of (an earlier question part whose answers it shows)
--   question: show_tally (whether people see the counts)
--   presenter: feature (teacher, random, quiet, or group: who is featured)
--   rooms: groups (how many), sorting (random or roster), and group_docs
--          (one document per group, [{name, url}])

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
    when 'rooms' then array['prompt', 'room_scenes', 'groups', 'sorting', 'group_docs']
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

-- One import at a time per link. The function writes these with the service
-- role; the leader who started one reads it to see how it went. The nonce is
-- the import_url's secret, so only Course Builder's own post is taken.
create table public.course_imports (
  id          uuid primary key default gen_random_uuid(),
  created_by  uuid not null references public.profiles (id) on delete cascade,
  source      text not null default 'coursebuilder' check (source in ('coursebuilder')),
  course_ref  text check (course_ref is null or char_length(course_ref) <= 40),
  nonce       text not null check (nonce ~ '^[0-9a-f]{32}$'),
  state       text not null default 'waiting' check (state in ('waiting', 'received', 'done', 'failed')),
  cohort_id   uuid references public.cohorts (id) on delete set null,
  problem     text check (problem is null or char_length(problem) <= 1000),
  counts      jsonb,
  warnings    jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index course_imports_by_leader on public.course_imports (created_by, created_at desc);
alter table public.course_imports enable row level security;
create policy course_imports_read on public.course_imports for select to authenticated
  using (created_by = auth.uid());
