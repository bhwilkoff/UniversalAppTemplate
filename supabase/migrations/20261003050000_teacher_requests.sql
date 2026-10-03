-- Becoming a teacher (VISION.md: "other people should be able to become
-- teachers within the website and lead their own cohort"). Until now the
-- only way in was a row added to public.teachers by hand. This adds a
-- request a signed-in person makes on /teach/, and a decision made there
-- by someone allowed to approve it.
--
-- Who may approve, and why. DECISIONS.md, "Teachers": "Ben only at
-- launch, then people he invites. A request form comes later." So the
-- rule is a flag on the teacher's own row, can_approve, which is true
-- for Ben alone at launch. A flag rather than "only the first teacher"
-- lets Ben name others later without a new migration, and it is safe
-- because public.teachers has no write rule for signed-in people at
-- all: nobody can give themselves the flag, or make themselves a
-- teacher, from the site. Setting it for someone else stays a change
-- made by hand, the way inviting a teacher was until now.
--
-- What a request holds: why the person wants to teach and what they
-- would bring, in their words, and the answer. The person sees their
-- own request; people who can approve see every request; nobody else
-- sees any. Deleting the account deletes the request with it.

alter table public.teachers add column can_approve boolean not null default false;

update public.teachers set can_approve = true
  where user_id in (select id from public.profiles where lower(github_login) = 'bhwilkoff');

-- Ben's first sign-in makes him a teacher who can approve.
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  login text := coalesce(new.raw_user_meta_data ->> 'user_name', new.raw_user_meta_data ->> 'preferred_username', new.email);
begin
  insert into public.profiles (id, github_login, github_id, display_name, avatar_url)
  values (
    new.id,
    login,
    nullif(new.raw_user_meta_data ->> 'provider_id', '')::bigint,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  if lower(login) = 'bhwilkoff' then
    insert into public.teachers (user_id, can_approve) values (new.id, true)
      on conflict (user_id) do update set can_approve = true;
  end if;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

create function private.can_approve_teachers() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.teachers where user_id = auth.uid() and can_approve);
$$;
grant execute on function private.can_approve_teachers() to authenticated;

create type public.teacher_request_state as enum ('waiting', 'approved', 'declined');

-- One request per person. While it waits, they can change its words or
-- take it back; once it is decided, only taking it back remains.
create table public.teacher_requests (
  user_id     uuid primary key references public.profiles (id) on delete cascade,
  why         text not null check (char_length(why) between 1 and 2000),
  brings      text check (char_length(brings) <= 2000),
  state       public.teacher_request_state not null default 'waiting',
  reply       text check (char_length(reply) <= 2000),
  decided_by  uuid references public.profiles (id) on delete set null,
  decided_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.teacher_requests enable row level security;

create policy teacher_requests_read on public.teacher_requests for select to authenticated
  using (user_id = auth.uid() or private.can_approve_teachers());

-- Asking: for yourself, as a waiting request with no answer, and only
-- if you do not teach here already.
create policy teacher_requests_ask on public.teacher_requests for insert to authenticated
  with check (user_id = auth.uid() and state = 'waiting' and reply is null
              and decided_by is null and decided_at is null and not private.is_hub_teacher());

create policy teacher_requests_edit_own on public.teacher_requests for update to authenticated
  using (user_id = auth.uid() and state = 'waiting')
  with check (user_id = auth.uid() and state = 'waiting' and reply is null
              and decided_by is null and decided_at is null);

create policy teacher_requests_withdraw on public.teacher_requests for delete to authenticated
  using (user_id = auth.uid());

-- A student's agent reads, and never writes (migration 6).
create policy agents_cannot_insert on public.teacher_requests as restrictive
  for insert to authenticated with check (private.not_an_agent());
create policy agents_cannot_update on public.teacher_requests as restrictive
  for update to authenticated using (private.not_an_agent());
create policy agents_cannot_delete on public.teacher_requests as restrictive
  for delete to authenticated using (private.not_an_agent());

-- Deciding happens in one step, so that approving a request and adding
-- the teacher can never come apart. There is no update rule for
-- approvers on the table itself; this function is the only way a
-- request is decided, and it checks for itself, because it runs with
-- definer rights past row-level security.
create function public.decide_teacher_request(person uuid, approve boolean, answer text default null)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not private.not_an_agent() then
    raise exception 'Deciding who teaches is done by a person, on humanshaped.org.';
  end if;
  if not private.can_approve_teachers() then
    raise exception 'Only someone who can approve teachers can decide a request.';
  end if;
  if answer is not null and char_length(answer) > 2000 then
    raise exception 'The answer is longer than 2,000 characters.';
  end if;
  update public.teacher_requests
    set state = case when approve then 'approved'::public.teacher_request_state else 'declined'::public.teacher_request_state end,
        reply = nullif(btrim(answer), ''),
        decided_by = auth.uid(),
        decided_at = now(),
        updated_at = now()
    where user_id = person and state = 'waiting';
  if not found then
    raise exception 'There is no waiting request from that person.';
  end if;
  if approve then
    insert into public.teachers (user_id, invited_by) values (person, auth.uid())
      on conflict (user_id) do nothing;
  end if;
end;
$$;

revoke all on function public.decide_teacher_request(uuid, boolean, text) from public, anon;
grant execute on function public.decide_teacher_request(uuid, boolean, text) to authenticated;
