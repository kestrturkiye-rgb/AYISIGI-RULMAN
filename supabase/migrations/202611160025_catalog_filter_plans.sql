-- Filter small taxonomy ID arrays once, instead of rejoining taxonomy inside every product match.
-- A covering order index keeps page selection off large product documents.
create index products_public_page on public.products(sort_order,id)
 include(category_id,brand_id,inner_mm,outer_mm,width_mm)
 where status='published' and deleted_at is null;
create or replace function public.search_public_catalog(
 p_query text default '',p_code text default null,p_inner numeric default null,p_outer numeric default null,p_width numeric default null,
 p_category text default null,p_brand text default null,p_page integer default 1,p_page_size integer default 24
) returns jsonb language plpgsql stable security definer set search_path='' set plan_cache_mode=force_custom_plan as $$
declare result jsonb;code_query text:=public.normalize_product_code(p_code);text_code text:=public.normalize_product_code(p_query);
 category_ids text[];brand_ids text[];
begin
 if p_page is null or p_page<1 or p_page>1000000 or p_page_size is null or p_page_size not between 1 and 100
  or length(p_query)>250 or length(p_code)>240 or p_inner<=0 or p_outer<=0 or p_width<=0 or p_inner>=p_outer then
  raise exception 'Arama veya sayfalama değerleri geçersiz.' using errcode='22023';
 end if;
 with recursive visible as materialized(select c.id,c.parent_id from public.categories c where private.category_is_public(c.id)),
 scope(id) as(select id from visible where p_category is null or id=p_category
  union select c.id from visible c join scope s on c.parent_id=s.id)
 select coalesce(array_agg(id),'{}'::text[]) into category_ids from scope;
 select coalesce(array_agg(id),'{}'::text[]) into brand_ids from public.brands
  where status='published' and deleted_at is null and (p_brand is null or id=p_brand);
 if coalesce(trim(p_query),'')='' and coalesce(code_query,'')='' then
  with total as(select count(*) n from public.products p where p.status='published' and p.deleted_at is null
   and p.category_id=any(category_ids) and ((p_brand is null and p.brand_id is null) or p.brand_id=any(brand_ids))
   and (p_inner is null or p.inner_mm=p_inner) and (p_outer is null or p.outer_mm=p_outer) and (p_width is null or p.width_mm=p_width)),
  chosen as materialized(select p.id,p.sort_order from public.products p where p.status='published' and p.deleted_at is null
   and p.category_id=any(category_ids) and ((p_brand is null and p.brand_id is null) or p.brand_id=any(brand_ids))
   and (p_inner is null or p.inner_mm=p_inner) and (p_outer is null or p.outer_mm=p_outer) and (p_width is null or p.width_mm=p_width)
   order by p.sort_order,p.id limit p_page_size offset ((p_page::bigint-1)*p_page_size))
  select jsonb_build_object('items',coalesce((select jsonb_agg(private.public_product_card(p) order by c.sort_order,c.id)
   from chosen c join public.products p on p.id=c.id),'[]'::jsonb),'totalCount',(select n from total),'page',p_page,'pageSize',p_page_size) into result;
  return result;
 end if;
 with hits as materialized(select product_id from private.catalog_search
  where (coalesce(code_query,'')='' or tokens @> array[code_query])
   and (coalesce(trim(p_query),'')='' or search_text like '%'||replace(replace(replace(lower(translate(trim(p_query),'Iİ','ıi')),'\','\\'),'%','\%'),'_','\_')||'%' escape '\'
    or (text_code<>'' and code_text like '%'||replace(replace(replace(text_code,'\','\\'),'%','\%'),'_','\_')||'%' escape '\'))),
 matches as materialized(select p.id,p.sort_order from public.products p where p.status='published' and p.deleted_at is null
  and p.category_id=any(category_ids) and ((p_brand is null and p.brand_id is null) or p.brand_id=any(brand_ids))
  and (p_inner is null or p.inner_mm=p_inner) and (p_outer is null or p.outer_mm=p_outer) and (p_width is null or p.width_mm=p_width)
  and p.id in(select product_id from hits)),
 chosen as materialized(select id,sort_order from matches order by sort_order,id limit p_page_size offset ((p_page::bigint-1)*p_page_size))
 select jsonb_build_object('items',coalesce((select jsonb_agg(private.public_product_card(p) order by c.sort_order,c.id)
  from chosen c join public.products p on p.id=c.id),'[]'::jsonb),'totalCount',(select count(*) from matches),'page',p_page,'pageSize',p_page_size) into result;
 return result;
end $$;
analyze public.products;
