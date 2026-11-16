-- Emergency reversal of this migration's URL values only. Never run during normal setup.
-- The WHERE condition preserves any URL explicitly edited after migration.
begin;
set local lock_timeout='8s';
alter table public.products disable trigger preserve_product_slug;
insert into private.product_slug_aliases(slug,product_id)
 select p.slug,p.id from public.products p join private.product_slug_snapshot m on m.product_id=p.id where p.slug=m.new_slug
 on conflict(slug) do nothing;
update public.products p set slug=m.old_slug from private.product_slug_snapshot m
 where p.id=m.product_id and p.slug=m.new_slug;
alter table public.products enable trigger preserve_product_slug;
commit;
