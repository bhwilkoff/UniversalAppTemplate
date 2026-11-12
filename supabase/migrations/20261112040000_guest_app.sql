-- A guest keeps their app's address for the call's cohort, as a member does
-- on their enrollment (found in a learner's real Meet call, November 12,
-- 2026: a guest's Save said "Not saved", so nobody in a demo audience could
-- show their app). A guest sets only their own address, through this one
-- function; leaders read it with the rest of the guest's row.

alter table public.call_guests add column app_url text
  check (app_url is null or (app_url ~ '^https://' and char_length(app_url) <= 2000));

create function public.set_call_guest_app(c uuid, url text) returns boolean
language plpgsql security definer set search_path to 'public' as $$
declare n integer;
begin
  if url is not null and (url !~ '^https://' or char_length(url) > 2000) then
    raise exception 'A full address that starts with https://';
  end if;
  update public.call_guests set app_url = nullif(btrim(url), '')
   where cohort_id = c and user_id = auth.uid();
  get diagnostics n = row_count;
  return n > 0;
end;
$$;
revoke all on function public.set_call_guest_app(uuid, text) from public, anon;
grant execute on function public.set_call_guest_app(uuid, text) to authenticated;
