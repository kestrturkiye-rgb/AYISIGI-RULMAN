-- Count visible catalog rows without reading descriptions, specifications or TOAST data.
create index products_public_counts on public.products(category_id,brand_id)
 where status='published' and deleted_at is null;
analyze public.products;
