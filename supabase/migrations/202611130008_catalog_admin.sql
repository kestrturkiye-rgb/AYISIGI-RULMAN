-- Phase 3: transactional catalog editing. No DELETE privilege is granted to clients.
create function private.require_catalog() returns void language plpgsql stable security definer set search_path='' as $$
begin if not private.is_staff() then raise exception 'Katalog yönetim yetkiniz yok.' using errcode='42501'; end if; end $$;

create function public.admin_catalog_list(p_filters jsonb default '{}') returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; page_no int:=coalesce((p_filters->>'page')::int,1); page_size int:=coalesce((p_filters->>'size')::int,25); q text:=trim(coalesce(p_filters->>'q','')); sort_key text:=coalesce(p_filters->>'sort','updated');
begin
 perform private.require_catalog();
 if page_no<1 or page_no>100000 or page_size not between 1 and 100 or length(q)>240 or sort_key not in ('updated','name','sku','order') then raise exception 'Geçersiz arama.' using errcode='22023'; end if;
 with filtered as (
 select p.id,p.sku,p.name,p.slug,p.brand_id,p.category_id,p.status,p.stock_status,p.deleted_at,p.lock_version,p.updated_at,p.sort_order,b.name brand,c.name category,p.inner_mm,p.outer_mm,p.width_mm
 from public.products p left join public.brands b on b.id=p.brand_id join public.categories c on c.id=p.category_id
 where (case when coalesce(p_filters->>'deleted','false')='true' then p.deleted_at is not null else p.deleted_at is null end)
 and (q='' or strpos(lower(p.name),lower(q))>0 or strpos(p.normalized_code,public.normalize_product_code(q))>0)
 and (coalesce(p_filters->>'brand','')='' or p.brand_id=p_filters->>'brand')
 and (coalesce(p_filters->>'category','')='' or p.category_id=p_filters->>'category')
 and (coalesce(p_filters->>'status','')='' or p.status::text=p_filters->>'status')
 and (coalesce(p_filters->>'stock','')='' or p.stock_status::text=p_filters->>'stock')
 and (nullif(p_filters->>'inner','') is null or p.inner_mm=(p_filters->>'inner')::numeric)
 and (nullif(p_filters->>'outer','') is null or p.outer_mm=(p_filters->>'outer')::numeric)
 and (nullif(p_filters->>'width','') is null or p.width_mm=(p_filters->>'width')::numeric)
 ), paged as (select * from filtered order by case when sort_key='name' then name end,case when sort_key='sku' then sku end,case when sort_key='order' then sort_order end,case when sort_key='updated' then updated_at end desc,id limit page_size offset (page_no-1)*page_size)
 select jsonb_build_object('total',(select count(*) from filtered),'items',coalesce((select jsonb_agg(to_jsonb(paged)) from paged),'[]'::jsonb)) into result;
 return result;
end $$;

create function public.admin_catalog_lookups() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin perform private.require_catalog(); return jsonb_build_object(
 'categories',(select coalesce(jsonb_agg(to_jsonb(c) order by sort_order,name,id),'[]') from public.categories c),
 'brands',(select coalesce(jsonb_agg(to_jsonb(b) order by sort_order,name,id),'[]') from public.brands b),
 'templates',(select coalesce(jsonb_agg(to_jsonb(t) order by name),'[]') from public.spec_templates t where deleted_at is null)); end $$;

