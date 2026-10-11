-- Exchanges (Ben, October 11, 2026): "an asynchronous video system that
-- utlizes the ability to record and upload a video to Google Drive and
-- then embed it as a response to a privously posted video. Ideally, it
-- would work as Threadit did ... a new content type within a cohort that
-- could function between synchronous classes. Also, these should also be
-- able to be created outside of the cohort system in order to engage
-- people who are not yet a part of a cohort."
--
-- An exchange is a thread of short videos, oldest first, each one a file
-- in its maker's own Google Drive (shared to anyone with its link), which
-- the hub only points to. An exchange inside a cohort is seen only by the
-- cohort; one outside a cohort is seen by anyone holding its link (122
-- random bits after the #). Replying needs an account, so people can find
-- their exchanges again, and the maker decides whether replies are open.
--
-- Nobody reads the tables directly; the functions below check who is
-- asking and return only what that person may see.

create table public.exchanges (
  id          uuid primary key default gen_random_uuid(),
  token       text not null unique default replace(gen_random_uuid()::text, '-', ''),
  created_by  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  cohort_id   uuid references public.cohorts (id) on delete cascade,
  title       text not null check (char_length(btrim(title)) between 1 and 120),
  prompt      text check (char_length(prompt) <= 2000),
  replies_open boolean not null default true,
  created_at  timestamptz not null default now(),
  active_at   timestamptz not null default now()
);

create table public.exchange_posts (
  id             uuid primary key default gen_random_uuid(),
  exchange_id    uuid not null references public.exchanges (id) on delete cascade,
  author_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  reply_to       uuid references public.exchange_posts (id) on delete set null,
  drive_file_id  text not null check (drive_file_id ~ '^[A-Za-z0-9_-]{10,200}$'),
  mime           text check (char_length(mime) <= 100),
  kind           text not null default 'camera' check (kind in ('camera', 'screen', 'upload')),
  seconds        integer check (seconds between 0 and 1800),
  note           text check (char_length(note) <= 1000),
  created_at     timestamptz not null default now()
);
create index exchange_posts_exchange on public.exchange_posts (exchange_id, created_at);
create index exchange_posts_author on public.exchange_posts (author_id);
create index exchanges_cohort on public.exchanges (cohort_id);

alter table public.exchanges enable row level security;
alter table public.exchange_posts enable row level security;

-- The maker changes or deletes their own exchange directly; nothing else
-- touches the tables except through the functions below.
create policy makers_see_their_exchanges on public.exchanges for select to authenticated
  using (created_by = auth.uid());
create policy makers_change_their_exchanges on public.exchanges for update to authenticated
  using (created_by = auth.uid() and private.not_an_agent())
  with check (created_by = auth.uid() and private.not_an_agent());
create policy makers_delete_their_exchanges on public.exchanges for delete to authenticated
  using (created_by = auth.uid() and private.not_an_agent());

create function private.exchange_rules() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.token is distinct from old.token or new.created_by is distinct from old.created_by
     or new.cohort_id is distinct from old.cohort_id then
    raise exception 'An exchange keeps its link, its maker, and where it lives.';
  end if;
  return new;
end;
$$;
revoke all on function private.exchange_rules() from public, anon, authenticated;
create trigger exchanges_rules before update on public.exchanges
  for each row execute function private.exchange_rules();

-- Who may see an exchange: anyone with its link, unless it lives in a
-- cohort, and then only the cohort.
create function private.can_see_exchange(e public.exchanges) returns boolean
language sql stable security definer set search_path = '' as $$
  select e.id is not null and (e.cohort_id is null or private.in_cohort(e.cohort_id));
$$;
revoke all on function private.can_see_exchange(public.exchanges) from public, anon, authenticated;

create function private.can_reply_exchange(e public.exchanges) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and private.not_an_agent() and private.can_see_exchange(e)
    and (e.replies_open or e.created_by = auth.uid());
$$;
revoke all on function private.can_reply_exchange(public.exchanges) from public, anon, authenticated;

create function private.person_name(p public.profiles) returns text
language sql immutable set search_path = '' as $$
  select coalesce(nullif(btrim(p.display_name), ''), p.github_login, 'Someone');
$$;
revoke all on function private.person_name(public.profiles) from public, anon, authenticated;

create function private.exchange_by_token(t text) returns public.exchanges
language sql stable security definer set search_path = '' as $$
  select * from public.exchanges where token = t and char_length(t) = 32;
$$;
revoke all on function private.exchange_by_token(text) from public, anon, authenticated;

-- One exchange, with its videos, for whoever may see it. A cohort's
-- exchange read by someone outside the cohort says only that it is
-- private, never its title.
create function public.exchange(t text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  e public.exchanges := private.exchange_by_token(t);
begin
  if e.id is null then return null; end if;
  if not private.can_see_exchange(e) then
    return jsonb_build_object('private', true);
  end if;
  return (
    select jsonb_build_object(
      'title', e.title, 'prompt', e.prompt, 'replies_open', e.replies_open,
      'created_at', e.created_at,
      'mine', e.created_by = auth.uid(),
      'can_reply', private.can_reply_exchange(e),
      'can_moderate', e.created_by = auth.uid() or (e.cohort_id is not null and private.teaches(e.cohort_id)),
      'maker', jsonb_build_object('name', private.person_name(mk), 'avatar', mk.avatar_url),
      'cohort', case when c.id is null then null else jsonb_build_object('title', c.title, 'slug', c.slug) end,
      'posts', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', p.id, 'drive_file_id', p.drive_file_id, 'mime', p.mime, 'kind', p.kind,
          'seconds', p.seconds, 'note', p.note, 'reply_to', p.reply_to, 'created_at', p.created_at,
          'mine', p.author_id = auth.uid(),
          'author', jsonb_build_object('name', private.person_name(a), 'avatar', a.avatar_url)
        ) order by p.created_at)
        from public.exchange_posts p join public.profiles a on a.id = p.author_id
        where p.exchange_id = e.id), '[]'::jsonb)
    )
    from public.profiles mk
    left join public.cohorts c on c.id = e.cohort_id
    where mk.id = e.created_by
  );
