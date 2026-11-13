-- Phase 2 public read API: always published-only, even when called with a staff JWT.
create function private.public_media(media_key text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',m.id,'bucket',m.bucket_id,'path',m.object_path,'alt',m.alt_text,'mime',m.mime_type,
  'variants',coalesce((select jsonb_object_agg(v.label,jsonb_build_object('path',v.object_path,'width',v.width,'height',v.height)) from public.media_variants v where v.media_id=m.id),'{}'::jsonb))
 from public.media_assets m where m.id=media_key and private.media_is_public(m.id)
$$;
create function private.public_product_card(product public.products) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',product.id,'sku',product.sku,'slug',product.slug,'name',product.name,
  'brand_id',product.brand_id,'brand',b.name,'category_id',product.category_id,'category',c.name,
  'short_description',product.short_description,'inner_mm',product.inner_mm,'outer_mm',product.outer_mm,'width_mm',product.width_mm,
  'base_code',product.base_code,'manufacturer_code',product.manufacturer_code,'image_kind',product.image_kind,
  'stock_status',product.stock_status,'price_mode',product.price_mode,'featured',product.featured,'is_new',product.is_new,
  'price',case when product.price_mode='visible' then (select jsonb_build_object('amount',amount,'currency',currency) from private.product_prices where product_id=product.id) else null end,
  'media',(select private.public_media(pm.media_id)||jsonb_build_object('alt',pm.alt_text) from public.product_media pm where pm.product_id=product.id and private.media_is_public(pm.media_id) order by pm.is_primary desc,pm.sort_order,pm.id limit 1))
 from public.categories c left join public.brands b on b.id=product.brand_id where c.id=product.category_id
$$;

create function public.get_public_media(media_ids text[]) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if cardinality(media_ids)>200 then raise exception 'En fazla 200 görsel sorgulanabilir.' using errcode='22023'; end if;
 return coalesce((select jsonb_agg(private.public_media(id)) from public.media_assets where id=any(media_ids) and private.media_is_public(id)),'[]'::jsonb);
end $$;

create function public.get_public_site() returns jsonb language sql stable security definer set search_path='' as $$
 with visible_categories as materialized (
  select c.* from public.categories c where private.category_is_public(c.id)
 ), visible_brands as materialized (
  select b.* from public.brands b where b.status='published' and b.deleted_at is null
 ), inventory as materialized (
  select p.category_id,p.brand_id from public.products p join visible_categories c on c.id=p.category_id
  where p.status='published' and p.deleted_at is null and (p.brand_id is null or p.brand_id in(select id from visible_brands))
 )
 select jsonb_build_object(
  'revision',(select revision from public.content_version where singleton),
  'totalProducts',(select count(*) from inventory),
  'categories',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'parent_id',c.parent_id,'name',c.name,'slug',c.slug,'description',c.description,'image_id',c.image_id,'sort_order',c.sort_order) order by c.sort_order,c.id) from visible_categories c),'[]'::jsonb),
  'brands',coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'name',b.name,'slug',b.slug,'description',b.description,'logo_id',b.logo_id,'sort_order',b.sort_order,'count',(select count(*) from inventory where brand_id=b.id)) order by b.sort_order,b.id) from visible_brands b),'[]'::jsonb),
  'categoryCounts',coalesce((select jsonb_object_agg(category_id,n) from (select category_id,count(*) n from inventory group by category_id) counts),'{}'::jsonb),
  'settings',coalesce((select jsonb_object_agg(key,value) from public.site_settings),'{}'::jsonb),
  'uiTexts',coalesce((select jsonb_object_agg(key,value) from public.ui_texts),'{}'::jsonb),
  'pages',coalesce((select jsonb_agg(jsonb_build_object('id',id,'slug',slug,'title',title,'body',body,'seo',seo)) from public.pages where status='published' and deleted_at is null),'[]'::jsonb),
  'home',coalesce((select jsonb_agg(jsonb_build_object('id',id,'kind',kind,'content',content,'sort_order',sort_order) order by sort_order,id) from public.home_sections where status='published' and deleted_at is null and is_visible),'[]'::jsonb),
  'menus',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'menu_id',i.menu_id,'parent_id',i.parent_id,'label',i.label,'href',i.href,'icon_key',i.icon_key,'sort_order',i.sort_order) order by i.sort_order,i.id) from public.menu_items i where private.menu_item_is_public(i.id)),'[]'::jsonb),
  'articles',coalesce((select jsonb_agg(jsonb_build_object('id',id,'slug',slug,'title',title,'topic',topic,'summary',summary,'cover_id',cover_id,'cover_alt',cover_alt,'reading_minutes',reading_minutes,'seo',seo) order by sort_order,id) from public.articles where status='published' and deleted_at is null),'[]'::jsonb)
 )
$$;

