-- Admin adım 1. Transaction yönetimi migration çalıştırıcısındadır.
create function private.is_sales_staff() returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce(private.staff_role() in ('admin','sales'),false)
$$;
revoke all on function private.is_sales_staff() from public,anon;
grant execute on function private.is_sales_staff() to authenticated,service_role;

create table private.customers (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(trim(name)) between 1 and 160),
 company text not null default '' check(length(company)<=240),
 email text check(email is null or length(email) between 3 and 254),
 phone text check(phone is null or length(phone)<=40),
 notes text not null default '' check(length(notes)<=10000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 lock_version integer not null default 1,
 deleted_at timestamptz
);
-- Aynı e-postayı kullanan ayrı müşteriler zorla birleştirilmez.
create index customers_email_lookup on private.customers(lower(email));
create index customers_name_search on private.customers using gin(name extensions.gin_trgm_ops);

alter table private.quotes
 add column customer_id uuid references private.customers(id) on delete restrict,
 add column assigned_to uuid references auth.users(id) on delete restrict,
 add column currency text not null default 'TRY' check(currency ~ '^[A-Z]{3}$'),
 add column valid_until date,
 add column response_note text not null default '' check(length(response_note)<=10000),
 add column lock_version integer not null default 1;
-- Mevcut customer JSON'u, talep anındaki müşteri bilgisi olarak korunur.
-- closed eski talepler için korunur; yeni panelde inceleme gerektiren eski durumdur.
create index quotes_status_created on private.quotes(status,created_at desc,id);
create index quotes_customer_created on private.quotes(customer_id,created_at desc);
create index quotes_assignee on private.quotes(assigned_to,created_at desc);

alter table private.quote_items
 add column unit_price numeric(18,4) check(unit_price>=0),
 add column discount_percent numeric(5,2) not null default 0 check(discount_percent between 0 and 100),
 add column tax_percent numeric(5,2) not null default 0 check(tax_percent between 0 and 100),
 add column position integer not null default 0;
-- Tutarlar sunucuda decimal ile hesaplanır; null fiyat = henüz fiyatlandırılmadı.
create index quote_items_quote on private.quote_items(quote_id,position,id);
create index quote_items_product on private.quote_items(product_id,quote_id);
create index quote_notes_quote on private.quote_notes(quote_id,created_at,id);

create table private.quote_status_history (
 id bigint generated always as identity primary key,
 quote_id uuid not null references private.quotes(id) on delete restrict,
 from_status private.quote_state,
 to_status private.quote_state not null,
 actor_id uuid references auth.users(id) on delete restrict,
 created_at timestamptz not null default now()
);
create index quote_history_lookup on private.quote_status_history(quote_id,created_at,id);

create table private.inventory_levels (
 product_id text primary key references public.products(id) on delete restrict,
 quantity numeric(18,3) check(quantity>=0),
 low_threshold numeric(18,3) check(low_threshold>=0),
 updated_at timestamptz not null default now(),
 lock_version integer not null default 1
);
-- quantity null = sayısal stok bilinmiyor. Kaynak stokları otomatik aktarılmaz.

create table private.staff_notifications (
 id uuid primary key default gen_random_uuid(),
 recipient_id uuid not null references auth.users(id) on delete restrict,
 quote_id uuid not null references private.quotes(id) on delete restrict,
 read_at timestamptz,
 created_at timestamptz not null default now(),
 unique(recipient_id,quote_id)
);
create index staff_notifications_unread on private.staff_notifications(recipient_id,created_at desc) where read_at is null;

-- Sunucu HMAC anahtarıyla üretilmiş istemci özeti; ham IP saklanmaz.
create table private.quote_rate_limits (
 key_hash text not null check(key_hash ~ '^[a-f0-9]{64}$'),
 window_start timestamptz not null,
 attempts integer not null default 1 check(attempts>0),
 expires_at timestamptz not null,
 primary key(key_hash,window_start)
);
create index quote_rate_limits_expiry on private.quote_rate_limits(expires_at);
alter table private.quote_rate_limits enable row level security;
revoke all on private.quote_rate_limits from public,anon,authenticated;
grant all on private.quote_rate_limits to service_role;
-- Kontrol/artırma atomik RPC ile; süresi dolan kayıtlar zamanlanmış servisle silinir.

