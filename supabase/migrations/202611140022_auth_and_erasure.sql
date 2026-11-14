-- Server-only auth throttling, authoritative ownership, and resumable member erasure.
create table private.auth_rate_limits(scope text not null,key_hash text not null check(key_hash ~ '^[a-f0-9]{64}$'),window_start timestamptz not null,attempts int not null,primary key(scope,key_hash,window_start));
create table private.owned_auth_accounts(user_id uuid primary key references auth.users(id) on delete cascade,created_at timestamptz not null default now());
create table private.member_erasures(user_id uuid primary key,created_at timestamptz not null default now());
create table private.member_erasure_jobs(user_id uuid primary key,documents jsonb not null default '[]',can_delete_auth boolean not null default false,identity_retained boolean,state text not null default 'pending' check(state in('pending','done')),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
do $$declare t text;begin foreach t in array array['auth_rate_limits','owned_auth_accounts','member_erasures','member_erasure_jobs'] loop execute format('alter table private.%I enable row level security',t);execute format('revoke all on private.%I from public,anon,authenticated',t);execute format('grant all on private.%I to service_role',t);end loop;end $$;
create function public.auth_request_guard(p_scope text,p_ip_hash text,p_account_hash text default null) returns boolean language plpgsql security definer set search_path='' as $$declare lim int;ip_n int;account_n int;window_time timestamptz:=date_trunc('minute',clock_timestamp());begin
 if p_scope not in('login','signup','recover','callback','password','delete-account') or p_ip_hash !~ '^[a-f0-9]{64}$' or (p_account_hash is not null and p_account_hash !~ '^[a-f0-9]{64}$') then raise exception 'Geçersiz istek.' using errcode='22023';end if;
 lim:=case p_scope when 'login' then 12 when 'callback' then 12 when 'recover' then 3 when 'signup' then 3 else 5 end;
 insert into private.auth_rate_limits values(p_scope,p_ip_hash,window_time,1) on conflict(scope,key_hash,window_start) do update set attempts=auth_rate_limits.attempts+1 returning attempts into ip_n;
 if p_account_hash is not null then insert into private.auth_rate_limits values(p_scope||'-account',p_account_hash,window_time,1) on conflict(scope,key_hash,window_start) do update set attempts=auth_rate_limits.attempts+1 returning attempts into account_n;end if;
 delete from private.auth_rate_limits where window_start<now()-interval '1 day';return ip_n<=lim and coalesce(account_n,1)<=case p_scope when 'login' then 6 else lim end;
end $$;
create function public.member_session_status() returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if auth.uid() is null then raise exception 'Giriş gerekli.' using errcode='42501';end if;
 return jsonb_build_object('erased',exists(select 1 from private.member_erasures where user_id=auth.uid()),'disabled',exists(select 1 from private.member_profiles where user_id=auth.uid() and not active),'staff',private.staff_role() is not null);
end $$;
revoke all on function public.member_session_status() from public,anon;grant execute on function public.member_session_status() to authenticated,service_role;
create function public.register_owned_auth_account(p_user_id uuid) returns boolean language plpgsql security definer set search_path='' as $$begin
 if not exists(select 1 from auth.users where id=p_user_id) or exists(select 1 from private.member_erasures where user_id=p_user_id) then raise exception 'Hesap bulunamadı.' using errcode='P0002';end if;
 insert into private.owned_auth_accounts(user_id) values(p_user_id) on conflict do nothing;return true;
end $$;
create function public.prepare_member_erasure(p_user_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$declare quote_ids uuid[];customer_ids uuid[];paths jsonb;can_delete boolean;shared boolean:=false;email_value text;reference record;found_reference boolean;begin
 perform pg_advisory_xact_lock(hashtext('rulman-staff-roles'));
 perform pg_advisory_xact_lock(hashtextextended('rt-member-erasure:'||p_user_id::text,0));
 if exists(select 1 from private.staff_members where user_id=p_user_id) then raise exception 'Personel hesabı bu akıştan silinemez.' using errcode='42501';end if;
 if exists(select 1 from private.member_erasure_jobs where user_id=p_user_id) then return(select to_jsonb(j) from private.member_erasure_jobs j where user_id=p_user_id);end if;
 if not exists(select 1 from private.member_profiles where user_id=p_user_id) then raise exception 'Bu uygulamada üyelik bulunamadı.' using errcode='P0002';end if;
 select email into email_value from auth.users where id=p_user_id;
 -- Unproven/legacy/shared identities are never globally deleted by the Rulman application.
 can_delete:=exists(select 1 from private.owned_auth_accounts where user_id=p_user_id);
 if can_delete and to_regclass('public.cms_records') is not null then
  -- This project hosts another application. Never globally erase its shared Auth identities.
  shared:=true;
 end if;
 if can_delete and not shared and exists(select 1 from information_schema.columns where table_schema='storage' and table_name='objects' and column_name='owner_id') then
  execute 'select exists(select 1 from storage.objects where owner_id=$1)' into shared using p_user_id::text;
 end if;
 -- Discover references from other applications without deleting any of their data.
 if can_delete and not shared then
  for reference in select n.nspname schema_name,t.relname table_name,a.attname column_name from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace join pg_attribute a on a.attrelid=t.oid and a.attnum=c.conkey[1] where c.contype='f' and c.confrelid='auth.users'::regclass and array_length(c.conkey,1)=1 and n.nspname not in('auth','storage') and not(n.nspname='private' and t.relname in('staff_members','member_profiles','owned_auth_accounts','content_drafts','audit_log','quotes','quote_notes','staff_notifications','quote_status_history','quote_documents','media_rate_limits')) loop
   execute format('select exists(select 1 from %I.%I where %I=$1)',reference.schema_name,reference.table_name,reference.column_name) into found_reference using p_user_id;if found_reference then shared:=true;exit;end if;
  end loop;
 end if;
 select coalesce(array_agg(id),'{}'),coalesce(array_agg(distinct customer_id) filter(where customer_id is not null),'{}') into quote_ids,customer_ids from private.quotes where member_id=p_user_id;
 select coalesce(jsonb_agg(object_path),'[]') into paths from private.quote_documents where quote_id=any(quote_ids);
 insert into private.member_erasures(user_id) values(p_user_id);
 insert into private.member_erasure_jobs(user_id,documents,can_delete_auth) values(p_user_id,paths,can_delete and not shared);
 delete from private.quote_documents where quote_id=any(quote_ids);
 delete from private.quote_notes where quote_id=any(quote_ids);
 update private.quotes set member_id=null,customer_id=null,customer=jsonb_build_object('name','Silinmiş üye','company','','email',null,'phone',null),customer_note='',response_note='' where id=any(quote_ids);
 delete from private.customers c where c.id=any(customer_ids) and not exists(select 1 from private.quotes q where q.customer_id=c.id);
 delete from private.member_profiles where user_id=p_user_id;
 delete from private.content_drafts where owner_id=p_user_id;
 update private.audit_log set actor_id=null,before_data=null,after_data=null where actor_id=p_user_id;
 delete from private.media_rate_limits where user_id=p_user_id;
 return(select to_jsonb(j) from private.member_erasure_jobs j where user_id=p_user_id);
end $$;
create function public.pending_member_erasures() returns jsonb language sql stable security definer set search_path='' as $$select coalesce(jsonb_agg(to_jsonb(j)),'[]') from (select * from private.member_erasure_jobs where state='pending' order by created_at limit 20)j$$;
create function public.complete_member_erasure(p_user_id uuid,p_identity_retained boolean default null) returns boolean language plpgsql security definer set search_path='' as $$begin update private.member_erasure_jobs set state='done',documents='[]',identity_retained=coalesce(p_identity_retained,not can_delete_auth),updated_at=now() where user_id=p_user_id;return found;end $$;
do $$declare f record;begin for f in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('auth_request_guard','register_owned_auth_account','prepare_member_erasure','pending_member_erasures','complete_member_erasure') loop execute format('revoke all on function %s from public,anon,authenticated',f.sig);execute format('grant execute on function %s to service_role',f.sig);end loop;end $$;
do $$declare definition text;begin
 select pg_get_functiondef('public.my_account(jsonb)'::regprocedure) into definition;
 definition:=replace(definition,'if auth.uid() is null then','if exists(select 1 from private.member_erasures where user_id=auth.uid()) then raise exception ''Üyelik silinmiş.'' using errcode=''42501'';end if;if auth.uid() is null then');execute definition;
 select pg_get_functiondef('public.admin_set_staff(uuid,text,boolean)'::regprocedure) into definition;
 definition:=replace(definition,'perform private.require_admin();','perform private.require_admin();perform pg_advisory_xact_lock(hashtext(''rulman-staff-roles''));if exists(select 1 from private.member_erasures where user_id=p_user_id) then raise exception ''Silinmiş üyelik personel yapılamaz.'' using errcode=''42501'';end if;');execute definition;
end $$;
-- A stale JWT cannot recreate a deleted profile or submit a new owned quote.
do $$declare definition text;begin
 select pg_get_functiondef('public.admin_member_profile(uuid,jsonb)'::regprocedure) into definition;
 definition:=replace(definition,'perform private.require_admin();','perform private.require_admin();if exists(select 1 from private.member_erasures where user_id=p_user_id) then raise exception ''Silinmiş üyelik.'' using errcode=''42501'';end if;');execute definition;
 select pg_get_functiondef('public.submit_site_quote(jsonb,text,text,uuid)'::regprocedure) into definition;
 definition:=replace(definition,'begin','begin if p_member_id is not null and (exists(select 1 from private.member_erasures where user_id=p_member_id) or exists(select 1 from private.member_profiles where user_id=p_member_id and not active)) then raise exception ''Etkin üyelik gerekli.'' using errcode=''42501'';end if;');execute definition;
end $$;
notify pgrst,'reload schema';
