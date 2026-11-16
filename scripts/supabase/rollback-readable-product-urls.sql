-- Emergency canonical URL reversal without deleting maps or rewriting product data.
-- New URLs remain resolvable and redirect to the preserved original addresses.
begin;
create or replace function private.canonical_product_slug(product_key text,stored_slug text)
returns text language sql stable security definer set search_path='' as $$select stored_slug$$;
update public.content_version set revision=revision+1,updated_at=now() where singleton;
commit;
-- During emergency rollback, keep URL editing paused until the canonical helper is restored.