create function public.admin_product_detail(p_id text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; begin perform private.require_catalog();
 select to_jsonb(p)||jsonb_build_object(
 'aliases',coalesce((select jsonb_agg(jsonb_build_object('code',a.code,'brand_id',a.brand_id,'kind',a.kind) order by a.code) from public.product_aliases a where a.product_id=p.id),'[]'),
 'media',coalesce((select jsonb_agg(jsonb_build_object('media_id',m.media_id,'alt_text',m.alt_text,'is_primary',m.is_primary,'mime_type',a.mime_type,'bucket_id',a.bucket_id,'object_path',a.object_path,'status',a.status) order by m.sort_order,m.id) from public.product_media m join public.media_assets a on a.id=m.media_id where m.product_id=p.id and a.deleted_at is null),'[]'),
 'relations',coalesce((select jsonb_agg(jsonb_build_object('related_id',r.related_id,'kind',r.kind,'name',rp.name,'sku',rp.sku) order by r.sort_order,r.related_id) from public.product_relations r join public.products rp on rp.id=r.related_id where r.product_id=p.id),'[]'),
 'price',case when private.is_admin() then (select jsonb_build_object('amount',amount,'currency',currency) from private.product_prices where product_id=p.id) else null end,
 'inventory',(select jsonb_build_object('quantity',quantity,'low_threshold',low_threshold) from private.inventory_levels where product_id=p.id)
 ) into result from public.products p where id=p_id;
 if result is null then raise exception 'Ürün bulunamadı.' using errcode='P0002'; end if; return result; end $$;

create function public.admin_save_product(p_id text,p_version int,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare old public.products; item public.products; value jsonb; allowed jsonb; id_value text:=coalesce(p_id,gen_random_uuid()::text); n int:=0;
begin
 perform private.require_catalog();
 if jsonb_typeof(p_data)<>'object' or pg_column_size(p_data)>1048576 then raise exception 'Ürün verisi geçersiz.' using errcode='22023'; end if;
 if p_id is not null then
 select * into old from public.products where id=p_id for update;
 if not found then raise exception 'Ürün bulunamadı.' using errcode='P0002'; end if;
 if old.lock_version is distinct from p_version then raise exception 'Kayıt başka bir kullanıcı tarafından değiştirildi. Yeniden açın.' using errcode='40001'; end if;
 if old.deleted_at is not null then raise exception 'Önce ürünü geri alın.' using errcode='22023'; end if;
 end if;
 select coalesce(jsonb_object_agg(entry.key,entry.value),'{}') into allowed from jsonb_each(p_data) entry where entry.key=any(array['sku','name','slug','brand_id','category_id','short_description','long_description','origin','stock_status','featured','is_new','sort_order','inner_mm','outer_mm','width_mm','specifications','base_code','manufacturer_code','technical_warning','price_mode','seo','status']);
 item:=jsonb_populate_record(null::public.products,coalesce(to_jsonb(old),'{}')||'{"short_description":"","long_description":{"type":"doc","content":[]},"stock_status":"on_order","featured":false,"is_new":false,"sort_order":0,"specifications":[],"image_kind":"product","price_mode":"quote","seo":{},"status":"draft"}'::jsonb||coalesce(to_jsonb(old),'{}')||allowed||jsonb_build_object('id',id_value));
 if not exists(select 1 from public.categories where id=item.category_id and deleted_at is null and (item.status='draft' or status='published')) or (item.brand_id is not null and not exists(select 1 from public.brands where id=item.brand_id and deleted_at is null and (item.status='draft' or status='published'))) then raise exception 'Yayın için kategori ve marka yayında olmalı; silinmiş kayıt seçilemez.' using errcode='22023'; end if;
 if p_data?'price' and not private.is_admin() and p_data->'price'<>'null'::jsonb then raise exception 'Fiyatı yalnızca admin değiştirebilir.' using errcode='42501'; end if;
 if length(item.short_description)>4000 or pg_column_size(item.long_description)>262144 or length(item.slug)>300 or length(coalesce(item.origin,''))>160 then raise exception 'Metin sınırı aşıldı.' using errcode='22023'; end if;
 if p_id is null then
 insert into public.products(id,sku,name,slug,brand_id,category_id,short_description,long_description,origin,stock_status,featured,is_new,sort_order,inner_mm,outer_mm,width_mm,specifications,base_code,manufacturer_code,technical_warning,price_mode,seo,status)
 values(item.id,item.sku,item.name,item.slug,item.brand_id,item.category_id,item.short_description,item.long_description,item.origin,item.stock_status,item.featured,item.is_new,item.sort_order,item.inner_mm,item.outer_mm,item.width_mm,item.specifications,item.base_code,item.manufacturer_code,item.technical_warning,item.price_mode,item.seo,item.status);
 else
 update public.products set sku=item.sku,name=item.name,slug=item.slug,brand_id=item.brand_id,category_id=item.category_id,short_description=item.short_description,long_description=item.long_description,origin=item.origin,stock_status=item.stock_status,featured=item.featured,is_new=item.is_new,sort_order=item.sort_order,inner_mm=item.inner_mm,outer_mm=item.outer_mm,width_mm=item.width_mm,specifications=item.specifications,base_code=item.base_code,manufacturer_code=item.manufacturer_code,technical_warning=item.technical_warning,price_mode=item.price_mode,seo=item.seo,status=item.status where id=p_id;
 end if;
 if jsonb_typeof(p_data->'aliases') is distinct from 'array' or jsonb_array_length(p_data->'aliases')>100 or jsonb_typeof(p_data->'media') is distinct from 'array' or jsonb_array_length(p_data->'media')>30 or jsonb_typeof(p_data->'relations') is distinct from 'array' or jsonb_array_length(p_data->'relations')>100 then raise exception 'İlişkili kayıt listesi geçersiz.' using errcode='22023'; end if;
 delete from public.product_aliases where product_id=id_value;
 for value in select * from jsonb_array_elements(p_data->'aliases') loop
 insert into public.product_aliases(id,product_id,code,brand_id,kind) values(gen_random_uuid()::text,id_value,value->>'code',value->>'brand_id',coalesce(value->>'kind','reference'));
 end loop;
 delete from public.product_media where product_id=id_value;
 for value in select * from jsonb_array_elements(p_data->'media') loop
 if not exists(select 1 from public.media_assets a where a.id=value->>'media_id' and a.deleted_at is null and (item.status='draft' or a.status='published')) then raise exception 'Görsel veya PDF bulunamadı/yayınlanmadı.' using errcode='22023'; end if;
 if coalesce((value->>'is_primary')::boolean,false) and exists(select 1 from public.media_assets where id=value->>'media_id' and mime_type='application/pdf') then raise exception 'PDF ana görsel olamaz.' using errcode='22023'; end if;
 insert into public.product_media(id,product_id,media_id,alt_text,sort_order,is_primary) values(gen_random_uuid()::text,id_value,value->>'media_id',coalesce(value->>'alt_text',''),n,coalesce((value->>'is_primary')::boolean,false)); n:=n+1;
 end loop;
 delete from public.product_relations where product_id=id_value; n:=0;
 for value in select * from jsonb_array_elements(p_data->'relations') loop
 if not exists(select 1 from public.products where id=value->>'related_id' and deleted_at is null) then raise exception 'İlişkili ürün bulunamadı.' using errcode='22023'; end if;
 insert into public.product_relations(product_id,related_id,kind,sort_order) values(id_value,value->>'related_id',value->>'kind',n); n:=n+1;
 end loop;
 if private.is_admin() and p_data?'price' then
 if p_data->'price'='null'::jsonb then delete from private.product_prices where product_id=id_value;
 else insert into private.product_prices(product_id,amount,currency) values(id_value,(p_data->'price'->>'amount')::numeric,p_data->'price'->>'currency') on conflict(product_id) do update set amount=excluded.amount,currency=excluded.currency; end if;
 end if;
 if p_data?'inventory' then insert into private.inventory_levels(product_id,quantity,low_threshold) values(id_value,(p_data->'inventory'->>'quantity')::numeric,(p_data->'inventory'->>'low_threshold')::numeric) on conflict(product_id) do update set quantity=excluded.quantity,low_threshold=excluded.low_threshold; end if;
 delete from private.content_drafts where entity_table='products' and entity_id=id_value and owner_id=auth.uid();
 if item.price_mode='visible' and not exists(select 1 from private.product_prices where product_id=id_value) then raise exception 'Fiyat göstermek için admin bir tutar tanımlamalı.' using errcode='22023'; end if;
 return public.admin_product_detail(id_value);
end $$;

create function public.admin_catalog_action(p_kind text,p_id text,p_version int,p_action text) returns jsonb language plpgsql security definer set search_path='' as $$
declare row_data jsonb; copied jsonb; new_id text;
begin perform private.require_catalog();
 if p_kind not in ('products','categories','brands') or p_action not in ('trash','restore','duplicate') or (p_action='duplicate' and p_kind<>'products') then raise exception 'Geçersiz işlem.' using errcode='22023'; end if;
 execute format('select to_jsonb(t) from public.%I t where id=$1 for update',p_kind) into row_data using p_id;
 if row_data is null then raise exception 'Kayıt bulunamadı.' using errcode='P0002'; end if;
 if (row_data->>'lock_version')::int is distinct from p_version then raise exception 'Kayıt değişti. Listeyi yenileyin.' using errcode='40001'; end if;
 if p_action='duplicate' then
 copied:=public.admin_product_detail(p_id); new_id:=gen_random_uuid()::text;
 copied:=copied||jsonb_build_object('slug',left(copied->>'slug',240)||'-kopya-'||left(new_id,8),'name',left(copied->>'name',480)||' (kopya)','status','draft','price_mode',case when private.is_admin() then copied->>'price_mode' else 'quote' end);
 return public.admin_save_product(null,null,copied);
 end if;
 if p_action='trash' and p_kind='categories' and (exists(select 1 from public.categories where parent_id=p_id and deleted_at is null) or exists(select 1 from public.products where category_id=p_id and deleted_at is null)) then raise exception 'Kategoriyi silmeden önce alt kategorileri ve ürünleri taşıyın.' using errcode='22023'; end if;
 if p_action='trash' and p_kind='brands' and exists(select 1 from public.products where brand_id=p_id and deleted_at is null) then raise exception 'Markayı silmeden önce ürünlerin markasını değiştirin.' using errcode='22023'; end if;
 execute format('update public.%I set deleted_at=$1,status=''draft'' where id=$2 returning to_jsonb(%I.*)',p_kind,p_kind) into row_data using case when p_action='trash' then now() else null::timestamptz end,p_id;
 return row_data;
end $$;

create function public.admin_save_taxonomy(p_kind text,p_id text,p_version int,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare old jsonb; merged jsonb; new_id text:=coalesce(p_id,gen_random_uuid()::text); c public.categories; b public.brands; result jsonb;
begin perform private.require_catalog();
 if p_kind not in ('categories','brands') or jsonb_typeof(p_data)<>'object' or pg_column_size(p_data)>131072 then raise exception 'Geçersiz kayıt.' using errcode='22023'; end if;
 if p_id is not null then
 execute format('select to_jsonb(t) from public.%I t where id=$1 for update',p_kind) into old using p_id;
 if old is null then raise exception 'Kayıt bulunamadı.' using errcode='P0002'; end if;
 if (old->>'lock_version')::int is distinct from p_version then raise exception 'Kayıt değişti. Yeniden açın.' using errcode='40001'; end if;
 if old->>'deleted_at' is not null then raise exception 'Önce kaydı geri alın.' using errcode='22023'; end if;
 end if;
 merged:='{"description":"","status":"draft","sort_order":0,"seo":{}}'::jsonb||coalesce(old,'{}')||p_data||jsonb_build_object('id',new_id);
 if length(merged->>'description')>12000 then raise exception 'Açıklama çok uzun.' using errcode='22023'; end if;
 if p_kind='categories' then
 c:=jsonb_populate_record(null::public.categories,merged);
 if c.parent_id is not null and not exists(select 1 from public.categories where id=c.parent_id and deleted_at is null and (c.status='draft' or status='published')) then raise exception 'Üst kategori geçersiz veya yayında değil.' using errcode='22023'; end if;
 if c.image_id is not null and not exists(select 1 from public.media_assets where id=c.image_id and deleted_at is null and mime_type like 'image/%' and (c.status='draft' or status='published')) then raise exception 'Kategori görseli geçersiz/yayınlanmadı.' using errcode='22023'; end if;
 if p_id is null then insert into public.categories(id,parent_id,name,slug,description,image_id,sort_order,seo,status) values(new_id,c.parent_id,c.name,c.slug,c.description,c.image_id,c.sort_order,c.seo,c.status) returning to_jsonb(categories.*) into result;
 else update public.categories set parent_id=c.parent_id,name=c.name,slug=c.slug,description=c.description,image_id=c.image_id,sort_order=c.sort_order,seo=c.seo,status=c.status where id=p_id returning to_jsonb(categories.*) into result; end if;
 if p_data?'template_fields' then
 if not private.valid_specs(p_data->'template_fields') or jsonb_array_length(p_data->'template_fields')>100 then raise exception 'Şablon alanları geçersiz.' using errcode='22023'; end if;
 insert into public.spec_templates(id,name,category_id,fields,status) values('category-'||new_id,c.name||' özellikleri',new_id,p_data->'template_fields','published') on conflict(id) do update set name=excluded.name,fields=excluded.fields;
 end if;
 else
 b:=jsonb_populate_record(null::public.brands,merged);
 if b.logo_id is not null and not exists(select 1 from public.media_assets where id=b.logo_id and deleted_at is null and mime_type like 'image/%' and (b.status='draft' or status='published')) then raise exception 'Logo geçersiz/yayınlanmadı.' using errcode='22023'; end if;
 if p_id is null then insert into public.brands(id,name,slug,description,logo_id,sort_order,status) values(new_id,b.name,b.slug,b.description,b.logo_id,b.sort_order,b.status) returning to_jsonb(brands.*) into result;
 else update public.brands set name=b.name,slug=b.slug,description=b.description,logo_id=b.logo_id,sort_order=b.sort_order,status=b.status where id=p_id returning to_jsonb(brands.*) into result; end if;
 end if; return result;
end $$;

create function public.admin_reorder_taxonomy(p_kind text,p_items jsonb) returns void language plpgsql security definer set search_path='' as $$
declare v jsonb; old jsonb; parent text; count_no int:=0; begin perform private.require_catalog();
 if p_kind not in ('categories','brands') or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 5000 then raise exception 'Geçersiz sıralama.' using errcode='22023'; end if;
 -- Stable lock order prevents deadlocks between overlapping reorders.
 for v in select value from jsonb_array_elements(p_items) order by value->>'id' loop
 execute format('select to_jsonb(t) from public.%I t where id=$1 for update',p_kind) into old using v->>'id';
 if old is null or old->>'deleted_at' is not null or (old->>'lock_version')::int is distinct from (v->>'version')::int then raise exception 'Liste değişti. Yenileyin.' using errcode='40001'; end if;
 if p_kind='categories' then if count_no=0 then parent:=old->>'parent_id'; elsif parent is distinct from old->>'parent_id' then raise exception 'Yalnızca aynı üst kategoride sıralama yapılabilir.' using errcode='22023'; end if; end if; count_no:=count_no+1;
 end loop;
 for v in select value from jsonb_array_elements(p_items) loop
 execute format('update public.%I set sort_order=$1 where id=$2',p_kind) using (v->>'order')::int,v->>'id';
 end loop;
end $$;

create function public.admin_product_draft(p_id text,p_payload jsonb default null,p_clear boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; begin perform private.require_catalog();
 if length(p_id)>160 then raise exception 'Geçersiz kimlik.' using errcode='22023'; end if;
 if p_clear then delete from private.content_drafts where entity_table='products' and entity_id=p_id and owner_id=auth.uid(); return null; end if;
 if p_payload is not null then
 if jsonb_typeof(p_payload)<>'object' or pg_column_size(p_payload)>1048576 then raise exception 'Taslak sınırı aşıldı.' using errcode='22023'; end if;
 insert into private.content_drafts(entity_table,entity_id,owner_id,base_version,payload) values('products',p_id,auth.uid(),coalesce((p_payload->>'lock_version')::int,0),p_payload) on conflict(entity_table,entity_id,owner_id) do update set payload=excluded.payload,base_version=excluded.base_version,updated_at=now();
 end if;
 select jsonb_build_object('payload',payload,'updated_at',updated_at,'base_version',base_version) into result from private.content_drafts where entity_table='products' and entity_id=p_id and owner_id=auth.uid(); return result;
end $$;

-- Registration is service-only: the Edge function verifies JWT, role and decoded bytes.
create function public.register_catalog_media(p_actor uuid,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; begin
 if not exists(select 1 from private.staff_members where user_id=p_actor and active and role in ('admin','editor')) or split_part(p_data->>'object_path','/',1)<>p_actor::text then raise exception 'Yetkisiz medya.' using errcode='42501'; end if;
 perform set_config('request.jwt.claim.sub',p_actor::text,true);
 insert into public.media_assets(id,bucket_id,object_path,mime_type,size_bytes,width,height,sha256,alt_text) values(p_data->>'id','media-originals',p_data->>'object_path',p_data->>'mime_type',(p_data->>'size_bytes')::bigint,(p_data->>'width')::int,(p_data->>'height')::int,p_data->>'sha256',coalesce(p_data->>'alt_text','')) returning to_jsonb(media_assets.*) into result;
 return result;
end $$;

do $$declare f record; begin
 for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('admin_catalog_list','admin_catalog_lookups','admin_product_detail','admin_save_product','admin_catalog_action','admin_save_taxonomy','admin_reorder_taxonomy','admin_product_draft') loop execute format('revoke all on function %s from public,anon',f.signature); execute format('grant execute on function %s to authenticated',f.signature); end loop;
end $$;
revoke all on function private.require_catalog() from public,anon;
grant execute on function private.require_catalog() to authenticated;
revoke all on function public.register_catalog_media(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.register_catalog_media(uuid,jsonb) to service_role;
notify pgrst,'reload schema';

create function public.publish_catalog_media(p_actor uuid,p_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; begin
 if not exists(select 1 from private.staff_members where user_id=p_actor and active and role in ('admin','editor')) then raise exception 'Yetki yok.' using errcode='42501'; end if;
 perform set_config('request.jwt.claim.sub',p_actor::text,true);
 update public.media_assets set bucket_id='media-published',status='published' where id=p_id and deleted_at is null and (object_path like '%/display.webp' or object_path like '%/document.pdf') returning to_jsonb(media_assets.*) into result;
 if result is null then raise exception 'Medya bulunamadı.' using errcode='P0002'; end if;return result;
end $$;
revoke all on function public.publish_catalog_media(uuid,text) from public,anon,authenticated;
grant execute on function public.publish_catalog_media(uuid,text) to service_role;
create table private.media_rate_limits(user_id uuid primary key references auth.users(id),window_start timestamptz not null,requests int not null);
alter table private.media_rate_limits enable row level security;
revoke all on private.media_rate_limits from public,anon,authenticated;
create function public.admin_media_rate_limit() returns boolean language plpgsql security definer set search_path='' as $$
declare n int; begin perform private.require_catalog();
 insert into private.media_rate_limits values(auth.uid(),clock_timestamp(),1) on conflict(user_id) do update set window_start=case when media_rate_limits.window_start<clock_timestamp()-interval '1 minute' then clock_timestamp() else media_rate_limits.window_start end,requests=case when media_rate_limits.window_start<clock_timestamp()-interval '1 minute' then 1 else media_rate_limits.requests+1 end returning requests into n;
 if n>20 then raise exception 'Çok fazla yükleme. Bir dakika sonra tekrar deneyin.' using errcode='P0001'; end if;return true;
end $$;
revoke all on function public.admin_media_rate_limit() from public,anon;
grant execute on function public.admin_media_rate_limit() to authenticated;

-- Only trusted processing may register or modify file metadata. Clients can still read previews via RLS.
revoke insert,update on public.media_assets from authenticated;
-- Generated derivatives/originals are immutable to client Storage writes.
drop policy rt_original_update on storage.objects;
create policy rt_original_update on storage.objects for update to authenticated using(bucket_id='media-originals' and private.is_staff() and split_part(name,'/',1)=auth.uid()::text and name !~ '/(display[.]webp|document[.]pdf|original)$') with check(bucket_id='media-originals' and private.is_staff() and split_part(name,'/',1)=auth.uid()::text and name !~ '/(display[.]webp|document[.]pdf|original)$');
drop policy rt_original_insert on storage.objects;
create policy rt_original_insert on storage.objects for insert to authenticated with check(bucket_id='media-originals' and private.is_staff() and split_part(name,'/',1)=auth.uid()::text and name !~ '/(display[.]webp|document[.]pdf|original)$');
