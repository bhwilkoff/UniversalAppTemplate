-- A person sets the name others see (Ben, October 22, 2026: "I'd like to
-- be able to change the display name for the user (I'd like it to show my
-- name instead of username)"). profiles_update_own already lets someone
-- change their own display name, and keep_github_fields keeps their
-- GitHub name out of reach; this keeps the name a name: trimmed, and
-- between 1 and 80 characters, or empty to fall back to the GitHub name.
alter table public.profiles
  add constraint profiles_display_name_shape
  check (display_name is null or (display_name = btrim(display_name) and char_length(display_name) between 1 and 80));
