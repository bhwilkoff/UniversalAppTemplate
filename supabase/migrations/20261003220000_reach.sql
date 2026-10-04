-- Reaching a person who is not on the site (research/notes/reach-notes.md,
-- G4). COURSE.md: "within two days of a missed session, or a week with no
-- bring-back, the teacher writes to that person privately." The hub can
-- only hold a note until they come back, so each person may choose, on
-- /account/, two separate things, both off until they turn them on:
--
-- - their teachers may email them, from the teacher's own mail, at the
--   address they give here (not the calendar one, which was given for
--   invites only);
-- - meet@humanshaped.org may email them, at most once a day, when a
--   teacher wrote them a note or someone answered what they shared. That
--   email never carries the words, only that something is waiting.
--
-- The row is the person's own. A teacher learns the address only through
-- reach_for(), and only for someone in a cohort they teach who chose it.
-- No AI agent reads the address or changes the choice.

create table public.reach_choices (
  user_id            uuid primary key references public.profiles (id) on delete cascade,
  email              text check (email is null or (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254)),
  teachers_may_email boolean not null default false,
  notices            boolean not null default false,
  notified_at        timestamptz,   -- written only by the notices function
  updated_at         timestamptz not null default now(),
  check ((not teachers_may_email and not notices) or email is not null)
);

alter table public.reach_choices enable row level security;

create policy reach_choices_own_read on public.reach_choices for select to authenticated
  using (user_id = auth.uid() and private.not_an_agent());
create policy reach_choices_own_insert on public.reach_choices for insert to authenticated
  with check (user_id = auth.uid());
create policy reach_choices_own_update on public.reach_choices for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy reach_choices_own_delete on public.reach_choices for delete to authenticated
  using (user_id = auth.uid());

create policy agents_cannot_insert on public.reach_choices as restrictive
  for insert to authenticated with check (private.not_an_agent());
create policy agents_cannot_update on public.reach_choices as restrictive
  for update to authenticated using (private.not_an_agent());
create policy agents_cannot_delete on public.reach_choices as restrictive
  for delete to authenticated using (private.not_an_agent());

-- A person sets their choice; only the notices function moves notified_at.
-- Turning notices on starts the clock now, so nothing from before is sent.
create function private.keep_reach_clock() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if auth.uid() is not null then
    if tg_op = 'INSERT' then
      new.notified_at := case when new.notices then now() else null end;
    else
      new.notified_at := case when new.notices and not old.notices then now() else old.notified_at end;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.keep_reach_clock() from public, anon, authenticated;

create trigger reach_choices_clock before insert or update on public.reach_choices
  for each row execute function private.keep_reach_clock();

-- ---------------------------------------------------------------------
-- What a teacher may read: for each person still in a cohort they teach,
-- whether they may be emailed, and the address only if so.
-- ---------------------------------------------------------------------

create function public.reach_for(c uuid)
returns table (user_id uuid, may_email boolean, email text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.not_an_agent() then
    raise exception 'An AI agent cannot read how to reach someone.';
  end if;
  if not private.teaches(c) then
    raise exception 'Only a teacher of this cohort can see how to reach its people.';
  end if;
  return query
    select e.user_id, coalesce(r.teachers_may_email, false),
           case when r.teachers_may_email then r.email end
      from public.enrollments e
      left join public.reach_choices r on r.user_id = e.user_id
     where e.cohort_id = c and e.status <> 'left' and e.user_id <> auth.uid();
end;
$$;
revoke all on function public.reach_for(uuid) from public, anon;
grant execute on function public.reach_for(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- The once-a-day notice, read and marked only by the server (the
-- `notices` Edge Function, with the service role). It returns counts and
-- an address, never the words of a note or of feedback.
-- ---------------------------------------------------------------------

create function public.notice_digest()
returns table (user_id uuid, email text, notes int, answers int)
language sql stable security definer set search_path = '' as $$
  select r.user_id, r.email,
         (select count(*)::int from public.teacher_notes n
           where n.student_id = r.user_id and n.created_at > r.notified_at),
         (select count(*)::int from public.feedback f
            join public.shares s on s.id = f.share_id
           where s.user_id = r.user_id and f.author_id <> r.user_id and f.created_at > r.notified_at)
    from public.reach_choices r
   where r.notices and r.email is not null and r.notified_at is not null
     and r.notified_at < now() - interval '20 hours'
     and (exists (select 1 from public.teacher_notes n
                   where n.student_id = r.user_id and n.created_at > r.notified_at)
          or exists (select 1 from public.feedback f join public.shares s on s.id = f.share_id
                      where s.user_id = r.user_id and f.author_id <> r.user_id and f.created_at > r.notified_at));
$$;

create function public.mark_notified(ids uuid[]) returns int
language sql security definer set search_path = '' as $$
  with done as (
    update public.reach_choices set notified_at = now()
     where user_id = any(ids) and notices
    returning 1)
  select count(*)::int from done;
$$;

revoke all on function public.notice_digest(), public.mark_notified(uuid[]) from public, anon, authenticated;
grant execute on function public.notice_digest(), public.mark_notified(uuid[]) to service_role;
