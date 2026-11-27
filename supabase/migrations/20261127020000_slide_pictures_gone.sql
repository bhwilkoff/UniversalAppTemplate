-- The move to deck-pictures is done (November 27, 2026: 70 copies into 28
-- decks of Admissions Processing Training, 67 old files deleted by their
-- leader, including the test picture nobody could remove). The old bucket is
-- empty and has no rules left; the list and the rules that served the move go.
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'objects') then
    execute 'drop policy if exists slide_pictures_move_out on storage.objects';
    execute 'drop policy if exists slide_pictures_move_read on storage.objects';
    execute 'drop policy if exists slide_pictures_add on storage.objects';
  end if;
end;
$$;
drop function if exists private.can_move_slide_picture(text);
drop table if exists private.picture_moves;
