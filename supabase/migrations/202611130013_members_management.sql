alter table private.member_profiles add column active boolean not null default true;
create function public.admin_members(p_page int default 1,p_query text default '') returns jsonb language plpgsql stable security definer set search_path='' as $$begin perform private.require_admin();if p_page not between 1 and 100000 or length(p_query)>240 then raise exception 'Geçersiz üye sorgusu.' using errcode='22023';end if;
 return(with filtered as(select p.*,u.email from private.member_profiles p join auth.users u on u.id=p.user_id where not exists(select 1 from private.staff_members s where s.user_id=p.user_id) and (p_query='' or strpos(lower(p.name||' '||p.company||' '||u.email),lower(p_query))>0)),chosen as(select * from filtered order by created_at desc,user_id limit 50 offset(p_page-1)*50) select jsonb_build_object('total',(select count(*) from filtered),'items',coalesce((select jsonb_agg(to_jsonb(c)) from chosen c),'[]')));end $$;
create function public.admin_member_profile(p_user_id uuid,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$declare result jsonb;begin perform private.require_admin();
 if pg_column_size(p_data)>8192 then raise exception 'Üye bilgisi çok büyük.' using errcode='22023';end if;
 insert into private.member_profiles(user_id,name,company,phone,active) values(p_user_id,coalesce(p_data->>'name',''),coalesce(p_data->>'company',''),coalesce(p_data->>'phone',''),coalesce((p_data->>'active')::boolean,true)) on conflict(user_id) do update set name=excluded.name,company=excluded.company,phone=excluded.phone,active=excluded.active,updated_at=now() returning to_jsonb(member_profiles.*) into result;
 insert into private.audit_log(actor_id,entity_table,entity_id,action) values(auth.uid(),'private.member_profiles',p_user_id::text,'update');return result;end $$;
revoke all on function public.admin_members(int,text),public.admin_member_profile(uuid,jsonb) from public,anon;grant execute on function public.admin_members(int,text),public.admin_member_profile(uuid,jsonb) to authenticated;
do $$declare definition text;begin
 select pg_get_functiondef('public.my_account(jsonb)'::regprocedure) into definition;
 definition:=replace(definition,'if p_profile is not null then','insert into private.member_profiles(user_id,name) select auth.uid(),coalesce(raw_user_meta_data->>''full_name'','''') from auth.users where id=auth.uid() on conflict(user_id) do nothing; if p_profile is not null then');execute definition;
 select pg_get_functiondef('public.get_member_campaign_prices(uuid[])'::regprocedure) into definition;
 definition:=replace(definition,'if cardinality(p_ids)>100 then','if not private.is_staff() and not exists(select 1 from private.member_profiles where user_id=auth.uid() and active) then raise exception ''Kampanya fiyatları için etkin üyelik gerekli.'' using errcode=''42501'';end if;if cardinality(p_ids)>100 then');execute definition;
end $$;
-- Index original image references so a 100k product catalog does not make library lookups slow.
create index products_long_document on public.products using gin(long_description jsonb_path_ops) where deleted_at is null;
notify pgrst,'reload schema';
create function public.prune_site_events() returns jsonb language plpgsql security definer set search_path='' as $$declare n int;begin delete from private.site_events where occurred_at<now()-interval '90 days';get diagnostics n=row_count;delete from private.site_rate_limits where window_start<now()-interval '1 day';delete from private.quote_rate_limits where expires_at<now();return jsonb_build_object('deleted',n);end $$;
revoke all on function public.prune_site_events() from public,anon,authenticated;grant execute on function public.prune_site_events() to service_role;
