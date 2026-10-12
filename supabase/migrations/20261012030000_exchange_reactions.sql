-- Reactions to exchange videos (Ben, October 12, 2026: "Can you enable the
-- ability to add the reactions that we have pioneered for use within the
-- synchronous sessions (google meet extension) so that users can react to
-- the exchange videos as they watch them.").
--
-- The same eight reactions as the Meet add-on (react-lib.js). Live ones
-- are never stored; these are, because the person who posted a video
-- watches for them later. Each video shows each reaction with the names of
-- who sent it, never a tally per person. One of each kind per person per
-- video, turned on and off. Anyone signed in who can see the exchange may
-- react, even after replies close.

create table public.exchange_reactions (
  post_id     uuid not null references public.exchange_posts (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  reaction    text not null check (reaction in ('smile', 'laugh', 'love', 'clap', 'snaps', 'ponder', 'mind', 'frown')),
  created_at  timestamptz not null default clock_timestamp(),
  primary key (post_id, user_id, reaction)
);
alter table public.exchange_reactions enable row level security;
revoke all on public.exchange_reactions from anon, authenticated;

-- A video's reactions in the add-on's order, each with who sent it
-- (earliest first) and whether the person asking did.
create function private.exchange_post_reactions(post uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('r', x.reaction, 'names', x.names, 'mine', x.mine)
           order by array_position(array['smile', 'laugh', 'love', 'clap', 'snaps', 'ponder', 'mind', 'frown'], x.reaction)), '[]'::jsonb)
  from (
    select r.reaction, jsonb_agg(private.person_name(pr) order by r.created_at) names, coalesce(bool_or(r.user_id = auth.uid()), false) mine
    from public.exchange_reactions r join public.profiles pr on pr.id = r.user_id
    where r.post_id = post
    group by r.reaction
  ) x;
$$;
revoke all on function private.exchange_post_reactions(uuid) from public, anon, authenticated;

create function public.react_to_exchange_post(post uuid, reaction text, turn_on boolean default true) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  p public.exchange_posts;
  e public.exchanges;
begin
  if auth.uid() is null or not private.not_an_agent() then
    raise exception 'Sign in to react.';
  end if;
  select * into p from public.exchange_posts where id = post;
  if p.id is not null then select * into e from public.exchanges where id = p.exchange_id; end if;
  if p.id is null or not private.can_see_exchange(e) then
    raise exception 'That video is not in an exchange you can see.';
  end if;
  if react_to_exchange_post.reaction not in ('smile', 'laugh', 'love', 'clap', 'snaps', 'ponder', 'mind', 'frown') then
    raise exception 'That is not one of the reactions.';
  end if;
  if turn_on then
    insert into public.exchange_reactions (post_id, user_id, reaction)
    values (post, auth.uid(), react_to_exchange_post.reaction) on conflict do nothing;
  else
    delete from public.exchange_reactions r
    where r.post_id = post and r.user_id = auth.uid() and r.reaction = react_to_exchange_post.reaction;
  end if;
  return private.exchange_post_reactions(post);
end;
$$;
revoke all on function public.react_to_exchange_post(uuid, text, boolean) from public;
grant execute on function public.react_to_exchange_post(uuid, text, boolean) to authenticated;

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
      'can_react', auth.uid() is not null and private.not_an_agent(),
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
          'author', jsonb_build_object('name', private.person_name(a), 'avatar', a.avatar_url),
          'reactions', private.exchange_post_reactions(p.id)
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
