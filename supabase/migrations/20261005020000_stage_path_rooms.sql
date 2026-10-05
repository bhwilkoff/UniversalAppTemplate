-- Two more things the main stage can show (R11, R12;
-- research/notes/active-learning-notes.md): 'path', how many people said
-- they are at each stage of the path (counted from the class channel's
-- presence, never named), and 'rooms', every rehearsal room's step and
-- clock at a glance. Neither names a row, so neither carries stage_ref.

alter table public.show_state drop constraint if exists show_state_stage_check;
alter table public.show_state add constraint show_state_stage_check
  check (stage in ('scene', 'welcome', 'answers', 'presenter', 'blank', 'path', 'rooms'));
