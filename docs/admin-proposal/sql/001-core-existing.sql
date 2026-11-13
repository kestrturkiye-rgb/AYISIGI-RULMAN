-- Phase 1: schema only. Apply via Supabase migrations / trusted server connection.
revoke create on schema public from public,anon,authenticated;
create schema if not exists private;
create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

create type public.publication_state as enum ('draft','published');
create type public.stock_state as enum ('in_stock','on_order','out_of_stock');
create type public.price_display as enum ('quote','hidden','visible');
create type private.staff_role as enum ('admin','editor');
create type private.quote_state as enum ('new','in_progress','quoted','closed');

create table private.staff_members (
 user_id uuid primary key references auth.users(id) on delete restrict,
 role private.staff_role not null,
 active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create function private.staff_role() returns text language sql stable security definer set search_path = '' as $$
 select role::text from private.staff_members where user_id=auth.uid() and active
$$;
create function private.is_staff() returns boolean language sql stable security definer set search_path = '' as $$
 select coalesce(private.staff_role() in ('admin','editor'),false)
$$;
create function private.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
 select coalesce(private.staff_role()='admin',false)
$$;

create function public.normalize_product_code(value text) returns text language sql immutable parallel safe set search_path = '' as $$
 select regexp_replace(replace(upper(normalize(coalesce(value,''),NFKC)),'İ','I'),'[[:space:]​‐‑‒–—―-]+','','g')
$$;
create function private.valid_specs(value jsonb) returns boolean language sql immutable set search_path = '' as $$
 select jsonb_typeof(value)='array' and not exists (
  select 1 from jsonb_array_elements(case when jsonb_typeof(value)='array' then value else '[]'::jsonb end) item
  where jsonb_typeof(item) <> 'object' or jsonb_typeof(item->'name') is distinct from 'string'
   or length(trim(item->>'name')) not between 1 and 160
   or jsonb_typeof(item->'value') is null or jsonb_typeof(item->'value') not in ('string','number','boolean')
   or length(item->>'value')>4000
   or (item ? 'unit' and item->'unit'<>'null'::jsonb and (jsonb_typeof(item->'unit')<>'string' or length(item->>'unit')>40))
 ) and pg_column_size(value)<=1048576
$$;

create table public.media_assets (
 id text primary key,
 bucket_id text not null check(bucket_id in ('media-originals','media-published')),
 object_path text not null check(object_path !~ '(^|/)\.\.(/|$)' and object_path !~ '^/'),
 mime_type text not null check(mime_type in ('image/jpeg','image/png','image/webp','image/avif','application/pdf')),
 size_bytes bigint not null check(size_bytes between 1 and 26214400),
 width integer check(width>0), height integer check(height>0),
 sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
 alt_text text not null default '',
 status public.publication_state not null default 'draft',
 deleted_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 lock_version integer not null default 1,
 unique(bucket_id,object_path),
 check(status<>'published' or bucket_id='media-published')
);
create table public.media_variants (
 id text primary key,media_id text not null references public.media_assets(id) on delete restrict,
 label text not null,object_path text not null,mime_type text not null default 'image/webp',
 width integer not null check(width>0),height integer not null check(height>0),
 size_bytes bigint not null check(size_bytes>0),sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
 unique(media_id,label)
);
create table public.brands (
 id text primary key, name text not null check(length(trim(name)) between 1 and 160),
 slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 description text not null default '', logo_id text references public.media_assets(id),
 sort_order integer not null default 0,
 status public.publication_state not null default 'draft', deleted_at timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(), lock_version integer not null default 1
);
create table public.categories (
 id text primary key, parent_id text references public.categories(id) on delete restrict,
 name text not null check(length(trim(name)) between 1 and 160),
 slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 description text not null default '', image_id text references public.media_assets(id),
 sort_order integer not null default 0, seo jsonb not null default '{}' check(jsonb_typeof(seo)='object'),
 status public.publication_state not null default 'draft', deleted_at timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(), lock_version integer not null default 1,
 check(parent_id is distinct from id)
);
create index categories_parent_sort on public.categories(parent_id,sort_order,id);

create table public.products (
 id text primary key,
 sku text not null check(length(trim(sku)) between 1 and 240),
 normalized_code text generated always as (public.normalize_product_code(sku)) stored,
 name text not null check(length(trim(name)) between 1 and 500),
 slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 brand_id text references public.brands(id) on delete restrict,
 category_id text not null references public.categories(id) on delete restrict,
 short_description text not null default '',
 long_description jsonb not null default '{"type":"doc","content":[]}' check(jsonb_typeof(long_description)='object'),
 origin text, stock_status public.stock_state not null default 'on_order',
 featured boolean not null default false, is_new boolean not null default false,
 sort_order integer not null default 0,
 inner_mm numeric check(inner_mm>0),outer_mm numeric check(outer_mm>0),width_mm numeric check(width_mm>0),
 specifications jsonb not null default '[]' check(private.valid_specs(specifications)),
 base_code text,manufacturer_code text,
 image_kind text not null default 'product' check(image_kind in ('product','series','category')),
 technical_warning text,
 price_mode public.price_display not null default 'quote',
 seo jsonb not null default '{}' check(jsonb_typeof(seo)='object'),
 status public.publication_state not null default 'draft',deleted_at timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),lock_version integer not null default 1,
 check(inner_mm is null or outer_mm is null or inner_mm<outer_mm)
);
create index products_code on public.products(normalized_code);
create index products_live_order on public.products(sort_order,id) where status='published' and deleted_at is null;
create index products_dimensions on public.products(inner_mm,outer_mm,width_mm) where status='published' and deleted_at is null;
create index products_brand_category on public.products(brand_id,category_id,status,sort_order,id);
create index products_category on public.products(category_id,status,sort_order,id);
create index products_name_search on public.products using gin (name extensions.gin_trgm_ops);
create index products_sku_search on public.products using gin (normalized_code extensions.gin_trgm_ops);

