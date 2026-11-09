do $$begin
 if exists(select 1 from storage.buckets where (id='media-originals' and public) or (id='media-published' and not public)) then raise exception 'Existing bucket visibility differs; review before migration'; end if;
end $$;
-- Only derivatives deliberately published by trusted processing go in the public bucket.
-- A public bucket does not hide old URLs; drafts/originals must stay in the private bucket.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('media-originals','media-originals',false,26214400,array['image/jpeg','image/png','image/webp','image/avif','application/pdf']),
 ('media-published','media-published',true,26214400,array['image/jpeg','image/png','image/webp','image/avif','application/pdf'])
on conflict(id) do nothing;
create policy rt_original_read on storage.objects for select to authenticated using(bucket_id='media-originals' and private.is_staff());
create policy rt_original_insert on storage.objects for insert to authenticated with check(bucket_id='media-originals' and private.is_staff() and split_part(name,'/',1)=auth.uid()::text);
create policy rt_original_update on storage.objects for update to authenticated using(bucket_id='media-originals' and private.is_staff() and split_part(name,'/',1)=auth.uid()::text) with check(bucket_id='media-originals' and private.is_staff() and split_part(name,'/',1)=auth.uid()::text);
create policy rt_published_read on storage.objects for select to anon,authenticated using(bucket_id='media-published');
-- No authenticated writes to media-published and no client DELETE policies.
