-- A part's purpose in words: what it is for, shown to everyone with the part
-- (Course Builder's activity learning goal, or a leader's own). Never a score.
alter table public.scenes add column goal text check (goal is null or char_length(goal) <= 600);
