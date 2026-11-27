-- Storage deletes a file only for someone who may also read it, and the old
-- public bucket never had a read rule for signed-in people (it was read by
-- address). The leader moving a file out may read it until it is gone; this
-- rule goes with picture_moves in 20261127020000_slide_pictures_gone.sql.
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'objects') then
    execute $p$
      create policy slide_pictures_move_read on storage.objects for select to authenticated
        using (bucket_id = 'slide-pictures' and private.can_move_slide_picture(name))
    $p$;
  end if;
end;
$$;
