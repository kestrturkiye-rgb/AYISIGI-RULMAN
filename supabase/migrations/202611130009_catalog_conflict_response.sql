-- Optimistic editing conflicts are business conflicts, not retriable serialization failures.
-- PostgREST maps PT409 directly to HTTP 409; database retry middleware must not retry them.
do $$
declare function_name text; definition text;
begin
 foreach function_name in array array['admin_save_product','admin_catalog_action','admin_save_taxonomy','admin_reorder_taxonomy'] loop
  select pg_get_functiondef(p.oid) into definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=function_name;
  if definition is null or strpos(definition,'errcode=''40001''')=0 then raise exception 'Expected catalog version guard missing: %',function_name; end if;
  execute replace(definition,'errcode=''40001''','errcode=''PT409''');
 end loop;
end $$;
notify pgrst,'reload schema';
