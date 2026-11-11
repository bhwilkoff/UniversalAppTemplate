-- A workbook's images (DECISIONS.md, "Workbooks"): kept in the private
-- bucket 'workbook-files' at '<cohort id>/<workbook id>/<file>', named in the
-- block text as "![](i3.png)". Whoever can read the workbook can read its
-- images; only a leader of its cohort adds, replaces, or removes them.

create function private.workbook_of_file(name text) returns uuid
language plpgsql immutable as $$
declare parts text[] := string_to_array(name, '/');
begin
  if array_length(parts, 1) <> 3 or parts[3] !~ '^i[0-9]{1,3}\.(png|jpg|webp|gif)$' then return null; end if;
  return parts[2]::uuid;
exception when others then
  return null;
end $$;

create function private.can_read_workbook_file(name text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.workbooks w
    where w.id = private.workbook_of_file(name)
      and w.cohort_id::text = split_part(name, '/', 1)
      and private.in_cohort(w.cohort_id));
$$;

create function private.can_change_workbook_file(name text) returns boolean
language sql stable security definer set search_path = public as $$
  select private.not_an_agent() and exists (
    select 1 from public.workbooks w
    where w.id = private.workbook_of_file(name)
      and w.cohort_id::text = split_part(name, '/', 1)
      and private.teaches(w.cohort_id));
$$;

grant execute on function private.can_read_workbook_file(text), private.can_change_workbook_file(text) to authenticated;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'objects') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      values ('workbook-files', 'workbook-files', false, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
      on conflict (id) do nothing;
    execute $p$
      create policy workbook_files_read on storage.objects for select to authenticated
        using (bucket_id = 'workbook-files' and private.can_read_workbook_file(name))
    $p$;
    execute $p$
      create policy workbook_files_add on storage.objects for insert to authenticated
        with check (bucket_id = 'workbook-files' and private.can_change_workbook_file(name))
    $p$;
    execute $p$
      create policy workbook_files_replace on storage.objects for update to authenticated
        using (bucket_id = 'workbook-files' and private.can_change_workbook_file(name))
        with check (bucket_id = 'workbook-files' and private.can_change_workbook_file(name))
    $p$;
    execute $p$
      create policy workbook_files_remove on storage.objects for delete to authenticated
        using (bucket_id = 'workbook-files' and private.can_change_workbook_file(name))
    $p$;
  end if;
end $$;
