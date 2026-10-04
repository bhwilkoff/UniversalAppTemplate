-- The question bank's kinds, on the questions asked and the answers
-- given (research/notes/run-of-show-design.md, milestone R4; the bank
-- itself and what each kind is are in migration 20261004080000). It drops
-- live_checks' old two-to-six choices rule and the old answer_fits, so
-- it is applied on its own.

-- ---------------------------------------------------------------------
-- A question asked in the moment: its kind, a scale's size, and where
-- it came from
-- ---------------------------------------------------------------------

alter table public.live_checks drop constraint live_checks_choices_check;
alter table public.live_checks
  add column kind text,
  add column points smallint,
  add column question_id uuid references public.questions (id) on delete set null;
update public.live_checks set kind = case when choices is null then 'short' else 'choice' end;
alter table public.live_checks alter column kind set not null;
alter table public.live_checks add constraint live_checks_kind
  check (kind in ('choice', 'multi', 'short', 'scale', 'words', 'rank'));
alter table public.live_checks add constraint live_checks_shape
  check (private.question_shape_ok(kind, choices, points));

-- A page that does not say the kind asks the way pages always have: in
-- their own words, or one choice of several.
create function private.check_kind_default() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.kind is null then
    new.kind := case when new.choices is null then 'short' else 'choice' end;
  end if;
  return new;
end;
$$;
revoke all on function private.check_kind_default() from public, anon, authenticated;

create trigger live_checks_kind_default before insert on public.live_checks
  for each row execute function private.check_kind_default();

-- Whether anyone has answered a question yet, past the answers' own read
-- rule (a co-teacher could read them anyway, but this keeps the rule in
-- one place for whoever runs it).
create function private.check_has_answers(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.live_answers where check_id = c);
$$;
revoke all on function private.check_has_answers(uuid) from public, anon;
grant execute on function private.check_has_answers(uuid) to authenticated;

alter table public.live_answers add column value jsonb;

-- What can never change after the fact. A question asked in the moment
-- can now be edited, until the first answer; it forgets the bank
-- question it came from only when that question is deleted; the rest is
-- as before.
create or replace function private.live_keep_identity() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_table_name = 'live_queue' then
    if new.cohort_id <> old.cohort_id or new.session_id <> old.session_id or new.user_id <> old.user_id
       or new.url <> old.url or new.kind <> old.kind or new.share_id is distinct from old.share_id then
      raise exception 'Only the note and whether it has been shown can change.';
    end if;
    if new.state = 'shown' and old.state <> 'shown' then new.shown_at := now(); end if;
    if new.state = 'waiting' then new.shown_at := null; end if;
  elsif tg_table_name = 'live_checks' then
    if new.cohort_id <> old.cohort_id or new.session_id <> old.session_id
       or new.created_by is distinct from old.created_by
       or (new.question_id is distinct from old.question_id and new.question_id is not null) then
      raise exception 'A question stays in the session it was asked in.';
    end if;
    if (new.prompt <> old.prompt or new.choices is distinct from old.choices
        or new.kind <> old.kind or new.points is distinct from old.points)
       and private.check_has_answers(old.id) then
      raise exception 'Someone has answered this question, so it cannot change. Close it and ask another.';
    end if;
    if new.state = 'closed' and old.state <> 'closed' then new.closed_at := now(); end if;
    if new.state = 'open' then new.closed_at := null; end if;
  elsif tg_table_name = 'live_answers' then
    if new.check_id <> old.check_id or new.cohort_id <> old.cohort_id or new.user_id <> old.user_id then
      raise exception 'An answer can only change what it says.';
    end if;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

-- An answer must fit its question, kind by kind:
--   choice  one choice that exists
--   scale   one point on the scale
--   short   words, up to 1000 characters
--   words   a word or a few, up to 60 characters
--   multi   one or more different choices that exist, as a list
--   rank    every choice exactly once, as a list in the person's order
-- and nothing else besides.
create function private.answer_fits(c uuid, cohort uuid, pick smallint, words text, val jsonb) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  k public.live_checks;
  n int;
  picked int[];
