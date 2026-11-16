create function public.get_public_product_by_slug(p_slug text) returns jsonb language plpgsql stable security definer set search_path='' as $$declare key text;begin
 if p_slug is null or length(p_slug)>400 then raise exception 'Geçersiz ürün adresi.' using errcode='22023';end if;
 select id into key from public.products p where slug=p_slug and private.product_is_public(p.id);
 if key is null then return null;end if;
 return public.get_public_products(array[key],true)->0;
end $$;
create function public.get_public_sitemap(p_page int default 1,p_size int default 5000) returns jsonb language plpgsql stable security definer set search_path='' set plan_cache_mode=force_custom_plan as $$
declare categories text[];brands text[];result jsonb;begin
 if p_page is null or p_page not between 1 and 100000 or p_size is null or p_size not between 1 and 5000 then raise exception 'Geçersiz site haritası sayfası.' using errcode='22023';end if;
 select array_agg(id) into categories from public.categories where private.category_is_public(id);
 select array_agg(id) into brands from public.brands where status='published' and deleted_at is null;
 select coalesce(jsonb_agg(jsonb_build_object('slug',p.slug,'updated_at',p.updated_at) order by p.sort_order,p.id),'[]'::jsonb) into result
 from (select id,slug,updated_at,sort_order from public.products where status='published' and deleted_at is null and category_id=any(categories) and (brand_id is null or brand_id=any(brands)) order by sort_order,id limit p_size offset ((p_page::bigint-1)*p_size)) p;
 return result;
end $$;
revoke all on function public.get_public_product_by_slug(text),public.get_public_sitemap(int,int) from public;
grant execute on function public.get_public_product_by_slug(text),public.get_public_sitemap(int,int) to anon,authenticated,service_role;

update public.site_settings set value=jsonb_build_object('adsId','','adsLeadLabel','','searchConsoleVerification','')||value where key='seo';
