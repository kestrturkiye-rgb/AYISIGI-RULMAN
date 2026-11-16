-- Canonical URLs use a compact private map. Original product rows/addresses stay intact.
-- This avoids rewriting 111k products or duplicating all legacy URLs on the free database.
create table private.product_urls(
 product_id text primary key references public.products(id) on delete cascade,
 slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 updated_at timestamptz not null default now()
);
create table private.product_slug_aliases(
 slug text primary key,
 product_id text not null references public.products(id) on delete cascade,
 created_at timestamptz not null default now()
);
create index product_slug_alias_product on private.product_slug_aliases(product_id);
alter table private.product_urls enable row level security;
alter table private.product_slug_aliases enable row level security;
revoke all on private.product_urls,private.product_slug_aliases from public,anon,authenticated;
create function private.product_url_part(value text) returns text language sql immutable set search_path='' as $$
 select trim(both '-' from regexp_replace(lower(translate(coalesce(value,''),'İıŞşĞğÜüÖöÇç','iissgguuoocc')),'[^a-z0-9]+','-','g'))
$$;
create function private.canonical_product_slug(product_key text,stored_slug text) returns text language sql stable security definer set search_path='' as $$
 select coalesce((select slug from private.product_urls where product_id=product_key),stored_slug)
$$;
revoke all on function private.product_url_part(text),private.canonical_product_slug(text,text) from public,anon,authenticated;
-- Reserve existing hand-written addresses first. Do not alter any product row.
insert into private.product_urls(product_id,slug) select id,slug from public.products where slug !~ '-p-[a-f0-9]{12,}$';
do $$declare item record;candidate text;base text;option_no int;begin
 for item in
  with codes as(select p.id,p.sort_order,private.product_url_part(p.sku) code_slug,
   case when b.name is null or b.name='Belirtilmemiş' then '' else private.product_url_part(b.name) end brand_slug,
   coalesce(nullif(private.product_url_part(c.name),''),'urun') category_slug,
   count(*) over(partition by private.product_url_part(p.sku)) code_count
   from public.products p left join public.brands b on b.id=p.brand_id join public.categories c on c.id=p.category_id
   where p.slug ~ '-p-[a-f0-9]{12,}$')
  select * from codes order by sort_order,id
 loop
  if item.code_slug='' then continue;end if;
  base:=rtrim(left(item.code_slug||case when item.code_count>1 and item.brand_slug<>'' then '-'||item.brand_slug else '' end,270),'-');
  candidate:=base;option_no:=0;
  while exists(select 1 from private.product_urls where slug=candidate)
   or exists(select 1 from public.products where slug=candidate and id<>item.id) loop
   option_no:=option_no+1;
   candidate:=rtrim(left(base||'-'||item.category_slug,260),'-')||case when option_no>1 then '-secenek-'||option_no else '' end;
   if option_no>10000 then raise exception 'Ürün adresleri benzersiz oluşturulamadı';end if;
  end loop;
  insert into private.product_urls(product_id,slug) values(item.id,candidate);
 end loop;
end $$;
-- Keep the existing security-definer functions and all role checks; replace only slug output.
do $$declare definition text;begin
 definition:=pg_get_functiondef('private.public_product_card(public.products)'::regprocedure);
 if strpos(definition,'''slug'',product.slug')=0 then raise exception 'Public ürün adres alanı bulunamadı';end if;
 execute replace(definition,'''slug'',product.slug','''slug'',private.canonical_product_slug(product.id,product.slug)');
 definition:=pg_get_functiondef('public.admin_product_detail(text)'::regprocedure);
 if strpos(definition,'select to_jsonb(p)||jsonb_build_object(')=0 then raise exception 'Admin ürün ayrıntısı bulunamadı';end if;
 execute replace(definition,'select to_jsonb(p)||jsonb_build_object(','select to_jsonb(p)||jsonb_build_object(''slug'',private.canonical_product_slug(p.id,p.slug))||jsonb_build_object(');
 definition:=pg_get_functiondef('public.admin_catalog_list(jsonb)'::regprocedure);
 if strpos(definition,'p.id,p.sku,p.name,p.slug,p.brand_id')=0 then raise exception 'Admin ürün listesi bulunamadı';end if;
 execute replace(definition,'p.id,p.sku,p.name,p.slug,p.brand_id','p.id,p.sku,p.name,private.canonical_product_slug(p.id,p.slug) slug,p.brand_id');
end $$;
create function private.available_product_slug(code text,brand_key text,category_key text,product_key text) returns text language plpgsql security definer set search_path='' as $$
declare base text:=left(private.product_url_part(code),240);candidate text;brand text;category text;step int:=0;begin
 if base='' then raise exception 'Ürün kodundan adres oluşturulamadı.' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtext('rt-product-slug'),hashtext(base));
 select case when name='Belirtilmemiş' then '' else private.product_url_part(name) end into brand from public.brands where id=brand_key;
 select private.product_url_part(name) into category from public.categories where id=category_key;
 candidate:=base;
 while exists(select 1 from public.products where slug=candidate and id<>product_key)
  or exists(select 1 from private.product_urls where slug=candidate and product_id<>product_key)
  or exists(select 1 from private.product_slug_aliases where slug=candidate and product_id<>product_key) loop
  step:=step+1;
  candidate:=case when step=1 then rtrim(left(base||'-'||coalesce(nullif(brand,''),nullif(category,''),'urun'),280),'-') else rtrim(left(base||'-'||coalesce(nullif(brand,''),nullif(category,''),'urun'),270),'-')||'-secenek-'||step end;
  if step>10000 then raise exception 'Bu kod için adres oluşturulamadı.' using errcode='22023';end if;
 end loop;
 return candidate;