begin
  select * into k from public.live_checks where id = c and cohort_id = cohort and state = 'open';
  if not found then return false; end if;
  n := coalesce(cardinality(k.choices), 0);
  if k.kind in ('choice', 'scale') then
    return words is null and val is null and pick between 1 and (case when k.kind = 'scale' then k.points else n end);
  end if;
  if k.kind in ('short', 'words') then
    return pick is null and val is null
      and char_length(btrim(coalesce(words, ''))) between 1 and (case when k.kind = 'words' then 60 else 1000 end);
  end if;
  if pick is not null or words is not null or val is null or jsonb_typeof(val) <> 'array' then return false; end if;
  if exists (select 1 from jsonb_array_elements(val) e where jsonb_typeof(e) <> 'number' or (e #>> '{}') !~ '^[0-9]+$') then
    return false;
  end if;
  select array_agg((e #>> '{}')::int) into picked from jsonb_array_elements(val) e;
  if picked is null or exists (select 1 from unnest(picked) p where p not between 1 and n) then return false; end if;
  if (select count(distinct p) from unnest(picked) p) <> cardinality(picked) then return false; end if;
  if k.kind = 'multi' then return cardinality(picked) between 1 and n; end if;
  if k.kind = 'rank' then return cardinality(picked) = n; end if;
  return false;
end;
$$;
revoke all on function private.answer_fits(uuid, uuid, smallint, text, jsonb) from public, anon;
grant execute on function private.answer_fits(uuid, uuid, smallint, text, jsonb) to authenticated;

drop policy live_answers_give on public.live_answers;
drop policy live_answers_change on public.live_answers;
drop function private.answer_fits(uuid, uuid, smallint, text);
create policy live_answers_give on public.live_answers for insert to authenticated
  with check (user_id = auth.uid() and private.in_cohort(cohort_id)
              and private.answer_fits(check_id, cohort_id, choice, body, value));
create policy live_answers_change on public.live_answers for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and private.answer_fits(check_id, cohort_id, choice, body, value));

-- ---------------------------------------------------------------------
-- The results, with no names: what the main stage and each view show.
-- The same rule as check_tally: the cohort's teachers always, people in
-- the cohort only when the teacher has chosen to show them. Short
-- answers are never in it, only how many there are; a teacher reads
-- those with their names, through the answers' own read rule.
--
--   { kind, total,
--     counts: how many chose each choice (choice, multi) or each point
--             (scale), in order;
--     places: each choice's average place, 1 being first (rank);
--     words:  the words given, lowercased, with how many gave each, the
--             most often first, at most thirty (words) }
-- ---------------------------------------------------------------------

create function public.check_results(c uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  k public.live_checks;
  total int;
  out jsonb;
begin
  select * into k from public.live_checks where id = c;
  if not found or not (private.teaches(k.cohort_id) or (k.show_tally and private.in_cohort(k.cohort_id))) then
    return null;
  end if;
  select count(*) into total from public.live_answers where check_id = c;
  out := jsonb_build_object('kind', k.kind, 'total', total);
  if k.kind in ('choice', 'scale') then
    out := out || jsonb_build_object('counts', (
      select coalesce(jsonb_agg((select count(*) from public.live_answers a where a.check_id = c and a.choice = i) order by i), '[]'::jsonb)
      from generate_series(1, case when k.kind = 'scale' then k.points else cardinality(k.choices) end) i));
  elsif k.kind = 'multi' then
    out := out || jsonb_build_object('counts', (
      select coalesce(jsonb_agg((select count(*) from public.live_answers a where a.check_id = c and a.value @> to_jsonb(i)) order by i), '[]'::jsonb)
      from generate_series(1, cardinality(k.choices)) i));
  elsif k.kind = 'rank' then
    out := out || jsonb_build_object('places', (
      select coalesce(jsonb_agg((
        select round(avg(p.place)::numeric, 2)
        from public.live_answers a, jsonb_array_elements(a.value) with ordinality as p(choice, place)
        where a.check_id = c and (p.choice #>> '{}')::int = i) order by i), '[]'::jsonb)
      from generate_series(1, cardinality(k.choices)) i));
  elsif k.kind = 'words' then
    out := out || jsonb_build_object('words', (
      select coalesce(jsonb_agg(jsonb_build_object('word', w, 'count', n) order by n desc, w), '[]'::jsonb)
      from (select lower(btrim(body)) w, count(*) n from public.live_answers
            where check_id = c and body is not null group by 1 order by 2 desc, 1 limit 30) x));
  end if;
  return out;
end;
$$;
revoke all on function public.check_results(uuid) from public, anon;
grant execute on function public.check_results(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- A question scene in the run of show (R2) may now name its kind, its
-- scale, and the bank question it was made from. A copy of the words
-- stays in the scene, so the cohort's run of show reads the same as
-- before, and the bank stays the teachers' alone.
-- ---------------------------------------------------------------------

create or replace function private.scene_config_ok(k text, c jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare
  allowed text[];
  key text;
  item jsonb;
begin
  if c is null or jsonb_typeof(c) <> 'object' then return false; end if;
  if pg_column_size(c) > 8000 then return false; end if;
  allowed := case k
    when 'talk' then array[]::text[]
    when 'break' then array[]::text[]
    when 'presenter' then array['prompt']
    when 'question' then array['prompt', 'options', 'kind', 'points', 'question_id']
    when 'design' then array['template']
    when 'rooms' then array['prompt', 'room_scenes']
    when 'reflection' then array['prompt']
    else null end;
  if allowed is null then return false; end if;
  for key in select jsonb_object_keys(c) loop
    if not key = any (allowed) then return false; end if;
  end loop;
  if c ? 'prompt' and (jsonb_typeof(c->'prompt') <> 'string' or char_length(c->>'prompt') > 500) then return false; end if;
  if c ? 'template' and (jsonb_typeof(c->'template') <> 'string' or char_length(c->>'template') > 60) then return false; end if;
  if c ? 'kind' and (jsonb_typeof(c->'kind') <> 'string' or not (c->>'kind') in ('choice', 'multi', 'short', 'scale', 'words', 'rank')) then return false; end if;
  if c ? 'points' and (jsonb_typeof(c->'points') <> 'number' or (c->>'points') !~ '^([3-9]|10)$') then return false; end if;
  if c ? 'question_id' and (jsonb_typeof(c->'question_id') <> 'string'
       or (c->>'question_id') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') then return false; end if;
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
