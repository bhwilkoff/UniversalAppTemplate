-- Pages on the board (R13; research/notes/active-learning-notes.md): a
-- PDF's pages, slides exported as PDF, or images, placed on a scene's
-- board so the class can draw on them, zoom, and work on them together
-- (or not, when the teacher locks the board), without sharing a screen.
--
-- The board's scene holds only each picture's name; the pictures
-- themselves live in the private storage bucket 'board-files', at
-- '<cohort id>/<board id>/<file>'. Whoever can see a board can read its
-- files; whoever can draw on it can add one (never an agent); a teacher
-- of the cohort can remove them. A teacher's "finish the cohort" removes
-- the cohort's files with the boards (assets/teach.js), since a file
-- cannot be deleted from SQL.

create function private.board_of_file(name text) returns uuid
language plpgsql immutable as $$
declare parts text[] := string_to_array(name, '/');
begin
  if array_length(parts, 1) <> 3 then return null; end if;
  return parts[2]::uuid;
exception when others then
  return null;
end $$;

create function private.can_read_board_file(name text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.boards b
    where b.id = private.board_of_file(name)
      and b.cohort_id::text = split_part(name, '/', 1)
      and private.can_see_board(b.cohort_id, b.group_id));
$$;

create function private.can_add_board_file(name text) returns boolean
language sql stable security definer set search_path = public as $$
  select private.not_an_agent() and exists (
    select 1 from public.boards b
    where b.id = private.board_of_file(name)
      and b.cohort_id::text = split_part(name, '/', 1)
      and private.can_see_board(b.cohort_id, b.group_id)
      and (not b.locked or private.teaches(b.cohort_id)));
$$;

create function private.can_remove_board_file(name text) returns boolean
language sql stable security definer set search_path = public as $$
  select private.not_an_agent() and private.teaches(split_part(name, '/', 1)::uuid);
$$;

grant execute on function private.can_read_board_file(text), private.can_add_board_file(text), private.can_remove_board_file(text) to authenticated;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'objects') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      values ('board-files', 'board-files', false, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
      on conflict (id) do nothing;
    execute $p$
      create policy board_files_read on storage.objects for select to authenticated
        using (bucket_id = 'board-files' and private.can_read_board_file(name))
    $p$;
    execute $p$
      create policy board_files_add on storage.objects for insert to authenticated
        with check (bucket_id = 'board-files' and private.can_add_board_file(name))
    $p$;
    execute $p$
      create policy board_files_remove on storage.objects for delete to authenticated
        using (bucket_id = 'board-files' and private.can_remove_board_file(name))
    $p$;
  end if;
end $$;
