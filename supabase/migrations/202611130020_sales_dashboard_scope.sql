-- Sales dashboards should filter visibility using small taxonomy sets, never recursive lookups per catalog row.
do $$declare definition text;begin
 select pg_get_functiondef('public.get_admin_dashboard(text)'::regprocedure) into definition;
 definition:=replace(definition,'private.product_is_public(p.id)',
 '(p.status=''published'' and p.category_id in(select c.id from public.categories c where private.category_is_public(c.id)) and (p.brand_id is null or p.brand_id in(select b.id from public.brands b where b.status=''published'' and b.deleted_at is null)))');
 execute definition;
end $$;
notify pgrst,'reload schema';