create table public.product_aliases (
 id text primary key,product_id text not null references public.products(id) on delete restrict,
 code text not null check(length(trim(code)) between 1 and 240),
 brand_id text references public.brands(id),
 normalized_code text generated always as (public.normalize_product_code(code)) stored,
 kind text not null default 'reference' check(kind in ('base','manufacturer','reference')),
 unique(product_id,code,kind)
);
create index aliases_lookup on public.product_aliases(normalized_code,product_id);
create table public.product_media (
 id text primary key,product_id text not null references public.products(id) on delete restrict,
 media_id text not null references public.media_assets(id) on delete restrict,
 alt_text text not null default '',sort_order integer not null default 0,is_primary boolean not null default false,
 unique(product_id,media_id)
);
create unique index product_one_primary_image on public.product_media(product_id) where is_primary;
create index product_media_order on public.product_media(product_id,sort_order,id);
create table public.product_relations (
 product_id text not null references public.products(id) on delete restrict,
 related_id text not null references public.products(id) on delete restrict,
 kind text not null check(kind in ('alternative','variant')),
 sort_order integer not null default 0,
 primary key(product_id,related_id,kind), check(product_id<>related_id)
);
create table public.spec_templates (
 id text primary key,name text not null,category_id text references public.categories(id),
 fields jsonb not null default '[]' check(jsonb_typeof(fields)='array'),
 status public.publication_state not null default 'draft',deleted_at timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),lock_version integer not null default 1
);

create table public.pages (
 id text primary key,slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 title text not null,body jsonb not null default '{}' check(jsonb_typeof(body)='object'),
 seo jsonb not null default '{}' check(jsonb_typeof(seo)='object'),
 status public.publication_state not null default 'draft',deleted_at timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),lock_version integer not null default 1
);
create table public.articles (
 id text primary key,slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 title text not null,topic text not null,summary text not null default '',
 body jsonb not null default '{}' check(jsonb_typeof(body)='object'),
 cover_id text references public.media_assets(id),cover_alt text not null default '',
 reading_minutes integer not null default 1 check(reading_minutes>0),sort_order integer not null default 0,
 seo jsonb not null default '{}' check(jsonb_typeof(seo)='object'),
 status public.publication_state not null default 'draft',deleted_at timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),lock_version integer not null default 1
);
create table public.home_sections (
 id text primary key,kind text not null check(kind in ('technical_search','hero','slider','benefits','catalog','academy','statistics','rich_text','brands','contact')),
 content jsonb not null default '{}' check(jsonb_typeof(content)='object'),
 is_visible boolean not null default true,sort_order integer not null default 0,
 status public.publication_state not null default 'draft',deleted_at timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),lock_version integer not null default 1
);
create table public.menus (
 id text primary key,name text not null,
 status public.publication_state not null default 'draft',deleted_at timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),lock_version integer not null default 1
);
create table public.menu_items (
 id text primary key,menu_id text not null references public.menus(id) on delete restrict,
 parent_id text references public.menu_items(id) on delete restrict,
 label text not null,href text not null check(href ~ '^(#/|https://|mailto:|tel:)'),icon_key text,
 sort_order integer not null default 0,is_visible boolean not null default true,
 check(parent_id is distinct from id)
);
create table public.site_settings (
 key text primary key check(key in ('identity','contact','theme','search','footer','seo','announcements','maintenance','quote_ui')),
 value jsonb not null check(jsonb_typeof(value)='object'),
 updated_at timestamptz not null default now(),lock_version integer not null default 1,
 check(value::text !~* '"(service_role|password|secret|smtp_password|api_key)"[[:space:]]*:')
);
create table public.ui_texts (
 key text primary key,value text not null,updated_at timestamptz not null default now(),lock_version integer not null default 1
);
create table public.content_version (
 singleton boolean primary key default true check(singleton),revision bigint not null default 1,updated_at timestamptz not null default now()
);
insert into public.content_version default values;

