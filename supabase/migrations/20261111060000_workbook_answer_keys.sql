-- Saving an answer is an upsert on (workbook, person or room, block), and an
-- upsert names a unique index it can infer, which a partial index is not.
-- Plain unique indexes do the same work: an empty user_id or group_id never
-- collides with another, so a person's rows and a room's rows stay apart.
drop index if exists public.workbook_answers_person;
drop index if exists public.workbook_answers_group;
create unique index workbook_answers_person on public.workbook_answers (workbook_id, user_id, block);
create unique index workbook_answers_group on public.workbook_answers (workbook_id, group_id, block);
