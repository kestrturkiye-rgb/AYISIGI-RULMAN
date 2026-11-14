-- Add editable legal identity without changing analytics enablement or existing events.
alter table public.site_settings drop constraint site_settings_key_check;
alter table public.site_settings add constraint site_settings_key_check check(key in ('identity','contact','theme','search','footer','seo','announcements','maintenance','quote_ui','analytics','accounts','privacy'));
insert into public.site_settings(key,value) values('privacy','{"controllerName":"","registeredAddress":"","applicationEmail":"","retentionText":"","transferText":"","updatedOn":"14.11.2026"}') on conflict(key) do nothing;
update public.site_settings set value=value||'{"shuffleHome":true}' where key='search' and not value?'shuffleHome';

-- Keep the catalog's stable pagination/search untouched. Only the home discovery uses a fresh seed.
create function public.get_public_discovery(p_seed uuid,p_size int default 24)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if p_seed is null or p_size is null or p_size not between 1 and 24 then raise exception 'Geçersiz ürün seçkisi isteği.' using errcode='22023';end if;
 with visible_categories as materialized(select c.id from public.categories c where private.category_is_public(c.id)),
 visible_brands as materialized(select b.id from public.brands b where b.status='published' and b.deleted_at is null),
 chosen as materialized(
  select p.id,md5(p_seed::text||':'||p.id) rank from public.products p
  where p.status='published' and p.deleted_at is null and p.category_id in(select id from visible_categories)
   and (p.brand_id is null or p.brand_id in(select id from visible_brands))
  order by rank,p.id limit p_size
 )
 select jsonb_build_object('items',coalesce(jsonb_agg(private.public_product_card(p) order by chosen.rank,p.id),'[]'::jsonb)) into result from chosen join public.products p on p.id=chosen.id;
 return result;
end $$;
revoke all on function public.get_public_discovery(uuid,int) from public;
grant execute on function public.get_public_discovery(uuid,int) to anon,authenticated,service_role;

-- Remove all expired analysis records; the old 5,000/day cap could retain them beyond 90 days.
-- Current records and the analytics feature remain intact.
do $$declare definition text;begin
 select pg_get_functiondef('public.prune_site_events()'::regprocedure) into definition;
 definition:=replace(definition,'where id in(select id from private.site_events where occurred_at<now()-interval ''90 days'' limit 5000)','where occurred_at<now()-interval ''90 days''');execute definition;
end $$;
notify pgrst,'reload schema';
