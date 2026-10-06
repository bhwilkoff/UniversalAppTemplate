-- The rerun (R17; research/notes/active-learning-notes.md). From the
-- Active Learning Forum chapter: "the same poll can immediately be rerun,
-- allowing those students who changed their mind to be identified
-- quickly and called on to explain their reasons." A question asked
-- again names the one it repeats, so the main stage can show how the
-- answers moved (counts only) and the teacher can see who changed.
--
-- A rerun repeats a question of the same session; nothing else about
-- who may ask a question changes (live_checks' own rules still apply).

alter table public.live_checks add column rerun_of uuid references public.live_checks (id) on delete set null;

create function private.rerun_rules() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.rerun_of is not null and not exists (
    select 1 from public.live_checks k where k.id = new.rerun_of and k.session_id = new.session_id and k.id <> new.id
  ) then
    raise exception 'A question can only be asked again in its own session.';
  end if;
  return new;
end;
$$;
revoke all on function private.rerun_rules() from public, anon, authenticated;

create trigger live_checks_rerun before insert or update of rerun_of on public.live_checks
  for each row execute function private.rerun_rules();
