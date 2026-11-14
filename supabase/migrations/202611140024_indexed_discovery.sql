-- A random entry point in a pre-hashed index avoids sorting the full 100k+ catalog on every visit.
create index products_discovery_order on public.products ((md5(id)),id) where status='published' and deleted_at is null;
create or replace function public.get_public_discovery(p_seed uuid,p_size int default 24)
returns jsonb language plpgsql stable security definer set search_path='' set plan_cache_mode=force_custom_plan as $$
declare result jsonb;cursor_hash text:=md5(p_seed::text);
begin
 if p_seed is null or p_size is null or p_size not between 1 and 24 then raise exception 'Geçersiz ürün seçkisi isteği.' using errcode='22023';end if;
 with visible_categories as materialized(select c.id from public.categories c where private.category_is_public(c.id)),
 visible_brands as materialized(select b.id from public.brands b where b.status='published' and b.deleted_at is null),
 forward_rows as materialized(
  select p.id,md5(p.id) rank,0 segment from public.products p
  where p.status='published' and p.deleted_at is null and md5(p.id)>=cursor_hash
   and p.category_id in(select id from visible_categories) and (p.brand_id is null or p.brand_id in(select id from visible_brands))
  order by md5(p.id),p.id limit p_size
 ), wrapped_rows as materialized(
  select p.id,md5(p.id) rank,1 segment from public.products p
  where p.status='published' and p.deleted_at is null and md5(p.id)<cursor_hash
   and p.category_id in(select id from visible_categories) and (p.brand_id is null or p.brand_id in(select id from visible_brands))
  order by md5(p.id),p.id limit greatest(0,p_size-(select count(*)::int from forward_rows))
 ), chosen as(select * from forward_rows union all select * from wrapped_rows)
 select jsonb_build_object('items',coalesce(jsonb_agg(private.public_product_card(p) order by c.segment,c.rank,c.id),'[]'::jsonb)) into result from chosen c join public.products p on p.id=c.id;
 return result;
end $$;
notify pgrst,'reload schema';
