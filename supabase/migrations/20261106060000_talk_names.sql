-- The name on someone's Meet tile can differ from their name here: a leader
-- signed in as the host account, or a learner whose GitHub login is all the
-- site knows. A leader says who it is once, and it holds for the cohort.
create table public.talk_names (
  cohort_id uuid not null references public.cohorts (id) on delete cascade,
  label     text not null check (char_length(label) between 1 and 80),
  user_id   uuid not null references public.profiles (id) on delete cascade,
  primary key (cohort_id, label)
);
alter table public.talk_names enable row level security;
grant select on public.talk_names to authenticated;
create policy talk_names_read on public.talk_names for select to authenticated
  using (private.teaches(cohort_id));

-- Says who a name on a tile is, here and in this cohort's other sessions.
create function public.name_speaker(s uuid, label text, member uuid) returns int
language plpgsql security definer set search_path to '' as $$
#variable_conflict use_column
declare c uuid; n int;
begin
  select cohort_id into c from public.sessions where id = s;
  if c is null or not private.teaches(c) then raise exception 'Only a leader of this cohort can do this.'; end if;
  if not exists (select 1 from public.enrollments e where e.cohort_id = c and e.user_id = member)
     and not exists (select 1 from public.cohort_teachers t where t.cohort_id = c and t.user_id = member) then
    raise exception 'That person is not in this cohort.';
  end if;
  insert into public.talk_names (cohort_id, label, user_id) values (c, name_speaker.label, member)
    on conflict (cohort_id, label) do update set user_id = excluded.user_id;
  update public.session_talk t set user_id = member, name = null
    where t.cohort_id = c and t.user_id is null and t.name = name_speaker.label;
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke execute on function public.name_speaker(uuid, text, uuid) from public, anon;
grant execute on function public.name_speaker(uuid, text, uuid) to authenticated;
