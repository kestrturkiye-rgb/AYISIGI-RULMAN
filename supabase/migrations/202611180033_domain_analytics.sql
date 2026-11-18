-- Additive attribution only. Existing events keep NULL: their source domain is unknown.
-- Never infer a historical domain from the current canonical origin or the referrer.
alter table private.site_events add column site_host text;
alter table private.site_events add constraint site_events_site_host_check check(site_host is null or site_host in (
 'rulmanteklif.com','rulmanteklif.com.tr','rulmanteklif.online','rulmanteknik.com','rulmanteknik.com.tr',
 'rulmanasistan.com','rulmanasistan.com.tr','rulmankodu.com','rulmankodu.com.tr','rulmansecim.com',
 'rulman-teklif-admin.vercel.app','kestrturkiye-rgb.github.io'
));
create index site_events_site_time on private.site_events(site_host,occurred_at desc,id) where site_host is not null;

create or replace function public.ingest_site_event(p_data jsonb) returns boolean language plpgsql security definer set search_path='' as $$begin
 if coalesce((select (value->>'enabled')::boolean from public.site_settings where key='analytics'),false) is not true or (p_data->>'consent') is distinct from 'true' then return false;end if;
 if not private.consume_site_limit('analytics',p_data->>'ip_hash',120) then return false;end if;
 insert into private.site_events(id,session_hash,ip_hash,ip_mask,country,region,city,kind,path,product_id,product_name,referrer_host,device,site_host)
 values((p_data->>'id')::uuid,p_data->>'session_hash',p_data->>'ip_hash',p_data->>'ip_mask',nullif(p_data->>'country',''),p_data->>'region',p_data->>'city',p_data->>'kind',p_data->>'path',p_data->>'product_id',p_data->>'product_name',p_data->>'referrer_host',p_data->>'device',nullif(p_data->>'site_host','')) on conflict(id) do nothing;
 delete from private.site_events where id in(select id from private.site_events where occurred_at<now()-interval '90 days' limit 5000);
 delete from private.site_rate_limits where window_start<now()-interval '1 day';return true;end $$;
revoke all on function public.ingest_site_event(jsonb) from public,anon,authenticated;
grant execute on function public.ingest_site_event(jsonb) to service_role;

create or replace function public.admin_analytics(p_filters jsonb default '{}') returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
 from_time timestamptz:=coalesce(nullif(p_filters->>'from','')::timestamptz,now()-interval '7 days');
 until_time timestamptz:=coalesce(nullif(p_filters->>'to','')::timestamptz+interval '1 day',clock_timestamp());
 page_no int:=coalesce((p_filters->>'page')::int,1);
 site_filter text:=coalesce(p_filters->>'site','');
begin
 perform private.require_admin();
 if page_no not between 1 and 100000 or until_time<from_time or until_time-from_time>interval '180 days' then raise exception 'Tarih aralığı geçersiz (en fazla 180 gün).' using errcode='22023';end if;
 if length(site_filter)>253 then raise exception 'Site filtresi geçersiz.' using errcode='22023';end if;
 return(
 with base as materialized(select * from private.site_events where occurred_at>=from_time and occurred_at<until_time),
 events as materialized(select * from base where site_filter='' or (site_filter='__legacy__' and site_host is null) or site_host=site_filter),
 filtered as(select * from events where (coalesce(p_filters->>'session','')='' or session_hash=p_filters->>'session') and (coalesce(p_filters->>'country','')='' or country=p_filters->>'country')),
 chosen as(select * from filtered order by occurred_at desc,id limit 50 offset(page_no-1)*50)
 select jsonb_build_object(
 'sessions',(select count(distinct session_hash) from events),
 'views',(select count(*) from events where kind='page_view'),
 'productViews',(select count(*) from events where kind='product_view'),
 'total',(select count(*) from filtered),
 'items',coalesce((select jsonb_agg(to_jsonb(c)-'ip_hash' order by c.occurred_at desc,c.id) from chosen c),'[]'),
 'domains',coalesce((select jsonb_agg(t order by t.site_host nulls last) from(select site_host,count(*) views,count(distinct session_hash) sessions from base group by site_host)t),'[]'),
 'locations',coalesce((select jsonb_agg(t) from(select country,city,count(distinct session_hash) visits from events group by country,city order by visits desc limit 20)t),'[]'),
 'products',coalesce((select jsonb_agg(t) from(select product_id,max(product_name) name,count(*) views from events where kind='product_view' group by product_id order by views desc limit 20)t),'[]')
 ));
end $$;
revoke all on function public.admin_analytics(jsonb) from public,anon;
grant execute on function public.admin_analytics(jsonb) to authenticated;
notify pgrst,'reload schema';
