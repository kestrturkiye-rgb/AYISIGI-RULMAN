-- Remaining admin workspace. Caller roles are checked in every RPC, independently of UI routing.
create function private.require_admin() returns void language plpgsql stable security definer set search_path='' as $$begin if not private.is_admin() then raise exception 'Yönetici yetkisi gerekli.' using errcode='42501';end if;end $$;
create function private.require_sales() returns void language plpgsql stable security definer set search_path='' as $$begin if not private.is_sales_staff() then raise exception 'Teklif yönetim yetkisi gerekli.' using errcode='42501';end if;end $$;
revoke all on function private.require_admin(),private.require_sales() from public,anon;
grant execute on function private.require_admin(),private.require_sales() to authenticated;

alter table public.media_assets add column external_url text check(external_url is null or external_url ~ '^https://kestrturkiye-rgb[.]github[.]io/AYISIGI-RULMAN/(catalog|brand)/[A-Za-z0-9_./%+() -]+[.](webp|png|jpg|jpeg)$');
create or replace function private.public_media(media_key text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',m.id,'bucket',m.bucket_id,'path',m.object_path,'url',m.external_url,'alt',m.alt_text,'mime',m.mime_type,
 'variants',case when m.external_url is not null then '{}'::jsonb else coalesce((select jsonb_object_agg(v.label,jsonb_build_object('path',v.object_path,'width',v.width,'height',v.height)) from public.media_variants v where v.media_id=m.id),'{}'::jsonb) end)
 from public.media_assets m where m.id=media_key and private.media_is_public(m.id)