-- These tables are never exposed through the public Data API.
create table private.product_prices (
 product_id text primary key references public.products(id) on delete restrict,
 amount numeric(18,4) not null check(amount>=0),currency text not null default 'TRY' check(currency ~ '^[A-Z]{3}$')
);
create table private.product_import_metadata (
 product_id text primary key references public.products(id) on delete restrict,
 source_refs jsonb not null default '[]',raw_image_path text,legacy_detail_chunk integer,data_quality jsonb not null default '{}'
);
create table private.content_drafts (
 id uuid primary key default gen_random_uuid(),entity_table text not null,entity_id text not null,
 owner_id uuid not null references auth.users(id),base_version integer not null,payload jsonb not null,
 updated_at timestamptz not null default now(),unique(entity_table,entity_id,owner_id)
);
create table private.audit_log (
 id bigint generated always as identity primary key,actor_id uuid references auth.users(id),
 entity_table text not null,entity_id text not null,action text not null,
 before_data jsonb,after_data jsonb,created_at timestamptz not null default now()
);
create table private.quotes (
 id uuid primary key default gen_random_uuid(),request_key uuid not null unique,fingerprint text not null,
 customer jsonb not null,customer_note text not null default '',
 status private.quote_state not null default 'new',created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table private.quote_items (
 id uuid primary key default gen_random_uuid(),quote_id uuid not null references private.quotes(id),
 product_id text references public.products(id),snapshot jsonb not null,
 quantity integer not null check(quantity between 1 and 1000000)
);
create table private.quote_notes (
 id uuid primary key default gen_random_uuid(),quote_id uuid not null references private.quotes(id),
 author_id uuid not null references auth.users(id),body text not null,created_at timestamptz not null default now()
);
create table private.notification_outbox (
 id uuid primary key default gen_random_uuid(),quote_id uuid not null references private.quotes(id),
 state text not null default 'queued' check(state in ('queued','sent','failed')),
 attempts integer not null default 0,next_attempt_at timestamptz not null default now(),last_error text,
 unique(quote_id)
);
create table private.integration_settings (
 key text primary key,value jsonb not null default '{}' check(jsonb_typeof(value)='object')
);
create table private.import_runs (
 id uuid primary key default gen_random_uuid(),source_sha256 text not null unique,
 state text not null default 'running' check(state in ('running','completed','failed')),
 counts jsonb not null default '{}',checkpoint jsonb not null default '{}',
 started_at timestamptz not null default now(),completed_at timestamptz
);
create table private.media_usages (
 media_id text not null references public.media_assets(id),entity_table text not null,entity_id text not null,
 field_path text not null,published boolean not null default false,
 primary key(media_id,entity_table,entity_id,field_path)
);


-- Fail closed even if a later migration has not yet been applied.
do $$declare row record;begin
 for row in select schemaname,tablename from pg_tables where schemaname='private' or (schemaname='public' and tablename in
 ('media_assets','media_variants','brands','categories','products','product_aliases','product_media','product_relations','spec_templates','pages','articles','home_sections','menus','menu_items','site_settings','ui_texts','content_version')) loop
  execute format('alter table %I.%I enable row level security',row.schemaname,row.tablename);
  execute format('revoke all on %I.%I from anon,authenticated',row.schemaname,row.tablename);
 end loop;
end $$;
revoke execute on all functions in schema private from public,anon,authenticated;
revoke execute on function public.normalize_product_code(text) from public,anon,authenticated;
