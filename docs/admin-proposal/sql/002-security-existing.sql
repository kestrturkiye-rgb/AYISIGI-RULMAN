create function private.category_is_public(category_key text) returns boolean language sql stable security definer set search_path = '' as $$
 with recursive chain as (
  select c.id,c.parent_id,c.status,c.deleted_at,array[c.id] as path from public.categories c where c.id=category_key
  union all
  select c.id,c.parent_id,c.status,c.deleted_at,chain.path||c.id from public.categories c join chain on c.id=chain.parent_id
   where not c.id=any(chain.path) and cardinality(chain.path)<32
 ) select coalesce(bool_and(status='published' and deleted_at is null) and bool_or(parent_id is null),false) from chain
$$;
create function private.product_is_public(product_key text) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.products p where p.id=product_key and p.status='published' and p.deleted_at is null
  and private.category_is_public(p.category_id)
  and (p.brand_id is null or exists(select 1 from public.brands b where b.id=p.brand_id and b.status='published' and b.deleted_at is null)))
$$;
create function private.media_is_public(media_key text) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.media_assets where id=media_key and bucket_id='media-published' and status='published' and deleted_at is null)
$$;
create function private.menu_item_is_public(item_key text) returns boolean language sql stable security definer set search_path = '' as $$
 with recursive chain as (
  select i.id,i.parent_id,i.is_visible,i.menu_id,array[i.id] as path from public.menu_items i where i.id=item_key
  union all select i.id,i.parent_id,i.is_visible,i.menu_id,chain.path||i.id from public.menu_items i join chain on i.id=chain.parent_id
   where not i.id=any(chain.path) and cardinality(chain.path)<32
 ) select coalesce(bool_and(is_visible) and bool_or(parent_id is null) and
  bool_and(exists(select 1 from public.menus m where m.id=chain.menu_id and m.status='published' and m.deleted_at is null)),false) from chain
$$;

create function private.check_tree() returns trigger language plpgsql security definer set search_path = '' as $$
declare cycle_found boolean;
begin
 perform pg_advisory_xact_lock(hashtext('rulman-tree-'||tg_table_name));
 if new.parent_id is null then return new; end if;
 if tg_table_name='categories' then
  with recursive parents as (
   select id,parent_id,array[id] path from public.categories where id=new.parent_id
   union all select c.id,c.parent_id,p.path||c.id from public.categories c join parents p on c.id=p.parent_id where not c.id=any(p.path) and cardinality(p.path)<32
  ) select coalesce(bool_or(id=new.id or cardinality(path)>=32),false) into cycle_found from parents;
 else
  if not exists(select 1 from public.menu_items where id=new.parent_id and menu_id=new.menu_id) then raise exception 'Menu parent must belong to the same menu'; end if;
  with recursive parents as (
   select id,parent_id,array[id] path from public.menu_items where id=new.parent_id
   union all select c.id,c.parent_id,p.path||c.id from public.menu_items c join parents p on c.id=p.parent_id where not c.id=any(p.path) and cardinality(p.path)<32
  ) select coalesce(bool_or(id=new.id or cardinality(path)>=32),false) into cycle_found from parents;
 end if;
 if cycle_found then raise exception 'Hierarchy cycle or depth limit'; end if;
 return new;
end $$;
create trigger categories_tree before insert or update on public.categories for each row execute function private.check_tree();
create trigger menus_tree before insert or update on public.menu_items for each row execute function private.check_tree();

create function private.touch_row() returns trigger language plpgsql set search_path = '' as $$
begin
 if (to_jsonb(new)->'id') is distinct from (to_jsonb(old)->'id') or (to_jsonb(new)->'key') is distinct from (to_jsonb(old)->'key') then raise exception 'Identity cannot be changed'; end if;
 if to_jsonb(old) ? 'created_at' then new.created_at=old.created_at; end if;
 new.updated_at=now();new.lock_version=old.lock_version+1;
 return new;
