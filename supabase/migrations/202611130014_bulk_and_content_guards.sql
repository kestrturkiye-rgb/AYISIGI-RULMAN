create function public.admin_bulk_products(p_action text,p_items jsonb,p_category text default null) returns jsonb language plpgsql security definer set search_path='' as $$declare v jsonb;p public.products;n int:=0;begin perform private.require_catalog();
 if p_action not in ('publish','draft','trash','category') or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 100 then raise exception 'En fazla 100 ürün seçin.' using errcode='22023';end if;
 if p_action='category' and not exists(select 1 from public.categories where id=p_category and deleted_at is null) then raise exception 'Kategori geçersiz.' using errcode='22023';end if;
 for v in select value from jsonb_array_elements(p_items) order by value->>'id' loop
 select * into p from public.products where id=v->>'id' and deleted_at is null for update;if not found then raise exception 'Ürün bulunamadı.' using errcode='P0002';end if;if p.lock_version is distinct from (v->>'version')::int then raise exception 'Seçili ürünlerden biri değişti. Listeyi yenileyin.' using errcode='PT409';end if;
 if p_action='publish' then
 if exists(select 1 from public.product_media pm join public.media_assets m on m.id=pm.media_id where pm.product_id=p.id and (m.status<>'published' or m.deleted_at is not null)) then raise exception 'Önce ürün görsellerini medya kütüphanesinde yayınlayın.' using errcode='22023';end if;
 update public.products set status='published' where id=p.id;
 if not private.product_is_public(p.id) then raise exception 'Ürünün kategorisi ve markası yayında olmalı.' using errcode='22023';end if;
 elsif p_action='draft' then update public.products set status='draft' where id=p.id;
 elsif p_action='trash' then update public.products set status='draft',deleted_at=now() where id=p.id;
 else
 if p.status='published' and not private.category_is_public(p_category) then raise exception 'Yayındaki ürünler yalnızca yayındaki kategoriye taşınabilir.' using errcode='22023';end if;
 update public.products set category_id=p_category where id=p.id;
 end if;n:=n+1;
 end loop;return jsonb_build_object('updated',n);end $$;
create function public.admin_import_products(p_rows jsonb) returns jsonb language plpgsql security definer set search_path='' as $$declare v jsonb;existing jsonb;result jsonb;ids jsonb:='[]';n int:=0;begin perform private.require_catalog();if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows) not between 1 and 200 or pg_column_size(p_rows)>1048576 then raise exception 'Parti en fazla 200 ürün / 1 MB olabilir.' using errcode='22023';end if;
 for v in select * from jsonb_array_elements(p_rows) loop
 n:=n+1;
 begin
 if nullif(v->>'id','') is not null then existing:=public.admin_product_detail(v->>'id');if (v->>'lock_version')::int is distinct from (existing->>'lock_version')::int then raise exception 'Ürün sürümü değişti.' using errcode='PT409';end if;
 else existing:='{"aliases":[],"media":[],"relations":[],"status":"draft"}'::jsonb;end if;
 result:=public.admin_save_product(nullif(v->>'id',''),(v->>'lock_version')::int,existing||(v->'fields'));ids:=ids||jsonb_build_array(jsonb_build_object('id',result->>'id','version',(result->>'lock_version')::int));
 exception when others then raise exception 'Satır %: %',n,sqlerrm using errcode=sqlstate;end;
 end loop;return jsonb_build_object('updated',n,'items',ids);end $$;
revoke all on function public.admin_bulk_products(text,jsonb,text),public.admin_import_products(jsonb) from public,anon;grant execute on function public.admin_bulk_products(text,jsonb,text),public.admin_import_products(jsonb) to authenticated;
-- Bound usage lists while retaining a conservative non-empty guard for file deletion.
create or replace function private.media_references(p_id text) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(t),'[]') from (
 select 'products' entity,p.id,p.name title from public.product_media pm join public.products p on p.id=pm.product_id where pm.media_id=p_id
 union all select 'brands',id,name from public.brands where logo_id=p_id
 union all select 'categories',id,name from public.categories where image_id=p_id
 union all select 'articles',id,title from public.articles where cover_id=p_id or strpos(body::text,p_id)>0 or strpos(seo::text,p_id)>0
 union all select 'pages',id,title from public.pages where strpos(body::text,p_id)>0 or strpos(seo::text,p_id)>0
 union all select 'home_sections',id,kind from public.home_sections where strpos(content::text,p_id)>0
 union all select 'site_settings',key,key from public.site_settings where strpos(value::text,p_id)>0 limit 50
 )t
$$;
do $$declare definition text;begin
 select pg_get_functiondef('public.admin_media_library(text,integer,text[],boolean)'::regprocedure) into definition;
 definition:=replace(definition,'strpos(lower(m.alt_text||'' ''||m.object_path),lower(p_query))>0','(strpos(lower(m.alt_text||'' ''||m.object_path),lower(p_query))>0 or exists(select 1 from public.product_media pm join public.products p on p.id=pm.product_id where pm.media_id=m.id and strpos(lower(p.sku||'' ''||p.name),lower(p_query))>0))');execute definition;
 select pg_get_functiondef('public.admin_content_list(text,integer,text,boolean)'::regprocedure) into definition;
 definition:=replace(definition,'case when p_entity in (''site_settings'',''ui_texts'') then ''key'' else ''id'' end','case when p_entity in (''site_settings'',''ui_texts'') then ''key'' when p_entity in (''home_sections'',''articles'') then ''sort_order'' else ''id'' end');execute definition;
end $$;
notify pgrst,'reload schema';
