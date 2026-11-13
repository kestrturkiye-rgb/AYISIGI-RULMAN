-- Derived search index: no per-product correlated alias queries during public searches.
create table private.catalog_search(
 product_id text primary key references public.products(id) on delete cascade,
 search_text text not null,code_text text not null,tokens text[] not null
);
alter table private.catalog_search enable row level security;
revoke all on private.catalog_search from public,anon,authenticated;
grant all on private.catalog_search to service_role;
create function private.refresh_catalog_search(p_id text default null,p_brand text default null,p_category text default null) returns void
language plpgsql security definer set search_path='' set plan_cache_mode=force_custom_plan as $$begin
 with source as materialized(
  select p.id,p.normalized_code,public.normalize_product_code(p.base_code) base,public.normalize_product_code(p.manufacturer_code) manufacturer,
   lower(translate(p.sku||' '||p.name||' '||coalesce(b.name,'')||' '||c.name,'Iİ','ıi')) search_text,
   case when b.name='Belirtilmemiş' then '' else coalesce(public.normalize_product_code(b.name),'') end brand
  from public.products p join public.categories c on c.id=p.category_id left join public.brands b on b.id=p.brand_id
  where (p_id is null or p.id=p_id) and (p_brand is null or p.brand_id=p_brand) and (p_category is null or p.category_id=p_category)
 ),codes as(
  select s.id,code from source s cross join lateral(values(s.normalized_code),(s.base),(s.manufacturer)) v(code) where coalesce(code,'')<>''
  union select a.product_id,a.normalized_code from public.product_aliases a join source s on s.id=a.product_id where a.normalized_code<>''
 ),tokens as(
  select s.id,array_agg(distinct v.code order by v.code) values from source s join codes c on c.id=s.id
  cross join lateral(values(c.code),(s.brand||c.code),(c.code||s.brand))v(code) group by s.id
 ) insert into private.catalog_search(product_id,search_text,code_text,tokens)
 select s.id,s.search_text,array_to_string(coalesce(t.values,'{}'),' '),coalesce(t.values,'{}') from source s left join tokens t on t.id=s.id
 on conflict(product_id) do update set search_text=excluded.search_text,code_text=excluded.code_text,tokens=excluded.tokens;
end $$;
revoke all on function private.refresh_catalog_search(text,text,text) from public,anon,authenticated;
select private.refresh_catalog_search();
create index catalog_search_text on private.catalog_search using gin(search_text extensions.gin_trgm_ops);
create index catalog_search_code_text on private.catalog_search using gin(code_text extensions.gin_trgm_ops);
create index catalog_search_tokens on private.catalog_search using gin(tokens);
create function private.sync_catalog_search() returns trigger language plpgsql security definer set search_path='' as $$begin
 if tg_table_name='products' then perform private.refresh_catalog_search(new.id);
 elsif tg_table_name='product_aliases' then
  if tg_op<>'INSERT' then perform private.refresh_catalog_search(old.product_id);end if;
  if tg_op<>'DELETE' then perform private.refresh_catalog_search(new.product_id);end if;
 elsif tg_table_name='brands' then perform private.refresh_catalog_search(null,new.id,null);
 else perform private.refresh_catalog_search(null,null,new.id);end if;
 return null;
end $$;
revoke all on function private.sync_catalog_search() from public,anon,authenticated;
create trigger products_search_sync after insert or update of sku,name,brand_id,category_id,base_code,manufacturer_code on public.products for each row execute function private.sync_catalog_search();
create trigger aliases_search_sync after insert or update or delete on public.product_aliases for each row execute function private.sync_catalog_search();
create trigger brands_search_sync after update of name on public.brands for each row execute function private.sync_catalog_search();
create trigger categories_search_sync after update of name on public.categories for each row execute function private.sync_catalog_search();
analyze private.catalog_search;

create or replace function public.search_public_catalog(
 p_query text default '',p_code text default null,p_inner numeric default null,p_outer numeric default null,p_width numeric default null,
 p_category text default null,p_brand text default null,p_page integer default 1,p_page_size integer default 24
) returns jsonb language plpgsql stable security definer set search_path='' set plan_cache_mode=force_custom_plan as $$
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
  select p.id,p.sort_order from public.products p join visible_categories c on c.id=p.category_id left join visible_brands b on b.id=p.brand_id join private.catalog_search s on s.product_id=p.id
  where p.status='published' and p.deleted_at is null and (p.brand_id is null or b.id is not null)
   and (p_category is null or p.category_id in(select id from scope)) and (p_brand is null or p.brand_id=p_brand)
   and (p_inner is null or p.inner_mm=p_inner) and (p_outer is null or p.outer_mm=p_outer) and (p_width is null or p.width_mm=p_width)
   and (coalesce(code_query,'')='' or s.tokens @> array[code_query])
   and (coalesce(trim(p_query),'')='' or s.search_text like '%'||replace(replace(replace(lower(translate(trim(p_query),'Iİ','ıi')),'\','\\'),'%','\%'),'_','\_')||'%' escape '\'
    or (text_code<>'' and s.code_text like '%'||replace(replace(replace(text_code,'\','\\'),'%','\%'),'_','\_')||'%' escape '\'))
 ), page_ids as (select * from matches order by sort_order,id limit p_page_size offset ((p_page::bigint-1)*p_page_size))
 select jsonb_build_object('items',coalesce((select jsonb_agg(private.public_product_card(p) order by p.sort_order,p.id) from public.products p join page_ids chosen on chosen.id=p.id),'[]'::jsonb),
  'totalCount',(select count(*) from matches),'page',p_page,'pageSize',p_page_size) into result;
 return result;
end $$;

