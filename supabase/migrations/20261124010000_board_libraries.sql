-- A person's own shelf of shapes for the board (Excalidraw's library), kept
-- here so it follows them between the board's page and the Meet stage, whose
-- browser storage are apart. Only they can read or change it.
create table if not exists public.board_libraries (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  items      jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array' and octet_length(items::text) <= 1000000),
  updated_at timestamptz not null default now()
);
alter table public.board_libraries enable row level security;
revoke all on public.board_libraries from anon;
grant select, insert, update, delete on public.board_libraries to authenticated;
create policy board_libraries_own on public.board_libraries for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy agents_cannot_insert on public.board_libraries as restrictive for insert to authenticated with check (private.not_an_agent());
create policy agents_cannot_update on public.board_libraries as restrictive for update to authenticated using (private.not_an_agent());
create policy agents_cannot_delete on public.board_libraries as restrictive for delete to authenticated using (private.not_an_agent());
