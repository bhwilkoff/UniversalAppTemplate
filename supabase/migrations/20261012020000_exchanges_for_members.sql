-- Exchanges for Human Shaped members (Ben, October 12, 2026: "The 'Who
-- can see it' drop down should also allow for creating Exchanges within a
-- particular cohort or people who logged in to HumanShaped.org (i.e., they
-- are a part of the Human Shaped Organization on Github or have been a part
-- of a cohort previously)").
--
-- A member is someone signed in who is a hub teacher, teaches or taught a
-- cohort, is or was in one (not counting someone who left), or whom the
-- cohort-access function made a member of a cohort's team in the
-- humanshaped GitHub organization. People join the organization through
-- those teams, so the hub knows its members this way without asking GitHub.

alter table public.exchanges
  add column members_only boolean not null default false,
  add constraint exchanges_one_audience check (not (members_only and cohort_id is not null));

create function private.is_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
    private.is_hub_teacher()
    or exists (select 1 from public.cohort_teachers t where t.user_id = auth.uid())
    or exists (select 1 from public.enrollments n where n.user_id = auth.uid() and n.status <> 'left')
    or exists (select 1 from public.github_access g where g.user_id = auth.uid() and g.state = 'member')
  );
$$;
revoke all on function private.is_member() from public, anon, authenticated;

-- For the "Who can see it" choice; it says only whether the person asking
-- is a member.
create function public.am_i_a_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_member();
$$;
revoke all on function public.am_i_a_member() from public;
grant execute on function public.am_i_a_member() to authenticated;

create or replace function private.can_see_exchange(e public.exchanges) returns boolean
language sql stable security definer set search_path = '' as $$
  select e.id is not null and case
    when e.cohort_id is not null then private.in_cohort(e.cohort_id)
    when e.members_only then private.is_member()
    else true
  end;
$$;

create or replace function private.exchange_rules() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.token is distinct from old.token or new.created_by is distinct from old.created_by
     or new.cohort_id is distinct from old.cohort_id or new.members_only is distinct from old.members_only then
    raise exception 'An exchange keeps its link, its maker, and where it lives.';
  end if;
  return new;
end;
$$;

-- A members' exchange read by someone who is not one says only that it is
-- private, and for whom, never its title.
create or replace function public.exchange(t text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  e public.exchanges := private.exchange_by_token(t);
begin
  if e.id is null then return null; end if;
  if not private.can_see_exchange(e) then
    return jsonb_build_object('private', true, 'members', e.members_only);
  end if;
  return (
    select jsonb_build_object(
      'title', e.title, 'prompt', e.prompt, 'replies_open', e.replies_open, 'members', e.members_only,
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

drop function public.start_exchange(text, uuid, text, text, text, integer, text);
create function public.start_exchange(
  title text, cohort uuid, drive_file_id text, mime text default null,
  kind text default 'camera', seconds integer default null, note text default null,
  members boolean default false
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  e public.exchanges;
begin
  if auth.uid() is null or not private.not_an_agent() then
    raise exception 'Sign in to start an exchange.';
  end if;
  if nullif(btrim(start_exchange.title), '') is null then
    raise exception 'Give the exchange a name people will recognize.';
  end if;
  if start_exchange.drive_file_id is null then
    raise exception 'An exchange opens with a video.';
  end if;
  if cohort is not null and coalesce(members, false) then
    raise exception 'An exchange is for a cohort or for Human Shaped members, not both.';
  end if;
  if cohort is not null and not private.in_cohort(cohort) then
    raise exception 'Only the people in a cohort can start an exchange inside it.';
  end if;
  if coalesce(members, false) and not private.is_member() then
    raise exception 'Only Human Shaped members can start an exchange for members.';
  end if;
  if (select count(*) from public.exchanges x where x.created_by = auth.uid() and x.created_at > now() - interval '1 day') >= 30 then
    raise exception 'That is a lot of exchanges for one day. Try again tomorrow.';
  end if;
  insert into public.exchanges (created_by, cohort_id, members_only, title)
  values (auth.uid(), cohort, coalesce(members, false), btrim(start_exchange.title))
  returning * into e;
  insert into public.exchange_posts (exchange_id, author_id, drive_file_id, mime, kind, seconds, note)
  values (e.id, auth.uid(), start_exchange.drive_file_id, start_exchange.mime, coalesce(start_exchange.kind, 'camera'),
          start_exchange.seconds, nullif(btrim(start_exchange.note), ''));
  return e.token;
end;
$$;
revoke all on function public.start_exchange(text, uuid, text, text, text, integer, text, boolean) from public;
grant execute on function public.start_exchange(text, uuid, text, text, text, integer, text, boolean) to authenticated;

drop function public.my_exchanges();
create function public.my_exchanges() returns table (
  token text, title text, cohort_title text, for_members boolean, made boolean, videos bigint, mine bigint, active_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select e.token, e.title, c.title, e.members_only, e.created_by = auth.uid(),
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
revoke all on function public.my_exchanges() from public;
grant execute on function public.my_exchanges() to authenticated;
