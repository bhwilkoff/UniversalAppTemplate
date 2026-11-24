-- When someone deletes their account, what they put on a board stays and
-- their name does not (the privacy page's promise; Ben, November 24, 2026:
-- names stay on notes while a cohort runs, and go when the account does).
--
-- Two things were wrong. A note has carried its writer's name and account id
-- since notes became one card, and a vote its voter's, and nothing took them
-- off. And the guards on boards, rooms' workbooks, and what a leader runs a
-- session with each undid (or refused) the column an account's deletion
-- empties, so anyone who had opened a board, drawn on one last, written in a
-- room's workbook, or led a session could not delete their account at all.

-- True when all that changed is who did it, emptied because that account is
-- gone. A guard lets such a row through as it is.
create function private.only_forgets(was jsonb, now_is jsonb) returns boolean
language sql stable security definer set search_path = '' as $$
  with changed as (
    select o.key, o.value as old_value, now_is -> o.key as new_value
    from jsonb_each(was) o where now_is -> o.key is distinct from o.value
  )
  select exists (select 1 from changed) and not exists (
    select 1 from changed c
    where c.key not in ('created_by', 'updated_by', 'saved_by', 'presenter', 'via_guest')
      or jsonb_typeof(c.new_value) is distinct from 'null'
      or exists (select 1 from auth.users u where u.id::text = c.old_value #>> '{}'));
$$;
revoke all on function private.only_forgets(jsonb, jsonb) from public, anon;
grant execute on function private.only_forgets(jsonb, jsonb) to authenticated;

-- The same first line in every guard on a column an account's deletion empties.
do $do$
declare
  f text;
  was text;
  made text;
begin
  foreach f in array array['live_keep_identity', 'live_signal_rules', 'room_state_keep', 'room_step_clock', 'scene_note_rules',
                           'scene_rules', 'session_note_rules', 'show_state_rules', 'workbook_answer_rules'] loop
    was := pg_get_functiondef(format('private.%I()', f)::regprocedure);
    made := regexp_replace(was, E'\nbegin\n',
      E'\nbegin\n  if tg_op = ''UPDATE'' then\n    if private.only_forgets(to_jsonb(old), to_jsonb(new)) then return new; end if;\n  end if;\n');
    if made = was then raise exception 'private.% was not changed', f; end if;
    execute made;
  end loop;
end
$do$;

-- Notes lose the name and id of anyone whose account is gone, and their votes
-- leave with them. A page left open goes on sending what it has, so this runs
-- on every save, not only when the account goes.
create function private.board_without(elements jsonb, gone uuid default null) returns jsonb
language sql stable security definer set search_path = '' as $$
  with e as (
    select x.el, x.n, x.el -> 'customData' ->> 'by' as by
    from jsonb_array_elements(coalesce(elements, '[]'::jsonb)) with ordinality x(el, n)
  ), left_us as (
    select b.by from (select distinct by from e where by is not null) b
    where b.by ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and (b.by = gone::text or not exists (select 1 from auth.users u where u.id = b.by::uuid))
  )
  select coalesce(jsonb_agg(
    case when e.by in (select by from left_us) then jsonb_set(e.el, '{customData}', (e.el -> 'customData') - 'by' - 'name') else e.el end
    order by e.n), '[]'::jsonb)
  from e
  where not (e.by in (select by from left_us) and e.el -> 'customData' ? 'vote')
    or e.by is null;
$$;
revoke all on function private.board_without(jsonb, uuid) from public, anon;
grant execute on function private.board_without(jsonb, uuid) to authenticated;

create or replace function private.board_keep() returns trigger
language plpgsql set search_path = '' as $$
begin
  if private.only_forgets(to_jsonb(old), to_jsonb(new)) then return new; end if;
  if new.cohort_id <> old.cohort_id or new.session_id <> old.session_id
     or new.group_id is distinct from old.group_id or new.created_by is distinct from old.created_by
     or new.created_at <> old.created_at then
    raise exception 'A board stays with its session and group.';
  end if;
  if (new.locked <> old.locked or new.generation <> old.generation) and not private.teaches(old.cohort_id) then
    raise exception 'Only a teacher of this cohort can lock or clear the board.';
  end if;
  if new.generation <> old.generation then
    if new.generation <> old.generation + 1 or jsonb_array_length(new.scene -> 'elements') <> 0 then
      raise exception 'Clearing a board empties it and starts the next generation.';
    end if;
  end if;
  new.scene := jsonb_set(new.scene, '{elements}', private.board_without(new.scene -> 'elements'));
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;
revoke all on function private.board_keep() from public, anon, authenticated;

create function private.forget_on_boards() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.boards b
    set scene = jsonb_set(b.scene, '{elements}', private.board_without(b.scene -> 'elements', old.id))
    where b.scene::text like '%' || old.id::text || '%';
  return old;
end;
$$;
revoke all on function private.forget_on_boards() from public, anon, authenticated;

create trigger on_account_gone_forget_boards
  before delete on auth.users
  for each row execute function private.forget_on_boards();
