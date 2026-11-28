-- Copying a session's plan copies the whole plan (Ben, November 28, 2026:
-- "a fully functional course/lesson builder"). Until now copy_scenes copied
-- each part's kind, words, and settings but not its slides, its purpose, or
-- the group workbooks its rooms answer, and a part that pointed at an earlier
-- part (an earlier question's answers, asking it again) still pointed into
-- the old session. Now the parts keep their slides (scene_decks and
-- scenes.slides) and purpose, the group workbooks a part names come along as
-- this session's own, and pointers follow to the copies. Pictures live in
-- storage, which SQL cannot copy; the page copies them after (show-builder).

create or replace function public.copy_scenes(from_session uuid, to_session uuid) returns int
language plpgsql security definer set search_path = public as $$
declare
  from_c uuid;
  to_c uuid;
  r record;
  w record;
  new_id uuid;
  smap jsonb := '{}'::jsonb;
  wmap jsonb := '{}'::jsonb;
  n int := 0;
begin
  if not private.not_an_agent() then raise exception 'An agent can read the run of show but not change it.'; end if;
  select cohort_id into from_c from public.sessions where id = from_session;
  select cohort_id into to_c from public.sessions where id = to_session;
  if from_c is null or to_c is null or not private.teaches(from_c) or not private.teaches(to_c) then
    raise exception 'Only a teacher of both sessions can copy a run of show.';
  end if;
  if from_session = to_session then raise exception 'Choose another session to copy from.'; end if;
  if exists (select 1 from public.scenes where session_id = to_session) then
    raise exception 'This session already has a run of show. Remove its scenes first to copy another.';
  end if;

  for w in
    select wb.* from public.workbooks wb
     where wb.session_id = from_session
       and wb.id::text in (select jsonb_array_elements_text(s.config->'workbooks') from public.scenes s
                            where s.session_id = from_session and jsonb_typeof(s.config->'workbooks') = 'array')
     order by wb.position
  loop
    insert into public.workbooks (cohort_id, session_id, kind, position, title, blocks)
    values (to_c, to_session, w.kind, w.position, w.title, w.blocks)
    returning id into new_id;
    wmap := wmap || jsonb_build_object(w.id::text, new_id::text);
  end loop;

  for r in select * from public.scenes where session_id = from_session order by position loop
    insert into public.scenes (cohort_id, session_id, position, kind, title, minutes, body, config, slides, goal)
    values (to_c, to_session, r.position, r.kind, r.title, r.minutes, r.body,
            r.config - 'results_of' - 'rerun_of' - 'workbooks', r.slides, r.goal)
    returning id into new_id;
    smap := smap || jsonb_build_object(r.id::text, new_id::text);
    insert into public.scene_notes (scene_id, cohort_id, body)
      select new_id, to_c, sn.body from public.scene_notes sn where sn.scene_id = r.id;
    insert into public.scene_decks (scene_id, cohort_id, body, updated_by)
      select new_id, to_c, d.body, auth.uid() from public.scene_decks d where d.scene_id = r.id;
    n := n + 1;
  end loop;

  for r in select * from public.scenes
            where session_id = from_session and (config ? 'results_of' or config ? 'rerun_of' or config ? 'workbooks') loop
    update public.scenes set config = config
      || case when smap ? (r.config->>'results_of') then jsonb_build_object('results_of', smap->>(r.config->>'results_of')) else '{}'::jsonb end
      || case when smap ? (r.config->>'rerun_of') then jsonb_build_object('rerun_of', smap->>(r.config->>'rerun_of')) else '{}'::jsonb end
      || case when jsonb_typeof(r.config->'workbooks') = 'array' then jsonb_build_object('workbooks',
           (select coalesce(jsonb_agg(coalesce(wmap->>x, x)), '[]'::jsonb) from jsonb_array_elements_text(r.config->'workbooks') x))
         else '{}'::jsonb end
     where id = (smap->>(r.id::text))::uuid;
  end loop;

  return n;
end;
$$;
revoke all on function public.copy_scenes(uuid, uuid) from public, anon;
grant execute on function public.copy_scenes(uuid, uuid) to authenticated;