end $$;
create function private.preserve_product_slug() returns trigger language plpgsql security definer set search_path='' as $$
declare current_slug text;desired text;begin
 if tg_op='UPDATE' then
  current_slug:=private.canonical_product_slug(old.id,old.slug);
  if new.slug=old.slug or new.slug=current_slug then new.slug:=old.slug;return new;end if;
 end if;
 desired:=new.slug;
 if desired is null or desired='' or desired ~ '-p-[a-f0-9]{12,}$' or desired=private.product_url_part(new.sku) then
  desired:=private.available_product_slug(new.sku,new.brand_id,new.category_id,new.id);
 end if;
 if exists(select 1 from private.product_urls where slug=desired and product_id<>new.id)
  or exists(select 1 from private.product_slug_aliases where slug=desired and product_id<>new.id)
  or exists(select 1 from public.products where slug=desired and id<>new.id) then raise exception 'Bu adres başka bir ürüne aittir.' using errcode='23505';end if;
 if tg_op='UPDATE' then
  insert into private.product_slug_aliases(slug,product_id) values(current_slug,old.id) on conflict(slug) do nothing;
  if exists(select 1 from private.product_slug_aliases where slug=current_slug and product_id<>old.id) then raise exception 'Eski ürün adresi çakışıyor.' using errcode='23505';end if;
  insert into private.product_urls(product_id,slug) values(old.id,desired) on conflict(product_id) do update set slug=excluded.slug,updated_at=now();
  if auth.uid() is not null then insert into private.audit_log(actor_id,entity_table,entity_id,action,before_data,after_data) values(auth.uid(),'public.products',old.id,'update_url',jsonb_build_object('slug',current_slug),jsonb_build_object('slug',desired));end if;
  new.slug:=old.slug;
 else new.slug:=desired;end if;
 return new;
end $$;
create function private.register_product_url() returns trigger language plpgsql security definer set search_path='' as $$begin
 insert into private.product_urls(product_id,slug) values(new.id,new.slug);
 return null;
end $$;
revoke all on function private.available_product_slug(text,text,text,text),private.preserve_product_slug(),private.register_product_url() from public,anon,authenticated;
create trigger preserve_product_slug before insert or update of slug on public.products for each row execute function private.preserve_product_slug();
create trigger register_product_url after insert on public.products for each row execute function private.register_product_url();
create or replace function public.get_public_product_by_slug(p_slug text) returns jsonb language plpgsql stable security definer set search_path='' as $$declare key text;begin
 if p_slug is null or length(p_slug)>400 then raise exception 'Geçersiz ürün adresi.' using errcode='22023';end if;
 select product_id into key from private.product_urls where slug=p_slug;
 if key is null then select id into key from public.products where slug=p_slug;end if;
 if key is null then select product_id into key from private.product_slug_aliases where slug=p_slug;end if;
 if key is null or not private.product_is_public(key) then return null;end if;
 return public.get_public_products(array[key],true)->0;
end $$;
create or replace function public.get_public_sitemap(p_page int default 1,p_size int default 5000) returns jsonb language plpgsql stable security definer set search_path='' set plan_cache_mode=force_custom_plan as $$
declare categories text[];brands text[];result jsonb;begin
 if p_page is null or p_page not between 1 and 100000 or p_size is null or p_size not between 1 and 5000 then raise exception 'Geçersiz site haritası sayfası.' using errcode='22023';end if;
 select array_agg(id) into categories from public.categories where private.category_is_public(id);
 select array_agg(id) into brands from public.brands where status='published' and deleted_at is null;
 select coalesce(jsonb_agg(jsonb_build_object('slug',private.canonical_product_slug(p.id,p.slug),'updated_at',p.updated_at) order by p.sort_order,p.id),'[]'::jsonb) into result
 from (select id,slug,updated_at,sort_order from public.products where status='published' and deleted_at is null and category_id=any(categories) and (brand_id is null or brand_id=any(brands)) order by sort_order,id limit p_size offset ((p_page::bigint-1)*p_size)) p;
 return result;
end $$;
-- Readers see the new URLs without updating or copying the original product records.
analyze private.product_urls;
update public.content_version set revision=revision+1,updated_at=now() where singleton;