create table private.quote_documents (
 id uuid primary key default gen_random_uuid(),
 quote_id uuid not null references private.quotes(id) on delete restrict,
 version integer not null check(version>0),
 object_path text not null unique check(object_path !~ '(^|/)\.\.(/|$)' and object_path !~ '^/'),
 sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
 created_by uuid not null references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(),
 unique(quote_id,version)
);

-- Kalıcı audit: müşteri kişisel bilgileri ve teklif fiyatları audit'e kopyalanmaz.
create function private.record_commercial_change() returns trigger
language plpgsql security definer set search_path='' as $$
declare row_data jsonb;
begin
 if auth.uid() is null then return null; end if;
 if tg_op='DELETE' then row_data=to_jsonb(old); else row_data=to_jsonb(new); end if;
 insert into private.audit_log(actor_id,entity_table,entity_id,action)
 values(auth.uid(),tg_table_schema||'.'||tg_table_name,
 coalesce(row_data->>'id',row_data->>'product_id'),lower(tg_op));
 return null;
end $$;
revoke all on function private.record_commercial_change() from public,anon,authenticated;

do $$declare t text;begin
 foreach t in array array['customers','quotes','quote_items','quote_notes','quote_status_history','inventory_levels','staff_notifications','quote_documents'] loop
  execute format('alter table private.%I enable row level security',t);
  execute format('revoke all on private.%I from public,anon,authenticated',t);
  execute format('grant all on private.%I to service_role',t);
  execute format('create trigger commercial_audit after insert or update or delete on private.%I for each row execute function private.record_commercial_change()',t);
 end loop;
end $$;

-- private şeması PostgREST'e açılmaz. Sınırlı public RPC'ler SECURITY INVOKER
-- ile çalışır; aşağıdaki RLS + kolon izinlerini kullanır.
-- Normal istemcinin katalog yazma yetkisi mevcut is_staff(admin/editor) ile sınırlı kalır.
do $$declare t text;begin
 foreach t in array array['customers','quotes','quote_items','quote_notes','quote_status_history','quote_documents'] loop
  execute format('grant select on private.%I to authenticated',t);
  execute format('create policy sales_read on private.%I for select to authenticated using ((select private.is_sales_staff()))',t);
 end loop;
end $$;
grant select on private.inventory_levels to authenticated;
create policy inventory_read on private.inventory_levels for select to authenticated
 using ((select private.is_staff()) or (select private.is_sales_staff()));
-- Stok ve teklif mutasyonları doğrulamalı transactional RPC/Edge Function üzerinden.
-- Burada INSERT/UPDATE/DELETE verilmez; RPC sözleşmeleri README'de listelenmiştir.
grant select on private.staff_notifications to authenticated;
create policy own_notification_read on private.staff_notifications for select to authenticated
 using (recipient_id=(select auth.uid()) and (select private.is_sales_staff()));

grant select on private.audit_log to authenticated;
create policy admin_audit_read on private.audit_log for select to authenticated
 using ((select private.is_admin()));

create trigger customers_touch before update on private.customers
 for each row execute function private.touch_row();
create trigger quotes_touch before update on private.quotes
 for each row execute function private.touch_row();
create trigger inventory_touch before update on private.inventory_levels
 for each row execute function private.touch_row();

-- Talep + kalemleri + outbox aynı transaction'da yazan servis haricinde anonim yazma yok.
-- Güvenilir Edge Function service_role kullanır; doğrulama atlanamaz.
-- Bildirim işleyicisinin kilit/lease ile eşzamanlı çalışması ve tekrar denemesi için:
alter table private.notification_outbox
 add column locked_until timestamptz,
 add column provider_message_id text;
create index notification_outbox_due on private.notification_outbox(next_attempt_at)
 where state in ('queued','failed');

do $$begin
 if exists(select 1 from storage.buckets where id='quote-documents' and public) then
  raise exception 'quote-documents must be private';
 end if;
end $$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('quote-documents','quote-documents',false,10485760,array['application/pdf'])
 on conflict(id) do nothing;
-- PDF müşteriye ancak kısa ömürlü signed URL ile paylaşılır; bucket listesi public olmaz.
create policy quote_document_read on storage.objects for select to authenticated
 using(bucket_id='quote-documents' and (select private.is_sales_staff())
 and exists(select 1 from private.quote_documents d where d.object_path=name));
-- Yükleme/silme yalnızca güvenilir sunucu işlevi.
grant usage,select on all sequences in schema private to service_role;
