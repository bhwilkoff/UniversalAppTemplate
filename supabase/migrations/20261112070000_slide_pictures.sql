-- Pictures for a part's slides, such as the pages of a PDF deck an imported
-- course showed (Ben, November 12, 2026: "a huge number of the resources were
-- poorly rendering ... or just didn't load at all"). The main stage has no
-- sign-in, so it reads these by address: the bucket is public, and each
-- cohort's pictures sit under a random folder no one can guess, the same way
-- the course's source served them. Only the server adds or removes them.
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'objects') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      values ('slide-pictures', 'slide-pictures', true, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
      on conflict (id) do nothing;
  end if;
end;
$$;

-- Leaders add pictures to their own cohorts' slides (Ben, November 12, 2026:
-- "add images to slides as well ... we can certainly build that feature"):
-- each file goes under its cohort's id, and only that cohort's leaders may add
-- one. Nobody else writes here.
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'objects') then
    execute $p$
      create policy slide_pictures_add on storage.objects for insert to authenticated
        with check (bucket_id = 'slide-pictures'
          and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          and private.teaches(((storage.foldername(name))[1])::uuid)
          and private.not_an_agent())
    $p$;
  end if;
end;
$$;
