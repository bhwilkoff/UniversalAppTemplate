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
