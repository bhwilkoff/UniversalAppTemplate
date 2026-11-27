-- A deck owns its pictures (DECISIONS.md, "A deck owns its pictures"). Ben,
-- November 27, 2026, on the public slide-pictures bucket nobody could remove
-- from: "That doesn't bode well for being able to do this in production",
-- then, on this design: "That seems far more sustainable."
--
-- Each picture lives at '<cohort id>/<scene id>/<name>' in the private bucket
-- deck-pictures. Anyone in the cohort may read one (a guest in its call too,
-- as private.in_cohort says), which is what lets their signed-in panel make
-- the links their own main stage draws. Only the cohort's leaders add one, and
-- only to a part of their own cohort; only they remove one. No agent writes.

create function private.deck_picture_cohort(name text) returns uuid
language sql immutable as $$
  select case when split_part(name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(name, '/', 1)::uuid end;
$$;

create function private.can_read_deck_picture(name text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(private.in_cohort(private.deck_picture_cohort(name)), false);
$$;

create function private.can_add_deck_picture(name text) returns boolean
language sql stable security definer set search_path = public as $$
  select private.not_an_agent()
    and split_part(name, '/', 2) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and split_part(name, '/', 3) ~ '^[a-z0-9]{6,40}\.(webp|png|jpe?g)$'
    and split_part(name, '/', 4) = ''
    and coalesce(private.teaches(private.deck_picture_cohort(name)), false)
    and exists (select 1 from public.scenes s
                where s.id = split_part(name, '/', 2)::uuid
                  and s.cohort_id = private.deck_picture_cohort(name));
$$;

-- A leader may remove any picture in their cohort's folder, including those of
-- a part already removed, so DeckPictures.tidy can clear what is left.
create function private.can_remove_deck_picture(name text) returns boolean
language sql stable security definer set search_path = public as $$
  select private.not_an_agent() and coalesce(private.teaches(private.deck_picture_cohort(name)), false);
$$;

grant execute on function private.deck_picture_cohort(text), private.can_read_deck_picture(text),
  private.can_add_deck_picture(text), private.can_remove_deck_picture(text) to authenticated;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'objects') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      values ('deck-pictures', 'deck-pictures', false, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
      on conflict (id) do nothing;
    execute $p$
      create policy deck_pictures_read on storage.objects for select to authenticated
        using (bucket_id = 'deck-pictures' and private.can_read_deck_picture(name))
    $p$;
    execute $p$
      create policy deck_pictures_add on storage.objects for insert to authenticated
        with check (bucket_id = 'deck-pictures' and private.can_add_deck_picture(name))
    $p$;
    execute $p$
      create policy deck_pictures_remove on storage.objects for delete to authenticated
        using (bucket_id = 'deck-pictures' and private.can_remove_deck_picture(name))
    $p$;
  end if;
end;
$$;

-- Moving what slide-pictures held: each old file is copied into the folder of
-- every deck that uses it, the decks are rewritten to name the copies, and
-- then a leader of the cohort that used a file may delete the old one. The
-- list of old files and the rule that reads it go once the move is done
-- (20261127020000_slide_pictures_gone.sql).
create table private.picture_moves (
  old_name  text primary key,
  cohort_id uuid not null references public.cohorts (id) on delete cascade
);

create function private.can_move_slide_picture(name text) returns boolean
language sql stable security definer set search_path = public as $$
  select private.not_an_agent() and exists (
    select 1 from private.picture_moves m where m.old_name = name and private.teaches(m.cohort_id));
$$;
grant execute on function private.can_move_slide_picture(text) to authenticated;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'objects') then
    execute $p$
      create policy slide_pictures_move_out on storage.objects for delete to authenticated
        using (bucket_id = 'slide-pictures' and private.can_move_slide_picture(name))
    $p$;
    execute 'drop policy if exists slide_pictures_add on storage.objects';
  end if;
end;
$$;
