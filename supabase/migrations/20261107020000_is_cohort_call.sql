-- A stranger's panel asks one thing before anything else: is this call a
-- cohort's? It answers yes or no and says nothing of which cohort, so a person
-- in any other call reaches an open room with no account made for them
-- (ADDON-DESIGN.md, "Open rooms"). It matches what join_call accepts.
create or replace function public.is_cohort_call(code text) returns boolean
language plpgsql stable security definer set search_path to 'public' as $$
declare
  k text := lower(trim(code));
begin
  if k is null or k !~ '^[a-z]{3}-[a-z]{4}-[a-z]{3}$' then return false; end if;
  return exists (select 1 from public.sessions s join public.cohorts co on co.id = s.cohort_id
                  where s.meet_url ilike '%' || k || '%' and co.status in ('open', 'running'))
      or exists (select 1 from public.groups g join public.cohorts co on co.id = g.cohort_id
                  where g.meet_url ilike '%' || k || '%' and co.status in ('open', 'running'));
end;
$$;
revoke all on function public.is_cohort_call(text) from public;
grant execute on function public.is_cohort_call(text) to anon, authenticated;
