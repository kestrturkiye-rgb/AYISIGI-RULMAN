-- Keep product identities, full model codes, specifications and quote references unchanged.
-- The private map is a reversible snapshot; old public addresses remain reserved aliases.
create table private.product_slug_aliases(
 slug text primary key,
 product_id text not null references public.products(id) on delete cascade,
 created_at timestamptz not null default now()
);
create index product_slug_alias_product on private.product_slug_aliases(product_id);
alter table private.product_slug_aliases enable row level security;
revoke all on private.product_slug_aliases from public,anon,authenticated;
create table private.product_slug_snapshot(
 product_id text primary key references public.products(id) on delete cascade,
 old_slug text not null unique,
 new_slug text not null unique,
 captured_at timestamptz not null default now()
);
alter table private.product_slug_snapshot enable row level security;
revoke all on private.product_slug_snapshot from public,anon,authenticated;

create function private.product_url_part(value text) returns text language sql immutable set search_path='' as $$
 select trim(both '-' from regexp_replace(lower(translate(coalesce(value,''),'İıŞşĞğÜüÖöÇç','iissgguuoocc')),'[^a-z0-9]+','-','g'))
$$;
revoke all on function private.product_url_part(text) from public,anon,authenticated;

create temporary table rt_slug_plan on commit drop as
with source as materialized(
 select p.id,p.slug old_slug,p.sort_order,private.product_url_part(p.sku) code_slug,
  case when b.name is null or b.name='Belirtilmemiş' then '' else private.product_url_part(b.name) end brand_slug,
  coalesce(nullif(private.product_url_part(c.name),''),'urun') category_slug,
  count(*) over(partition by private.product_url_part(p.sku)) code_count
 from public.products p left join public.brands b on b.id=p.brand_id join public.categories c on c.id=p.category_id
), candidates as (
 select *,code_slug||case when code_count>1 and brand_slug<>'' then '-'||brand_slug else '' end candidate
 from source where old_slug ~ '-p-[a-f0-9]{12,}$' and code_slug<>''
), ranked as (
 select *,row_number() over(partition by candidate order by sort_order,id) candidate_rank from candidates
)
select id,old_slug,sort_order,rtrim(left(candidate||case when candidate_rank>1 then '-'||category_slug else '' end,280),'-') new_slug from ranked;
create index rt_slug_plan_id on rt_slug_plan(id);
create index rt_slug_plan_new on rt_slug_plan(new_slug);

-- Resolve normalized-code collisions using readable option suffixes, never database IDs.
do $$declare changed int;iteration int:=0;begin
 loop
  with ranked as(select id,new_slug,row_number() over(partition by new_slug order by sort_order,id) n from rt_slug_plan),
  conflicts as(select r.* from ranked r where n>1 or exists(select 1 from public.products p where p.slug=r.new_slug and p.id<>r.id and not exists(select 1 from rt_slug_plan m where m.id=p.id)))
  update rt_slug_plan m set new_slug=rtrim(left(m.new_slug,260),'-')||'-secenek-'||conflicts.n from conflicts where conflicts.id=m.id;
  get diagnostics changed=row_count;
  exit when changed=0;
  iteration:=iteration+1;if iteration>20 then raise exception 'Ürün adresleri benzersiz oluşturulamadı; hiçbir adres değiştirilmedi.';end if;
 end loop;
 if exists(select 1 from rt_slug_plan where new_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$') then raise exception 'Geçersiz ürün adresi';end if;
end $$;

insert into private.product_slug_snapshot(product_id,old_slug,new_slug) select id,old_slug,new_slug from rt_slug_plan;
insert into private.product_slug_aliases(slug,product_id) select old_slug,id from rt_slug_plan;
update public.products p set slug=m.new_slug from rt_slug_plan m where p.id=m.id and p.slug=m.old_slug;
do $$begin
 if exists(select 1 from private.product_slug_snapshot m join public.products p on p.id=m.product_id where p.slug<>m.new_slug) then raise exception 'Adres güncellemesi doğrulanamadı';end if;
end $$;

create function private.available_product_slug(code text,brand_key text,category_key text,product_key text) returns text language plpgsql security definer set search_path='' as $$
declare base text:=left(private.product_url_part(code),240);candidate text;brand text;category text;step int:=0;begin
 if base='' then raise exception 'Ürün kodundan adres oluşturulamadı.' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtext('rt-product-slug'),hashtext(base));
 select case when name='Belirtilmemiş' then '' else private.product_url_part(name) end into brand from public.brands where id=brand_key;
 select private.product_url_part(name) into category from public.categories where id=category_key;
 candidate:=base;
 while exists(select 1 from public.products where slug=candidate and id<>product_key)
  or exists(select 1 from private.product_slug_aliases where slug=candidate and product_id<>product_key) loop
  step:=step+1;
  candidate:=case when step=1 then rtrim(left(base||'-'||coalesce(nullif(brand,''),nullif(category,''),'urun'),280),'-') else rtrim(left(base||'-'||coalesce(nullif(brand,''),nullif(category,''),'urun'),270),'-')||'-secenek-'||step end;
  if step>10000 then raise exception 'Bu kod için adres oluşturulamadı.' using errcode='22023';end if;
 end loop;
 return candidate;
end $$;
create function private.preserve_product_slug() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.slug is null or new.slug='' or new.slug ~ '-p-[a-f0-9]{12,}$' or new.slug=private.product_url_part(new.sku) then
  new.slug:=private.available_product_slug(new.sku,new.brand_id,new.category_id,new.id);
 end if;
 if exists(select 1 from private.product_slug_aliases where slug=new.slug and product_id<>new.id) then raise exception 'Bu adres başka bir ürünün eski bağlantısıdır.' using errcode='23505';end if;
 if tg_op='UPDATE' and old.slug is distinct from new.slug then
  insert into private.product_slug_aliases(slug,product_id) values(old.slug,old.id) on conflict(slug) do nothing;
  if exists(select 1 from private.product_slug_aliases where slug=old.slug and product_id<>old.id) then raise exception 'Eski ürün adresi çakışıyor.' using errcode='23505';end if;
 end if;
 return new;
end $$;
revoke all on function private.available_product_slug(text,text,text,text),private.preserve_product_slug() from public,anon,authenticated;
create trigger preserve_product_slug before insert or update of slug on public.products for each row execute function private.preserve_product_slug();

create or replace function public.get_public_product_by_slug(p_slug text) returns jsonb language plpgsql stable security definer set search_path='' as $$declare key text;begin
 if p_slug is null or length(p_slug)>400 then raise exception 'Geçersiz ürün adresi.' using errcode='22023';end if;
 select id into key from public.products where slug=p_slug;
 if key is null then select product_id into key from private.product_slug_aliases where slug=p_slug;end if;
 if key is null or not private.product_is_public(key) then return null;end if;
 return public.get_public_products(array[key],true)->0;
end $$;