end;
$$;

create function public.create_exchange(title text, prompt text default null, cohort uuid default null)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  made text;
begin
  if auth.uid() is null or not private.not_an_agent() then
    raise exception 'Sign in to start an exchange.';
  end if;
  if cohort is not null and not private.in_cohort(cohort) then
    raise exception 'Only the people in a cohort can start an exchange inside it.';
  end if;
  if (select count(*) from public.exchanges where created_by = auth.uid() and created_at > now() - interval '1 day') >= 30 then
    raise exception 'That is a lot of exchanges for one day. Try again tomorrow.';
  end if;
  insert into public.exchanges (created_by, cohort_id, title, prompt)
  values (auth.uid(), cohort, btrim(title), nullif(btrim(prompt), ''))
  returning token into made;
  return made;
end;
$$;

-- Adds a video already saved in its maker's Drive. The hub cannot see the
-- Drive file; it keeps only the file's id.
create function public.add_exchange_post(
  t text, drive_file_id text, mime text default null, kind text default 'camera',
  seconds integer default null, note text default null, reply_to uuid default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  e public.exchanges := private.exchange_by_token(t);
  made uuid;
begin
  if e.id is null then raise exception 'There is no exchange at this link.'; end if;
  if not private.can_reply_exchange(e) then
    raise exception 'Replies to this exchange are closed, or you are not signed in.';
  end if;
  if add_exchange_post.reply_to is not null and not exists (select 1 from public.exchange_posts p where p.id = add_exchange_post.reply_to and p.exchange_id = e.id) then
    raise exception 'That video is not in this exchange.';
  end if;
  if (select count(*) from public.exchange_posts p where p.exchange_id = e.id) >= 300 then
    raise exception 'This exchange already has as many videos as it can hold.';
  end if;
  insert into public.exchange_posts (exchange_id, author_id, reply_to, drive_file_id, mime, kind, seconds, note)
  values (e.id, auth.uid(), reply_to, drive_file_id, mime, coalesce(kind, 'camera'), seconds, nullif(btrim(note), ''))
  returning id into made;
  update public.exchanges set active_at = now() where id = e.id;
  return made;
end;
$$;

-- A video comes out of an exchange by its maker, the exchange's maker, or
-- a teacher of its cohort. The file stays in its maker's Drive.
create function public.remove_exchange_post(post uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  p public.exchange_posts;
  e public.exchanges;
begin
  if not private.not_an_agent() then raise exception 'An agent cannot change an exchange.'; end if;
  select * into p from public.exchange_posts where id = post;
  if p.id is null then return false; end if;
  select * into e from public.exchanges where id = p.exchange_id;
  if not (p.author_id = auth.uid() or e.created_by = auth.uid() or (e.cohort_id is not null and private.teaches(e.cohort_id))) then
    raise exception 'Only the person who posted it, or the exchange''s maker, can remove a video.';
  end if;
  delete from public.exchange_posts where id = post;
  return true;
end;
$$;

-- The exchanges a person made or added a video to, newest activity first.
create function public.my_exchanges() returns table (
  token text, title text, cohort_title text, made boolean, videos bigint, mine bigint, active_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select e.token, e.title, c.title, e.created_by = auth.uid(),
    (select count(*) from public.exchange_posts p where p.exchange_id = e.id),
    (select count(*) from public.exchange_posts p where p.exchange_id = e.id and p.author_id = auth.uid()),
    e.active_at
  from public.exchanges e
  left join public.cohorts c on c.id = e.cohort_id
  where auth.uid() is not null
    and (e.created_by = auth.uid() or exists (select 1 from public.exchange_posts p where p.exchange_id = e.id and p.author_id = auth.uid()))
    and private.can_see_exchange(e)
  order by e.active_at desc;
$$;

-- A cohort's exchanges, for its own people.
create function public.cohort_exchanges(cohort uuid) returns table (
  token text, title text, maker text, videos bigint, replies_open boolean, active_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select e.token, e.title, private.person_name(mk),
    (select count(*) from public.exchange_posts p where p.exchange_id = e.id), e.replies_open, e.active_at
  from public.exchanges e join public.profiles mk on mk.id = e.created_by
  where e.cohort_id = cohort and private.in_cohort(cohort)
  order by e.active_at desc;
$$;

revoke all on function public.exchange(text), public.create_exchange(text, text, uuid),
  public.add_exchange_post(text, text, text, text, integer, text, uuid), public.remove_exchange_post(uuid),
  public.my_exchanges(), public.cohort_exchanges(uuid) from public;
grant execute on function public.exchange(text) to anon, authenticated;
grant execute on function public.create_exchange(text, text, uuid),
  public.add_exchange_post(text, text, text, text, integer, text, uuid), public.remove_exchange_post(uuid),
  public.my_exchanges(), public.cohort_exchanges(uuid) to authenticated;