$$;
do $$declare definition text;begin select pg_get_functiondef('public.admin_product_detail(text)'::regprocedure) into definition;execute replace(definition,'''object_path'',a.object_path','''object_path'',a.object_path,''external_url'',a.external_url');end $$;

-- Public settings cannot hold delivery secrets or privileged tokens.
alter table public.site_settings drop constraint site_settings_key_check;
alter table public.site_settings add constraint site_settings_key_check check(key in ('identity','contact','theme','search','footer','seo','announcements','maintenance','quote_ui','analytics','accounts'));
alter table public.site_settings add constraint settings_size check(pg_column_size(value)<=131072);

create function public.admin_content_list(p_entity text,p_page int default 1,p_query text default '',p_deleted boolean default false) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;predicate text;begin perform private.require_catalog();
 if p_entity not in ('pages','articles','home_sections','menus','ui_texts','site_settings') or p_page not between 1 and 100000 or length(p_query)>240 then raise exception 'Geçersiz içerik sorgusu.' using errcode='22023';end if;
 if p_entity='site_settings' then perform private.require_admin();end if;
 predicate:=case when p_entity in ('ui_texts','site_settings') then 'true' else case when p_deleted then 'deleted_at is not null' else 'deleted_at is null' end end;
 execute format('with filtered as (select * from public.%I t where %s and ($1='''' or strpos(lower(to_jsonb(t)::text),lower($1))>0)),page as (select * from filtered order by %I limit 100 offset $2) select jsonb_build_object(''total'',(select count(*) from filtered),''items'',coalesce((select jsonb_agg(to_jsonb(page)) from page),''[]''::jsonb))',p_entity,predicate,case when p_entity in ('site_settings','ui_texts') then 'key' else 'id' end) into result using p_query,(p_page-1)*100;
 if p_entity='menus' then result:=jsonb_set(result,'{items}',coalesce((select jsonb_agg(item||jsonb_build_object('items',(select coalesce(jsonb_agg(to_jsonb(i) order by i.sort_order,i.id),'[]') from public.menu_items i where i.menu_id=item->>'id'))) from jsonb_array_elements(result->'items') item),'[]'));end if;
 return result;end $$;

create function public.admin_save_content(p_entity text,p_id text,p_version int,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare current_data jsonb;merged jsonb;result jsonb;new_id text:=coalesce(p_id,gen_random_uuid()::text);row_page public.pages;row_article public.articles;row_home public.home_sections;row_menu public.menus;v jsonb;
begin perform private.require_catalog();
 if p_entity not in ('pages','articles','home_sections','menus','ui_texts','site_settings') or jsonb_typeof(p_data)<>'object' or pg_column_size(p_data)>524288 then raise exception 'İçerik geçersiz veya çok büyük.' using errcode='22023';end if;
 if p_entity='site_settings' then perform private.require_admin();end if;
 if p_entity in ('ui_texts','site_settings') then
  if p_id is null or length(p_id)>240 then raise exception 'Ayar/metin anahtarı gerekli.' using errcode='22023';end if;
  execute format('select to_jsonb(t) from public.%I t where key=$1 for update',p_entity) into current_data using p_id;
 else
  if p_id is not null then execute format('select to_jsonb(t) from public.%I t where id=$1 for update',p_entity) into current_data using p_id;if current_data is null then raise exception 'Kayıt bulunamadı.' using errcode='P0002';end if;end if;
 end if;
 if current_data is not null and (current_data->>'lock_version')::int is distinct from p_version then raise exception 'Kayıt başka bir kullanıcı tarafından değiştirildi. Yenileyin.' using errcode='PT409';end if;
 if current_data->>'deleted_at' is not null then raise exception 'Önce kaydı geri alın.' using errcode='22023';end if;
 merged:='{"status":"draft","seo":{},"body":{"type":"doc","content":[]},"sort_order":0,"is_visible":true,"content":{},"summary":"","topic":"Teknik makale","cover_alt":"","reading_minutes":5}'::jsonb||coalesce(current_data,'{}')||p_data||jsonb_build_object('id',new_id);
 if p_entity='pages' then
  row_page:=jsonb_populate_record(null::public.pages,merged);
  if length(row_page.title) not between 1 and 500 then raise exception 'Sayfa başlığı gerekli.' using errcode='22023';end if;
  if p_id is null then insert into public.pages(id,slug,title,body,seo,status) values(new_id,row_page.slug,row_page.title,row_page.body,row_page.seo,row_page.status) returning to_jsonb(pages.*) into result;
  else update public.pages set slug=row_page.slug,title=row_page.title,body=row_page.body,seo=row_page.seo,status=row_page.status where id=p_id returning to_jsonb(pages.*) into result;end if;
 elsif p_entity='articles' then
  row_article:=jsonb_populate_record(null::public.articles,merged);
  if length(row_article.title) not between 1 and 500 or length(row_article.topic)>160 or row_article.reading_minutes>300 then raise exception 'Makale alanlarını kontrol edin.' using errcode='22023';end if;
  if row_article.cover_id is not null and not exists(select 1 from public.media_assets where id=row_article.cover_id and deleted_at is null and (row_article.status='draft' or status='published')) then raise exception 'Kapak dosyası önce yayınlanmalıdır.' using errcode='22023';end if;
  if p_id is null then insert into public.articles(id,slug,title,topic,summary,body,cover_id,cover_alt,reading_minutes,sort_order,seo,status) values(new_id,row_article.slug,row_article.title,row_article.topic,row_article.summary,row_article.body,row_article.cover_id,row_article.cover_alt,row_article.reading_minutes,row_article.sort_order,row_article.seo,row_article.status) returning to_jsonb(articles.*) into result;
  else update public.articles set slug=row_article.slug,title=row_article.title,topic=row_article.topic,summary=row_article.summary,body=row_article.body,cover_id=row_article.cover_id,cover_alt=row_article.cover_alt,reading_minutes=row_article.reading_minutes,sort_order=row_article.sort_order,seo=row_article.seo,status=row_article.status where id=p_id returning to_jsonb(articles.*) into result;end if;
 elsif p_entity='home_sections' then
  row_home:=jsonb_populate_record(null::public.home_sections,merged);
  if p_id is null then insert into public.home_sections(id,kind,content,is_visible,sort_order,status) values(new_id,row_home.kind,row_home.content,row_home.is_visible,row_home.sort_order,row_home.status) returning to_jsonb(home_sections.*) into result;
  else update public.home_sections set kind=row_home.kind,content=row_home.content,is_visible=row_home.is_visible,sort_order=row_home.sort_order,status=row_home.status where id=p_id returning to_jsonb(home_sections.*) into result;end if;
 elsif p_entity='menus' then
  row_menu:=jsonb_populate_record(null::public.menus,merged);
  if length(row_menu.name) not between 1 and 160 or jsonb_typeof(p_data->'items') is distinct from 'array' or jsonb_array_length(p_data->'items')>200 then raise exception 'Menü bilgileri geçersiz.' using errcode='22023';end if;
  if p_id is null then insert into public.menus(id,name,status) values(new_id,row_menu.name,row_menu.status) returning to_jsonb(menus.*) into result;else update public.menus set name=row_menu.name,status=row_menu.status where id=p_id returning to_jsonb(menus.*) into result;end if;
  delete from public.menu_items where menu_id=new_id;
  insert into public.menu_items(id,menu_id,parent_id,label,href,icon_key,sort_order,is_visible) select coalesce(nullif(item->>'id',''),gen_random_uuid()::text),new_id,nullif(item->>'parent_id',''),item->>'label',item->>'href',item->>'icon_key',n::int,coalesce((item->>'is_visible')::boolean,true) from jsonb_array_elements(p_data->'items') with ordinality t(item,n);
  if exists(select 1 from public.menu_items i where i.menu_id=new_id and (length(i.label) not between 1 and 160 or (i.parent_id is not null and not exists(select 1 from public.menu_items p where p.id=i.parent_id and p.menu_id=new_id)))) then raise exception 'Menü üst bağlantıları geçersiz.' using errcode='22023';end if;
  if exists(with recursive chain as (select id,parent_id,array[id] ids,false cycle from public.menu_items where menu_id=new_id union all select c.id,p.parent_id,c.ids||p.id,p.id=any(c.ids) from chain c join public.menu_items p on p.id=c.parent_id where not c.cycle and cardinality(c.ids)<=32) select 1 from chain where cycle or cardinality(ids)>32) then raise exception 'Menüde döngü veya çok derin hiyerarşi var.' using errcode='22023';end if;
  result:=result||jsonb_build_object('items',p_data->'items');
 elsif p_entity='ui_texts' then
  if jsonb_typeof(p_data->'value') is distinct from 'string' or length(p_data->>'value')>10000 then raise exception 'Metin geçersiz.' using errcode='22023';end if;
  insert into public.ui_texts(key,value) values(p_id,p_data->>'value') on conflict(key) do update set value=excluded.value returning to_jsonb(ui_texts.*) into result;
 else
  if jsonb_typeof(p_data->'value') is distinct from 'object' then raise exception 'Ayar nesnesi gerekli.' using errcode='22023';end if;
  if p_id='theme' and ((p_data->'value'->>'primary')!~'^#[0-9a-fA-F]{6}$' or (p_data->'value'->>'font') not in ('Noto Sans','Arial','system-ui')) then raise exception 'Tema rengi veya yazı tipi geçersiz.' using errcode='22023';end if;
  insert into public.site_settings(key,value) values(p_id,p_data->'value') on conflict(key) do update set value=excluded.value returning to_jsonb(site_settings.*) into result;
 end if;return result;end $$;

create function public.admin_content_action(p_entity text,p_id text,p_version int,p_restore boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;begin perform private.require_catalog();if p_entity not in ('pages','articles','home_sections','menus') then raise exception 'İşlem geçersiz.' using errcode='22023';end if;
 execute format('select to_jsonb(t) from public.%I t where id=$1 for update',p_entity) into result using p_id;if result is null then raise exception 'Kayıt yok.' using errcode='P0002';end if;if (result->>'lock_version')::int is distinct from p_version then raise exception 'Kayıt değişti. Yenileyin.' using errcode='PT409';end if;
 execute format('update public.%I set deleted_at=$1,status=''draft'' where id=$2 returning to_jsonb(%I.*)',p_entity,p_entity) into result using case when p_restore then null::timestamptz else now() end,p_id;return result;end $$;

create function private.media_references(p_id text) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(t),'[]') from (
 select 'products' entity,p.id,p.name title from public.product_media pm join public.products p on p.id=pm.product_id where pm.media_id=p_id
 union all select 'brands',id,name from public.brands where logo_id=p_id
 union all select 'categories',id,name from public.categories where image_id=p_id
 union all select 'articles',id,title from public.articles where cover_id=p_id or strpos(body::text,p_id)>0 or strpos(seo::text,p_id)>0
 union all select 'pages',id,title from public.pages where strpos(body::text,p_id)>0 or strpos(seo::text,p_id)>0
 union all select 'home_sections',id,kind from public.home_sections where strpos(content::text,p_id)>0
 union all select 'site_settings',key,key from public.site_settings where strpos(value::text,p_id)>0
 )t
$$;
revoke all on function private.media_references(text) from public,anon,authenticated;
create function public.admin_media_library(p_query text default '',p_page int default 1,p_ids text[] default null,p_deleted boolean default false) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin perform private.require_catalog();if p_page not between 1 and 100000 or length(p_query)>240 or cardinality(p_ids)>100 then raise exception 'Geçersiz medya sorgusu.' using errcode='22023';end if;
 return (with filtered as(select * from public.media_assets m where (case when p_deleted then deleted_at is not null else deleted_at is null end) and (p_ids is null or id=any(p_ids)) and (p_query='' or strpos(lower(m.alt_text||' '||m.object_path),lower(p_query))>0)),chosen as(select * from filtered order by created_at desc,id limit 50 offset (p_page-1)*50)
 select jsonb_build_object('total',(select count(*) from filtered),'items',coalesce((select jsonb_agg(to_jsonb(c)||jsonb_build_object('usages',private.media_references(c.id))) from chosen c),'[]')));end $$;
create function public.admin_media_delete(p_id text,p_version int) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;begin perform private.require_catalog();select to_jsonb(m) into result from public.media_assets m where id=p_id for update;if result is null then raise exception 'Dosya yok.' using errcode='P0002';end if;if (result->>'lock_version')::int is distinct from p_version then raise exception 'Dosya değişti. Listeyi yenileyin.' using errcode='PT409';end if;
 if jsonb_array_length(private.media_references(p_id))>0 then raise exception 'Dosya içeriklerde kullanılıyor. Önce kullanıldığı yerlerden kaldırın (çöp kutusundaki kayıtlar dahil).' using errcode='22023';end if;
 update public.media_assets set deleted_at=now(),status='draft' where id=p_id returning to_jsonb(media_assets.*) into result;return result;end $$;

create function public.admin_customers(p_page int default 1,p_query text default '',p_id uuid default null) returns jsonb language plpgsql stable security definer set search_path='' as $$begin perform private.require_sales();if p_page not between 1 and 100000 or length(p_query)>240 then raise exception 'Geçersiz sorgu.' using errcode='22023';end if;
 return(with filtered as(select * from private.customers c where deleted_at is null and (p_id is null or id=p_id) and (p_query='' or strpos(lower(name||' '||company||' '||coalesce(email,'')||' '||coalesce(phone,'')),lower(p_query))>0)),chosen as(select * from filtered order by updated_at desc,id limit 50 offset(p_page-1)*50) select jsonb_build_object('total',(select count(*) from filtered),'items',coalesce((select jsonb_agg(to_jsonb(c)||jsonb_build_object('requests',(select count(*) from private.quotes where customer_id=c.id))) from chosen c),'[]')));end $$;
create function public.admin_save_customer(p_id uuid,p_version int,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$declare item private.customers;old private.customers;result jsonb;begin perform private.require_sales();if jsonb_typeof(p_data)<>'object' or pg_column_size(p_data)>32768 then raise exception 'Müşteri bilgileri geçersiz.' using errcode='22023';end if;
 if p_id is not null then select * into old from private.customers where id=p_id and deleted_at is null for update;if not found then raise exception 'Müşteri yok.' using errcode='P0002';end if;if old.lock_version is distinct from p_version then raise exception 'Müşteri değişti.' using errcode='PT409';end if;end if;
 item:=jsonb_populate_record(null::private.customers,'{"company":"","notes":""}'::jsonb||coalesce(to_jsonb(old),'{}')||p_data);
 if p_id is null then insert into private.customers(name,company,email,phone,notes) values(item.name,item.company,item.email,item.phone,item.notes) returning to_jsonb(customers.*) into result;else update private.customers set name=item.name,company=item.company,email=item.email,phone=item.phone,notes=item.notes where id=p_id returning to_jsonb(customers.*) into result;end if;return result;end $$;

create function public.admin_quotes(p_filters jsonb default '{}') returns jsonb language plpgsql stable security definer set search_path='' as $$declare page_no int:=coalesce((p_filters->>'page')::int,1);begin perform private.require_sales();if page_no not between 1 and 100000 or length(p_filters->>'q')>240 then raise exception 'Geçersiz talep sorgusu.' using errcode='22023';end if;
 return(with filtered as(select q.* from private.quotes q where (coalesce(p_filters->>'status','')='' or q.status::text=p_filters->>'status') and (coalesce(p_filters->>'customer_id','')='' or q.customer_id::text=p_filters->>'customer_id') and (nullif(p_filters->>'from','') is null or q.created_at>=(p_filters->>'from')::timestamptz) and (nullif(p_filters->>'to','') is null or q.created_at<(p_filters->>'to')::timestamptz+interval '1 day') and (coalesce(p_filters->>'q','')='' or strpos(lower(q.customer::text),lower(p_filters->>'q'))>0)),chosen as(select * from filtered order by created_at desc,id limit 50 offset(page_no-1)*50)
 select jsonb_build_object('total',(select count(*) from filtered),'items',coalesce((select jsonb_agg(to_jsonb(c)||jsonb_build_object('line_count',(select count(*) from private.quote_items where quote_id=c.id))) from chosen c),'[]')));end $$;
create function public.admin_quote_detail(p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$declare result jsonb;begin perform private.require_sales();select to_jsonb(q)||jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(i)||jsonb_build_object('total',case when i.unit_price is null then null else round(i.quantity*i.unit_price*(1-i.discount_percent/100)*(1+i.tax_percent/100),2) end) order by i.position,i.id) from private.quote_items i where i.quote_id=q.id),'[]'),'notes',coalesce((select jsonb_agg(to_jsonb(n) order by n.created_at,n.id) from private.quote_notes n where n.quote_id=q.id),'[]'),'history',coalesce((select jsonb_agg(to_jsonb(h) order by h.created_at,h.id) from private.quote_status_history h where h.quote_id=q.id),'[]')) into result from private.quotes q where id=p_id;if result is null then raise exception 'Teklif bulunamadı.' using errcode='P0002';end if;return result;end $$;
create function public.admin_save_quote(p_id uuid,p_version int,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$declare old private.quotes;v jsonb;new_status private.quote_state;begin perform private.require_sales();select * into old from private.quotes where id=p_id for update;if not found then raise exception 'Teklif yok.' using errcode='P0002';end if;if old.lock_version is distinct from p_version then raise exception 'Teklif başka kullanıcı tarafından değiştirildi.' using errcode='PT409';end if;
 if pg_column_size(p_data)>131072 or jsonb_typeof(p_data->'items') is distinct from 'array' or jsonb_array_length(p_data->'items')>100 or length(p_data->>'note')>10000 then raise exception 'Teklif bilgileri geçersiz.' using errcode='22023';end if;
 new_status:=coalesce(p_data->>'status',old.status::text)::private.quote_state;
 update private.quotes set status=new_status,response_note=coalesce(p_data->>'response_note',''),currency=coalesce(p_data->>'currency','TRY'),valid_until=nullif(p_data->>'valid_until','')::date where id=p_id;
 if new_status<>old.status then insert into private.quote_status_history(quote_id,from_status,to_status,actor_id) values(p_id,old.status,new_status,auth.uid());end if;
 for v in select * from jsonb_array_elements(p_data->'items') loop
 if not exists(select 1 from private.quote_items where id=(v->>'id')::uuid and quote_id=p_id) then raise exception 'Kalem bu teklife ait değil.' using errcode='22023';end if;
 update private.quote_items set unit_price=nullif(v->>'unit_price','')::numeric,discount_percent=coalesce(nullif(v->>'discount_percent','')::numeric,0),tax_percent=coalesce(nullif(v->>'tax_percent','')::numeric,0) where id=(v->>'id')::uuid and quote_id=p_id;
 end loop;
 if length(trim(coalesce(p_data->>'note','')))>0 then insert into private.quote_notes(quote_id,author_id,body) values(p_id,auth.uid(),p_data->>'note');end if;
 return public.admin_quote_detail(p_id);end $$;

create function public.admin_staff_and_log(p_kind text,p_page int default 1,p_query text default '') returns jsonb language plpgsql stable security definer set search_path='' as $$begin perform private.require_admin();if p_page not between 1 and 100000 or length(p_query)>240 then raise exception 'Geçersiz sorgu.' using errcode='22023';end if;
 if p_kind='staff' then return jsonb_build_object('items',(select coalesce(jsonb_agg(jsonb_build_object('user_id',s.user_id,'role',s.role,'active',s.active,'email',u.email,'name',u.raw_user_meta_data->>'full_name','created_at',s.created_at) order by s.created_at),'[]') from private.staff_members s join auth.users u on u.id=s.user_id));
 elsif p_kind='log' then return(with filtered as(select a.*,u.email actor from private.audit_log a left join auth.users u on u.id=a.actor_id where p_query='' or strpos(lower(coalesce(u.email,'')||' '||a.entity_table||' '||coalesce(a.entity_id,'')),lower(p_query))>0),chosen as(select * from filtered order by created_at desc,id desc limit 50 offset(p_page-1)*50) select jsonb_build_object('total',(select count(*) from filtered),'items',coalesce((select jsonb_agg(to_jsonb(c)-'before_data'-'after_data') from chosen c),'[]')));
 else raise exception 'Geçersiz liste.' using errcode='22023';end if;end $$;
create function public.admin_set_staff(p_user_id uuid,p_role text,p_active boolean default true) returns jsonb language plpgsql security definer set search_path='' as $$declare result jsonb;begin perform private.require_admin();if p_role not in ('admin','editor','sales') or p_active is null then raise exception 'Geçersiz rol.' using errcode='22023';end if;
 insert into private.staff_members(user_id,role,active) values(p_user_id,p_role::private.staff_role,p_active) on conflict(user_id) do update set role=excluded.role,active=excluded.active returning jsonb_build_object('user_id',user_id,'role',role,'active',active) into result;
 insert into private.audit_log(actor_id,entity_table,entity_id,action) values(auth.uid(),'private.staff_members',p_user_id::text,'set_role');return result;end $$;

-- Explicit grants; no public client can call privileged handlers.
do $$declare f record;begin for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('admin_content_list','admin_save_content','admin_content_action','admin_media_library','admin_media_delete','admin_customers','admin_save_customer','admin_quotes','admin_quote_detail','admin_save_quote','admin_staff_and_log','admin_set_staff') loop execute format('revoke all on function %s from public,anon',f.signature);execute format('grant execute on function %s to authenticated',f.signature);end loop;end $$;
notify pgrst,'reload schema';
