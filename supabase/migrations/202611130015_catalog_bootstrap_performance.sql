-- Aggregate the large inventory once; avoid 103 repeated spilled CTE scans.
create or replace function public.get_public_site() returns jsonb language sql stable security definer set search_path='' as $$
 with visible_categories as materialized (
  select c.* from public.categories c where private.category_is_public(c.id)
 ), visible_brands as materialized (
  select b.* from public.brands b where b.status='published' and b.deleted_at is null
 ), inventory as materialized (
  select p.category_id,p.brand_id from public.products p join visible_categories c on c.id=p.category_id
  where p.status='published' and p.deleted_at is null and (p.brand_id is null or p.brand_id in(select id from visible_brands))
 ), brand_counts as materialized (select brand_id,count(*) n from inventory group by brand_id)
 select jsonb_build_object(
  'revision',(select revision from public.content_version where singleton),
  'totalProducts',(select count(*) from inventory),
  'categories',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'parent_id',c.parent_id,'name',c.name,'slug',c.slug,'description',c.description,'image_id',c.image_id,'sort_order',c.sort_order) order by c.sort_order,c.id) from visible_categories c),'[]'::jsonb),
  'brands',coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'name',b.name,'slug',b.slug,'description',b.description,'logo_id',b.logo_id,'sort_order',b.sort_order,'count',coalesce((select n from brand_counts where brand_id=b.id),0)) order by b.sort_order,b.id) from visible_brands b),'[]'::jsonb),
  'categoryCounts',coalesce((select jsonb_object_agg(category_id,n) from (select category_id,count(*) n from inventory group by category_id) counts),'{}'::jsonb),
  'settings',coalesce((select jsonb_object_agg(key,value) from public.site_settings),'{}'::jsonb),
  'uiTexts',coalesce((select jsonb_object_agg(key,value) from public.ui_texts),'{}'::jsonb),
  'pages',coalesce((select jsonb_agg(jsonb_build_object('id',id,'slug',slug,'title',title,'body',body,'seo',seo)) from public.pages where status='published' and deleted_at is null),'[]'::jsonb),
  'home',coalesce((select jsonb_agg(jsonb_build_object('id',id,'kind',kind,'content',content,'sort_order',sort_order) order by sort_order,id) from public.home_sections where status='published' and deleted_at is null and is_visible),'[]'::jsonb),
  'menus',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'menu_id',i.menu_id,'parent_id',i.parent_id,'label',i.label,'href',i.href,'icon_key',i.icon_key,'sort_order',i.sort_order) order by i.sort_order,i.id) from public.menu_items i where private.menu_item_is_public(i.id)),'[]'::jsonb),
  'articles',coalesce((select jsonb_agg(jsonb_build_object('id',id,'slug',slug,'title',title,'topic',topic,'summary',summary,'cover_id',cover_id,'cover_alt',cover_alt,'reading_minutes',reading_minutes,'seo',seo) order by sort_order,id) from public.articles where status='published' and deleted_at is null),'[]'::jsonb)
 )
$$;