end $$;
create function private.record_change() returns trigger language plpgsql security definer set search_path = '' as $$
declare previous jsonb;current_data jsonb;identity_key text;
begin
 -- Bulk/system imports are recorded in import_runs, not duplicated as 100k snapshots.
 if auth.uid() is null then return null; end if;
 if tg_op<>'INSERT' then previous=to_jsonb(old); end if;
 if tg_op<>'DELETE' then current_data=to_jsonb(new); end if;
 identity_key=coalesce(current_data->>'id',previous->>'id',current_data->>'key',previous->>'key',current_data->>'user_id',previous->>'user_id',current_data->>'product_id','relation');
 insert into private.audit_log(actor_id,entity_table,entity_id,action,before_data,after_data)
 values(auth.uid(),tg_table_schema||'.'||tg_table_name,identity_key,lower(tg_op),previous,current_data);
 return null;
end $$;
create function private.bump_content_version() returns trigger language plpgsql security definer set search_path = '' as $$
begin update public.content_version set revision=revision+1,updated_at=now() where singleton;return null;end $$;

create function private.guard_last_admin() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 perform pg_advisory_xact_lock(hashtext('rulman-staff-roles'));
 if old.role='admin' and old.active then
  if tg_op='DELETE' or new.role<>'admin' or not new.active then
   if not exists(select 1 from private.staff_members where role='admin' and active and user_id<>old.user_id) then raise exception 'Last active administrator cannot be removed'; end if;
  end if;
 end if;
 if tg_op='DELETE' then return old;end if;
 new.updated_at=now();return new;
end $$;
create trigger staff_last_admin before update or delete on private.staff_members for each row execute function private.guard_last_admin();
create trigger staff_audit after insert or update or delete on private.staff_members for each row execute function private.record_change();

