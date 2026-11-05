-- The main stage as slides (DECISIONS.md, "The main stage is built from
-- slides"). A part can hold a deck, written as text. Learners can read a
-- part, so what they can read must not hold speaker notes: the source, with
-- its notes, stays in scene_decks for leaders, and scenes.slides is the same
-- text without them.

alter table public.scenes add column slides text check (char_length(slides) <= 40000);
alter table public.show_state add column slide integer not null default 0 check (slide >= 0);

create table public.scene_decks (
  scene_id   uuid primary key references public.scenes (id) on delete cascade,
  cohort_id  uuid not null references public.cohorts (id) on delete cascade,
  body       text not null check (char_length(body) <= 60000),
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.scene_decks enable row level security;
grant select on public.scene_decks to authenticated;
create policy scene_decks_read on public.scene_decks for select to authenticated
  using (private.teaches(cohort_id));

-- One way to save a deck, so the split is made here and never trusted to a
-- browser: a line starting with > is a speaker note.
create function public.save_scene_deck(scene uuid, source text) returns text
language plpgsql security definer set search_path to 'public' as $$
declare
  c uuid;
  body text := btrim(coalesce(source, ''), E' \n\r\t');
  shown text;
begin
  select s.cohort_id into c from public.scenes s where s.id = scene;
  if c is null or not private.teaches(c) or not private.not_an_agent() then
    raise exception 'Only a leader of this cohort can change its slides.';
  end if;
  if body = '' then
    delete from public.scene_decks where scene_id = scene;
    update public.scenes set slides = null where id = scene;
    return null;
  end if;
  shown := btrim(regexp_replace(body, '^>.*(\n|$)', '', 'gn'), E' \n\r\t');
  insert into public.scene_decks (scene_id, cohort_id, body, updated_by)
  values (scene, c, body, auth.uid())
  on conflict (scene_id) do update set body = excluded.body, updated_by = auth.uid(), updated_at = now();
  update public.scenes set slides = nullif(shown, '') where id = scene;
  return shown;
end;
$$;
revoke all on function public.save_scene_deck(uuid, text) from public, anon;
grant execute on function public.save_scene_deck(uuid, text) to authenticated;
