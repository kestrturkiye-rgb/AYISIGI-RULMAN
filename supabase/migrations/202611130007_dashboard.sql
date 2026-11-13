-- Admin step 2: bounded, role-aware dashboard read API. No customer/table mutations.
create index quotes_dashboard_created on private.quotes(created_at desc,id);
create function public.get_admin_dashboard(p_period text default 'week') returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
 staff text:=private.staff_role();
 current_time_utc timestamptz:=now();
 today_start timestamptz:=(date_trunc('day',now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul');
 week_start timestamptz:=(date_trunc('week',now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul');
 period_start timestamptz;
 catalog_data jsonb:=null; quote_data jsonb:=null;
 recent_data jsonb:='[]'; popular_data jsonb:='[]'; stock_data jsonb:='[]';
 stock_count bigint; unknown_stock bigint;
begin
 if staff is null or staff not in ('admin','editor','sales') then
  raise exception 'Bu işlem için yetkiniz yok.' using errcode='42501';
 end if;
 if p_period is null or p_period not in ('today','week') then
  raise exception 'Geçersiz tarih aralığı.' using errcode='22023';
 end if;
 period_start:=case when p_period='today' then today_start else week_start end;
 if staff in ('admin','editor') then
  with visible_categories as materialized(select id from public.categories where private.category_is_public(id)),
  visible_brands as materialized(select id from public.brands where status='published' and deleted_at is null)
  select jsonb_build_object('total',count(*),'drafts',count(*) filter(where p.status='draft'),
   'published',count(*) filter(where p.status='published' and p.category_id in(select id from visible_categories)
    and (p.brand_id is null or p.brand_id in(select id from visible_brands)))) into catalog_data
  from public.products p where p.deleted_at is null;
 end if;
 select count(*) filter(where i.quantity is not null and i.low_threshold is not null and i.quantity<=i.low_threshold),
  count(*) filter(where i.quantity is null)
 into stock_count,unknown_stock
 from public.products p left join private.inventory_levels i on i.product_id=p.id
 where p.deleted_at is null and (staff<>'sales' or private.product_is_public(p.id));
 select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) into stock_data from (
  select p.id,p.sku,p.name,i.quantity,i.low_threshold as threshold
  from private.inventory_levels i join public.products p on p.id=i.product_id
  where p.deleted_at is null and i.quantity is not null and i.low_threshold is not null and i.quantity<=i.low_threshold
   and (staff<>'sales' or private.product_is_public(p.id))
  order by (i.quantity-i.low_threshold),p.sku,p.id limit 5
 ) t;
 if staff in ('admin','sales') then
  select jsonb_build_object('today',count(*) filter(where q.created_at>=today_start),
   'week',count(*) filter(where q.created_at>=week_start),
   'periodTotal',count(*) filter(where q.created_at>=period_start),
   'pending',count(*) filter(where q.status in ('new','in_progress')),
   'new',count(*) filter(where q.status='new'),
   'statuses',(select coalesce(jsonb_agg(to_jsonb(s)),'[]'::jsonb) from (
     select status::text as status,count(*) as count from private.quotes
     where created_at>=period_start and created_at<=current_time_utc group by status order by status
   ) s)) into quote_data from private.quotes q where q.created_at<=current_time_utc;
  select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) into recent_data from (
   select q.id,q.status::text,q.created_at,
    left(coalesce(nullif(q.customer->>'company',''),nullif(q.customer->>'name',''),nullif(q.customer->>'customer',''),'İsimsiz talep'),240) as customer,
    (select count(*) from private.quote_items i where i.quote_id=q.id) as lines,
    (select coalesce(sum(i.quantity),0) from private.quote_items i where i.quote_id=q.id) as quantity
   from private.quotes q where q.created_at>=period_start and q.created_at<=current_time_utc
   order by q.created_at desc,q.id limit 5
  ) t;
  select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) into popular_data from (
   select i.product_id,
    left(coalesce(nullif(i.snapshot->>'sku',''),nullif(i.snapshot->>'code',''),p.sku,'Serbest ürün'),240) as sku,
    left(coalesce(nullif(i.snapshot->>'name',''),p.name,'Ürün'),500) as name,
    sum(i.quantity) as quantity,count(distinct i.quote_id) as requests
   from private.quote_items i join private.quotes q on q.id=i.quote_id left join public.products p on p.id=i.product_id
   where q.created_at>=period_start and q.created_at<=current_time_utc
   group by i.product_id,2,3 order by quantity desc,requests desc,sku,name limit 5
  ) t;
 end if;
 return jsonb_build_object('role',staff,'generatedAt',current_time_utc,
  'period',p_period,'periodStart',period_start,'timezone','Europe/Istanbul',
  'catalog',catalog_data,'quotes',quote_data,'recentQuotes',recent_data,'topProducts',popular_data,
  'stock',jsonb_build_object('lowCount',stock_count,'unknownCount',unknown_stock,'items',stock_data));
end $$;
revoke all on function public.get_admin_dashboard(text) from public,anon;
grant execute on function public.get_admin_dashboard(text) to authenticated;