create function private.bootstrap_first_admin(target_user uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
 perform pg_advisory_xact_lock(hashtext('rulman-staff-roles'));
 if exists(select 1 from private.staff_members where role='admin' and active) then raise exception 'Administrator already initialized'; end if;
 if not exists(select 1 from auth.users where id=target_user) then raise exception 'Create the Auth account before assigning a role'; end if;
 insert into private.staff_members(user_id,role) values(target_user,'admin');
 insert into private.audit_log(entity_table,entity_id,action) values('private.staff_members',target_user::text,'bootstrap_admin');
end $$;

-- Own role only; user-editable Auth metadata is never used as authority.
create function public.get_staff_access() returns table(user_id uuid,role text) language sql stable security definer set search_path = '' as $$
 select s.user_id,s.role::text from private.staff_members s where s.user_id=auth.uid() and s.active
$$;
create function public.get_display_prices(product_ids text[]) returns table(product_id text,amount numeric,currency text) language sql stable security definer set search_path = '' as $$
 select p.id,prices.amount,prices.currency from public.products p join private.product_prices prices on prices.product_id=p.id
 where cardinality(product_ids)<=100 and p.id=any(product_ids) and p.price_mode='visible' and private.product_is_public(p.id)
$$;

-- All application tables are protected, including tables in the non-exposed schema.
do $$declare table_name text;begin
 for table_name in select tablename from pg_tables where schemaname='public' and tablename in
 ('media_assets','media_variants','brands','categories','products','product_aliases','product_media','product_relations','spec_templates','pages','articles','home_sections','menus','menu_items','site_settings','ui_texts','content_version') loop
  execute format('alter table public.%I enable row level security',table_name);
  execute format('revoke all on public.%I from anon,authenticated',table_name);
  execute format('grant select on public.%I to anon,authenticated',table_name);
  execute format('grant all on public.%I to service_role',table_name);
  if table_name not in ('content_version','media_variants') then
   execute format('grant insert,update on public.%I to authenticated',table_name);
   execute format('create trigger audit_change after insert or update or delete on public.%I for each row execute function private.record_change()',table_name);
   execute format('create trigger invalidate_content after insert or update or delete on public.%I for each statement execute function private.bump_content_version()',table_name);
  end if;
  if table_name in ('media_assets','media_variants','brands','categories','products','spec_templates','pages','articles','home_sections','menus','site_settings','ui_texts') then
   execute format('create trigger touch_updated before update on public.%I for each row execute function private.touch_row()',table_name);
  end if;
 end loop;
 for table_name in select tablename from pg_tables where schemaname='private' loop
  execute format('alter table private.%I enable row level security',table_name);
  execute format('revoke all on private.%I from anon,authenticated',table_name);
  execute format('grant all on private.%I to service_role',table_name);
 end loop;
end $$;
grant usage,select on all sequences in schema private to service_role;

-- Publication checks are duplicated at the DB boundary, not only in the UI.
create policy product_read on public.products for select to anon,authenticated using((select private.is_staff()) or (status='published' and deleted_at is null
 and category_id in (select id from public.categories)
 and (brand_id is null or brand_id in (select id from public.brands))));
create policy category_read on public.categories for select to anon,authenticated using(private.category_is_public(id) or (select private.is_staff()));
create policy media_read on public.media_assets for select to anon,authenticated using(private.media_is_public(id) or (select private.is_staff()));
create policy media_variant_read on public.media_variants for select to anon,authenticated using(private.media_is_public(media_id) or (select private.is_staff()));
create policy media_insert on public.media_assets for insert to authenticated with check(private.is_staff() and bucket_id='media-originals' and status='draft' and (split_part(object_path,'/',1)=auth.uid()::text or private.is_admin()));
create policy media_update on public.media_assets for update to authenticated using(private.is_staff() and bucket_id='media-originals' and status='draft' and (split_part(object_path,'/',1)=auth.uid()::text or private.is_admin())) with check(private.is_staff() and bucket_id='media-originals' and status='draft' and (split_part(object_path,'/',1)=auth.uid()::text or private.is_admin()));

do $$declare table_name text;begin
 foreach table_name in array array['brands','spec_templates','pages','articles','menus'] loop
  execute format('create policy published_read on public.%I for select to anon,authenticated using ((status=''published'' and deleted_at is null) or (select private.is_staff()))',table_name);
 end loop;
 foreach table_name in array array['brands','categories','products','spec_templates','pages','articles','home_sections','menus','product_aliases','product_media','product_relations','menu_items','ui_texts'] loop
  execute format('create policy staff_insert on public.%I for insert to authenticated with check ((select private.is_staff()))',table_name);
  execute format('create policy staff_update on public.%I for update to authenticated using ((select private.is_staff())) with check ((select private.is_staff()))',table_name);
 end loop;
end $$;
create policy home_read on public.home_sections for select to anon,authenticated using ((status='published' and deleted_at is null and is_visible) or (select private.is_staff()));
create policy alias_read on public.product_aliases for select to anon,authenticated using(private.product_is_public(product_id) or (select private.is_staff()));
create policy product_media_read on public.product_media for select to anon,authenticated using((private.product_is_public(product_id) and private.media_is_public(media_id)) or (select private.is_staff()));
create policy relation_read on public.product_relations for select to anon,authenticated using((private.product_is_public(product_id) and private.product_is_public(related_id)) or (select private.is_staff()));
create policy menu_item_read on public.menu_items for select to anon,authenticated using(private.menu_item_is_public(id) or (select private.is_staff()));
create policy settings_read on public.site_settings for select to anon,authenticated using(true);
create policy texts_read on public.ui_texts for select to anon,authenticated using(true);
create policy version_read on public.content_version for select to anon,authenticated using(true);
create policy settings_insert on public.site_settings for insert to authenticated with check((select private.is_admin()));
create policy settings_update on public.site_settings for update to authenticated using((select private.is_admin())) with check((select private.is_admin()));

-- No client DELETE grants/policies. Soft delete/restore uses UPDATE; role elevation and
-- private data must go through separately authorized server/RPC paths in later phases.
revoke execute on all functions in schema private from public,anon,authenticated;
grant execute on function private.staff_role(),private.is_staff(),private.is_admin(),private.valid_specs(jsonb),private.category_is_public(text),private.product_is_public(text),private.media_is_public(text),private.menu_item_is_public(text) to anon,authenticated,service_role;
grant execute on function private.bootstrap_first_admin(uuid) to service_role;
revoke execute on function public.get_staff_access() from public,anon;
grant execute on function public.get_staff_access() to authenticated,service_role;
revoke execute on function public.get_display_prices(text[]) from public;
grant execute on function public.get_display_prices(text[]) to anon,authenticated,service_role;
revoke execute on function public.normalize_product_code(text) from public;
grant execute on function public.normalize_product_code(text) to anon,authenticated,service_role;

do $$begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='content_version') then
   alter publication supabase_realtime add table public.content_version;
  end if;
 end if;
end $$;
