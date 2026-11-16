-- Add existing public category identity for semantic product URL generation. No product rows change.
create or replace function public.get_public_sitemap(p_page int default 1,p_size int default 5000) returns jsonb language plpgsql stable security definer set search_path='' set plan_cache_mode=force_custom_plan as $$
declare categories text[];brands text[];result jsonb;begin
 if p_page is null or p_page not between 1 and 100000 or p_size is null or p_size not between 1 and 5000 then raise exception 'Geçersiz site haritası sayfası.' using errcode='22023';end if;
 select array_agg(id) into categories from public.categories where private.category_is_public(id);
 select array_agg(id) into brands from public.brands where status='published' and deleted_at is null;
 select coalesce(jsonb_agg(jsonb_build_object('slug',private.canonical_product_slug(p.id,p.slug),'category_id',p.category_id,'updated_at',p.updated_at) order by p.sort_order,p.id),'[]'::jsonb) into result
 from (select id,category_id,slug,updated_at,sort_order from public.products where status='published' and deleted_at is null and category_id=any(categories) and (brand_id is null or brand_id=any(brands)) order by sort_order,id limit p_size offset ((p_page::bigint-1)*p_size)) p;
 return result;
end $$;
notify pgrst,'reload schema';