create function public.search_public_catalog(
 p_query text default '',p_code text default null,p_inner numeric default null,p_outer numeric default null,p_width numeric default null,
 p_category text default null,p_brand text default null,p_page integer default 1,p_page_size integer default 24
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;code_query text:=public.normalize_product_code(p_code);text_code text:=public.normalize_product_code(p_query);
begin
 if p_page is null or p_page<1 or p_page>1000000 or p_page_size is null or p_page_size not between 1 and 100
  or length(p_query)>250 or length(p_code)>240 or p_inner<=0 or p_outer<=0 or p_width<=0 or p_inner>=p_outer then
  raise exception 'Arama veya sayfalama değerleri geçersiz.' using errcode='22023';
 end if;
 with recursive visible_categories as materialized (select c.id,c.parent_id,c.name from public.categories c where private.category_is_public(c.id)),
 scope(id) as (
  select id from visible_categories where id=p_category
  union select c.id from visible_categories c join scope s on c.parent_id=s.id
 ), visible_brands as materialized(select id,name from public.brands where status='published' and deleted_at is null),
 matches as materialized (
  select p.id,p.sort_order from public.products p join visible_categories c on c.id=p.category_id left join visible_brands b on b.id=p.brand_id
  where p.status='published' and p.deleted_at is null and (p.brand_id is null or b.id is not null)
   and (p_category is null or p.category_id in(select id from scope)) and (p_brand is null or p.brand_id=p_brand)
   and (p_inner is null or p.inner_mm=p_inner) and (p_outer is null or p.outer_mm=p_outer) and (p_width is null or p.width_mm=p_width)
   and (coalesce(code_query,'')='' or exists(
    select 1 from (select p.normalized_code code union select public.normalize_product_code(p.base_code) union select public.normalize_product_code(p.manufacturer_code)
      union select a.normalized_code from public.product_aliases a where a.product_id=p.id) codes
    where codes.code<>'' and (code_query=codes.code or (coalesce(b.name,'')<>'Belirtilmemiş' and (code_query=public.normalize_product_code(b.name)||codes.code or code_query=codes.code||public.normalize_product_code(b.name))))
   ))
   and (coalesce(trim(p_query),'')='' or strpos(lower(translate(p.sku||' '||p.name||' '||coalesce(b.name,'')||' '||c.name,'Iİ','ıi')),lower(translate(trim(p_query),'Iİ','ıi')))>0
    or exists(select 1 from (select p.normalized_code code union select public.normalize_product_code(p.base_code) union select public.normalize_product_code(p.manufacturer_code)
      union select a.normalized_code from public.product_aliases a where a.product_id=p.id) codes
      where codes.code<>'' and (strpos(codes.code,text_code)>0 or strpos(public.normalize_product_code(b.name)||codes.code,text_code)>0 or strpos(codes.code||public.normalize_product_code(b.name),text_code)>0))
   )
 ), page_ids as (select * from matches order by sort_order,id limit p_page_size offset ((p_page::bigint-1)*p_page_size))
 select jsonb_build_object('items',coalesce((select jsonb_agg(private.public_product_card(p) order by p.sort_order,p.id) from public.products p join page_ids chosen on chosen.id=p.id),'[]'::jsonb),
  'totalCount',(select count(*) from matches),'page',p_page,'pageSize',p_page_size) into result;
 return result;
end $$;

create function public.get_public_products(product_ids text[],include_details boolean default false) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if cardinality(product_ids)>200 then raise exception 'En fazla 200 ürün sorgulanabilir.' using errcode='22023';end if;
 return coalesce((select jsonb_agg(private.public_product_card(p)||case when include_details then
  jsonb_build_object('specifications',p.specifications,'technical_warning',p.technical_warning,'long_description',p.long_description,'origin',p.origin,'seo',p.seo,
   'gallery',coalesce((select jsonb_agg(private.public_media(pm.media_id)||jsonb_build_object('alt',pm.alt_text) order by pm.is_primary desc,pm.sort_order,pm.id) from public.product_media pm where pm.product_id=p.id and private.media_is_public(pm.media_id)),'[]'::jsonb)) else '{}'::jsonb end)
  from public.products p where p.id=any(product_ids) and private.product_is_public(p.id)),'[]'::jsonb);
end $$;
create function public.get_public_article(article_slug text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',a.id,'slug',a.slug,'title',a.title,'topic',a.topic,'summary',a.summary,'body',a.body,'cover_id',a.cover_id,'cover_alt',a.cover_alt,'reading_minutes',a.reading_minutes,'seo',a.seo)
 from public.articles a where a.slug=article_slug and a.status='published' and a.deleted_at is null
$$;
revoke execute on function private.public_media(text),private.public_product_card(public.products) from public,anon,authenticated;
revoke execute on function public.get_public_site(),public.get_public_media(text[]),public.search_public_catalog(text,text,numeric,numeric,numeric,text,text,integer,integer),public.get_public_products(text[],boolean),public.get_public_article(text) from public;
grant execute on function public.get_public_site(),public.get_public_media(text[]),public.search_public_catalog(text,text,numeric,numeric,numeric,text,text,integer,integer),public.get_public_products(text[],boolean),public.get_public_article(text) to anon,authenticated,service_role;
