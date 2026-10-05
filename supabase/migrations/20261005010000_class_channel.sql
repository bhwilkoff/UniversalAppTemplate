-- The class channel (R10, R11; research/notes/active-learning-notes.md).
--
-- One private Realtime channel per cohort, 'class:<cohort id>', for what
-- people send one another during a live session and never keep: the
-- reactions a person chooses to send, the stance they hold (agree,
-- unsure, disagree), and who has the class open (presence). Nothing on
-- this channel is written to a table, so nothing about it outlasts the
-- call. Everyone in the cohort, students and teachers, may listen; only
-- a person may send, never an agent (agents read; they do not speak in
-- the room).

create function private.cohort_from_topic(t text) returns uuid
language plpgsql immutable as $$
begin
  if t is null or t not like 'class:%' then return null; end if;
  return substring(t from 7)::uuid;
exception when others then
  return null;
end $$;
grant execute on function private.cohort_from_topic(text) to authenticated;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'realtime' and table_name = 'messages') then
    execute $p$
      create policy class_listen on realtime.messages for select to authenticated
        using (extension in ('broadcast', 'presence')
               and (select realtime.topic()) like 'class:%'
               and private.in_cohort(private.cohort_from_topic((select realtime.topic()))))
    $p$;
    execute $p$
      create policy class_send on realtime.messages for insert to authenticated
        with check ((select realtime.topic()) like 'class:%'
                    and extension in ('broadcast', 'presence')
                    and private.not_an_agent()
                    and private.in_cohort(private.cohort_from_topic((select realtime.topic()))))
    $p$;
  end if;
end $$;
