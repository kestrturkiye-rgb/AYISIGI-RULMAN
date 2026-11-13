import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {connect,applyMigrations} from '../scripts/supabase/database.mjs';
import {normalizeCode} from '../src/technical-search.js';
const base=process.env.TEST_POSTGRES_URL||'postgresql://postgres@127.0.0.1:55432/postgres';
const name='rt_phase1_rls_'+process.pid;let admin,db;
const ids={admin:'00000000-0000-4000-8000-000000000001',editor:'00000000-0000-4000-8000-000000000002',outsider:'00000000-0000-4000-8000-000000000003'};
before(async()=>{
 admin=await connect(base,{localOnly:true});await admin.query(`create database ${name}`);
 const url=new URL(base);url.pathname='/'+name;db=await connect(url.toString(),{localOnly:true});
 await db.query(await readFile(new URL('../supabase/tests/bootstrap.sql',import.meta.url),'utf8'));await applyMigrations(db);
 for(const [role,id] of Object.entries(ids))await db.query('insert into auth.users values($1,$2)',[id,role+'@example.test']);
 await db.query('select private.bootstrap_first_admin($1)',[ids.admin]);await db.query("insert into private.staff_members(user_id,role) values($1,'editor')",[ids.editor]);
 await db.query(`insert into public.brands(id,name,slug,status) values ('b','SKF','skf','published'),('hidden-b','Hidden','hidden-b','draft');
 insert into public.categories(id,name,slug,status) values('root','Rulmanlar','root','published'),('hidden-root','Hidden','hidden-root','draft');
 insert into public.categories(id,parent_id,name,slug,status) values('leaf','root','Bilyalı','leaf','published'),('hidden-leaf','hidden-root','Hidden leaf','hidden-leaf','published');
 insert into public.products(id,sku,name,slug,brand_id,category_id,status) values
 ('live','6204','Rulman','live','b','leaf','published'),('draft','6205','Taslak','draft','b','leaf','draft'),
 ('deleted','6206','Silinen','deleted','b','leaf','published'),('hidden-cat','6207','Gizli kategori','hidden-cat','b','hidden-leaf','published'),
 ('hidden-brand','6208','Gizli marka','hidden-brand','hidden-b','leaf','published');
 update public.products set deleted_at=now() where id='deleted';
 insert into private.product_prices(product_id,amount) values('live',123),('draft',456);
 insert into public.product_aliases(id,product_id,code) values('live-alias','live','6204-2Z'),('draft-alias','draft','6205-2Z');
 insert into public.media_assets(id,bucket_id,object_path,mime_type,size_bytes,sha256,status) values
 ('image','media-published','published/image.webp','image/webp',10,repeat('a',64),'published'),
 ('private-image','media-originals','original.webp','image/webp',10,repeat('b',64),'draft');
 insert into public.product_media(id,product_id,media_id,is_primary) values('live-image','live','image',true),('draft-image','draft','image',true);
 insert into public.site_settings(key,value) values('contact','{"phone":"123"}');
 insert into storage.objects(bucket_id,name) values('media-published','image.webp'),('media-originals','private.webp');
 insert into private.quotes(request_key,fingerprint,customer) values(gen_random_uuid(),'f','{"email":"customer@example.test"}');`);
});
after(async()=>{await db?.end();if(admin){await admin.query(`drop database if exists ${name} with (force)`);await admin.end()}});
async function as(role,user,fn){await db.query('begin');try{await db.query('set local role '+role);await db.query("select set_config('request.jwt.claim.sub',$1,true)",[user||'']);return await fn()}finally{await db.query('rollback')}}
const denied=async(sql,params=[])=>assert.rejects(db.query(sql,params),e=>['42501','P0001'].includes(e.code));

test('migrations are repeatable and every application table has RLS enabled',async()=>{
 await applyMigrations(db);const rows=await db.query("select n.nspname,c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and n.nspname in ('public','private')");assert.ok(rows.rowCount>25);assert.ok(rows.rows.every(r=>r.relrowsecurity),JSON.stringify(rows.rows.filter(r=>!r.relrowsecurity)));assert.deepEqual((await db.query("select tablename from pg_publication_tables where pubname='supabase_realtime'")).rows,[{tablename:'content_version'}]);
});
test('anon sees only published nondeleted products with visible parents and related records',()=>as('anon',null,async()=>{
 assert.deepEqual((await db.query('select id from public.products')).rows,[{id:'live'}]);assert.deepEqual((await db.query('select id from public.product_aliases')).rows,[{id:'live-alias'}]);assert.deepEqual((await db.query('select id from public.product_media')).rows,[{id:'live-image'}]);assert.equal((await db.query('select id from public.media_assets')).rowCount,1);
}));
test('anonymous product writes are denied',()=>as('anon',null,()=>denied("update public.products set name='attack' where id='live'")));
test('anonymous quote reads and role bootstrap are denied',async()=>{
 await as('anon',null,()=>denied('select * from private.quotes'));await as('anon',null,()=>denied('select private.bootstrap_first_admin($1)',[ids.outsider]));
});
test('authenticated user without staff role sees no drafts or private records',async()=>{
 await as('authenticated',ids.outsider,async()=>{assert.equal((await db.query('select * from public.products')).rowCount,1);assert.equal((await db.query('select * from public.get_staff_access()')).rowCount,0);assert.equal((await db.query("update public.products set name='attack' where id='live'")).rowCount,0)});
 await as('authenticated',ids.outsider,()=>denied("insert into public.brands(id,name,slug) values('attack','attack','attack')"));
});
test('editor can edit, draft, soft-delete and restore without changing product identity',()=>as('authenticated',ids.editor,async()=>{
 assert.equal((await db.query('select * from public.products')).rowCount,5);assert.equal((await db.query('select * from public.get_staff_access()')).rows[0].role,'editor');
 await db.query("update public.products set status='draft',deleted_at=now() where id='live'");await db.query("update public.products set status='published',deleted_at=null where id='live'");assert.equal((await db.query("select lock_version from public.products where id='live'")).rows[0].lock_version,3);
}));
test('identity changes and hard deletion are blocked',async()=>{
 await as('authenticated',ids.editor,()=>denied("update public.products set id='replacement' where id='live'"));await as('authenticated',ids.admin,()=>denied("delete from public.products where id='live'"));
});
test('editor cannot alter public system settings or private roles',async()=>{
 await as('authenticated',ids.editor,async()=>{assert.equal((await db.query("update public.site_settings set value='{}' where key='contact'")).rowCount,0)});
 await as('authenticated',ids.editor,()=>denied("update private.staff_members set role='admin' where user_id=$1",[ids.editor]));
 await as('authenticated',ids.editor,async()=>assert.equal((await db.query('select * from private.quote_notes')).rowCount,0));
 await as('authenticated',ids.editor,()=>denied('create table public.unauthorized_table(id integer)')); 
});
test('client Auth metadata never grants an administrator role',()=>as('authenticated',ids.outsider,async()=>{
 await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:ids.outsider,user_metadata:{role:'admin'}})]);assert.equal((await db.query('select private.is_admin() value')).rows[0].value,false);
}));
test('admin settings are editable but cannot hold obvious server-secret fields',async()=>{
 await as('authenticated',ids.admin,async()=>{assert.equal((await db.query("update public.site_settings set value='{\"phone\":\"456\"}' where key='contact'")).rowCount,1)});
 await as('authenticated',ids.admin,()=>assert.rejects(db.query("update public.site_settings set value='{\"smtp_password\":\"never\"}' where key='contact'"),e=>e.code==='23514'));
});
test('private prices remain inaccessible; display RPC emits only explicitly visible published prices',async()=>{
 await as('anon',null,async()=>{assert.equal((await db.query("select * from public.get_display_prices(array['live','draft'])")).rowCount,0)});
 await as('anon',null,()=>denied('select * from private.product_prices'));
 await db.query('begin');try{await db.query("update public.products set price_mode='visible' where id in ('live','draft')");await db.query('set local role anon');const rows=await db.query("select * from public.get_display_prices(array['live','draft'])");assert.deepEqual(rows.rows.map(r=>r.product_id),['live'])}finally{await db.query('rollback')}
});
test('last active admin cannot be demoted or disabled; bootstrap cannot run twice',async()=>{
 await db.query('begin');try{await assert.rejects(db.query("update private.staff_members set active=false where user_id=$1",[ids.admin]),/Last active/)}finally{await db.query('rollback')}
 await assert.rejects(db.query('select private.bootstrap_first_admin($1)',[ids.outsider]),/already initialized/);
});
test('category tree cycles are rejected and deleting a parent hides public descendants',async()=>{
 await db.query('begin');try{await assert.rejects(db.query("update public.categories set parent_id='leaf' where id='root'"),/cycle/)}finally{await db.query('rollback')}
 await db.query('begin');try{await db.query("update public.categories set deleted_at=now() where id='root'");await db.query('set local role anon');assert.equal((await db.query('select id from public.products')).rowCount,0)}finally{await db.query('rollback')}
});
test('audit records actor and version, and drafts cannot publish by autosave',async()=>{
 await db.query('begin');try{await db.query('set local role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[ids.editor]);await db.query("update public.products set name='Changed' where id='live'");await db.query('reset role');const row=(await db.query("select actor_id,after_data from private.audit_log where entity_id='live' order by id desc limit 1")).rows[0];assert.equal(row.actor_id,ids.editor);assert.equal(row.after_data.name,'Changed');assert.equal(row.after_data.lock_version,2);await db.query('set local role authenticated');await assert.rejects(db.query("insert into private.content_drafts(entity_table,entity_id,owner_id,base_version,payload) values('products','live',$1,1,'{}')",[ids.editor]),e=>e.code==='42501')}finally{await db.query('rollback')}
});
test('code normalization matches current JavaScript behavior including Turkish and Unicode dashes',async()=>{
 for(const value of ['SKF6001-2RSH/C3',' SKF 6204 ','İğne–12','ı–20','ＮＵ ２２０','A\u200b-B'])assert.equal((await db.query('select public.normalize_product_code($1) code',[value])).rows[0].code,normalizeCode(value));
});
test('private Storage permits staff reads and own-prefix uploads, never direct public-bucket writes',async()=>{
 await as('anon',null,async()=>assert.equal((await db.query('select * from storage.objects')).rowCount,1));
 await as('authenticated',ids.editor,async()=>{assert.equal((await db.query('select * from storage.objects')).rowCount,2);await db.query("insert into storage.objects(bucket_id,name) values('media-originals',$1)",[ids.editor+'/new.webp'])});
 await as('authenticated',ids.editor,()=>denied("insert into storage.objects(bucket_id,name) values('media-published','unsafe.webp')"));
 await as('authenticated',ids.editor,()=>denied("insert into storage.objects(bucket_id,name) values('media-originals','other-user/unsafe.webp')"));
});

test('public bootstrap emits only visible taxonomy and counts, without private prices or provenance',()=>as('anon',null,async()=>{
 const data=(await db.query('select public.get_public_site() data')).rows[0].data;
 assert.equal(data.totalProducts,1);assert.equal(data.brands.length,1);assert.equal(data.categories.length,2);assert.equal(data.categoryCounts.leaf,1);assert.equal(data.settings.contact.phone,'123');assert.equal(data.brands[0].count,1);
 assert.ok(!JSON.stringify(data).includes('customer@example.test'));
}));
test('public search pages and exact alias codes work without exposing specifications or hidden prices',()=>as('anon',null,async()=>{
 const data=(await db.query("select public.search_public_catalog(p_code=>'SKF 6204-2Z',p_page_size=>1) data")).rows[0].data;
 assert.equal(data.totalCount,1);assert.equal(data.items[0].id,'live');assert.equal(data.items[0].price,null);assert.ok(!('specifications' in data.items[0]));assert.ok(!('sources' in data.items[0]));
 assert.equal((await db.query('select public.search_public_catalog(p_page=>2,p_page_size=>1) data')).rows[0].data.items.length,0);
}));
test('public RPC remains published-only even when a staff JWT is supplied',()=>as('authenticated',ids.editor,async()=>{
 assert.equal((await db.query('select public.search_public_catalog() data')).rows[0].data.totalCount,1);
 const data=(await db.query("select public.get_public_products(array['live','draft','deleted','hidden-cat','hidden-brand'],true) data")).rows[0].data;
 assert.deepEqual(data.map(p=>p.id),['live']);assert.ok(Array.isArray(data[0].specifications));assert.equal(data[0].gallery.length,1);
}));
test('public read bounds reject oversized lists and invalid paging or dimensions',async()=>{
 for(const query of ["select public.search_public_catalog(p_page=>0)","select public.search_public_catalog(p_page_size=>101)","select public.search_public_catalog(p_inner=>20,p_outer=>10)","select public.get_public_products(array_fill('live'::text,array[201]))","select public.get_public_media(array_fill('image'::text,array[201]))"]){await as('anon',null,()=>assert.rejects(db.query(query),e=>e.code==='22023'))}
});
test('public media API excludes private originals and published prices require explicit visibility',async()=>{
 await as('anon',null,async()=>{const data=(await db.query("select public.get_public_media(array['image','private-image']) data")).rows[0].data;assert.equal(data.length,1);assert.equal(data[0].bucket,'media-published')});
 await db.query('begin');try{await db.query("update public.products set price_mode='visible' where id='live'");await db.query('set local role anon');assert.equal((await db.query("select public.get_public_products(array['live']) data")).rows[0].data[0].price.amount,123)}finally{await db.query('rollback')}
});

test('server text search preserves Turkish I and İ case matching independently of DB locale',async()=>{
 await db.query('begin');try{await db.query("update public.products set name='KAYIŞ ISITICI İÇ' where id='live'");await db.query('set local role anon');for(const query of ['kayış','ısıtıcı','iç'])assert.equal((await db.query('select public.search_public_catalog(p_query=>$1) data',[query])).rows[0].data.totalCount,1,query)}finally{await db.query('rollback')}
});


test('derived search index follows code, alias, brand and category edits in the same transaction',async()=>{
 await db.query('begin');try{
  await db.query("update public.products set sku='SPECIAL-777',base_code='BASE-888',manufacturer_code='OEM-999' where id='live'");
  for(const code of ['SPECIAL777','BASE888','OEM999'])assert.equal((await db.query('select public.search_public_catalog(p_code=>$1) d',[code])).rows[0].d.items[0].id,'live');
  await db.query("insert into public.product_aliases(id,product_id,code,kind) values('cross-test','live','CROSS-555','reference')");
  assert.equal((await db.query("select public.search_public_catalog(p_code=>'CROSS555') d")).rows[0].d.totalCount,1);
  await db.query("update public.brands set name='NEWBRAND' where id='b'");
  assert.equal((await db.query("select public.search_public_catalog(p_code=>'NEWBRANDSPECIAL777') d")).rows[0].d.totalCount,1);
  assert.equal((await db.query("select public.search_public_catalog(p_code=>'SKFSPECIAL777') d")).rows[0].d.totalCount,0);
  await db.query("update public.categories set name='Özel kategori' where id='leaf'");
  assert.equal((await db.query("select public.search_public_catalog(p_query=>'özel kategori') d")).rows[0].d.totalCount,1);
  await db.query("delete from public.product_aliases where product_id='live' and code='CROSS-555'");
  assert.equal((await db.query("select public.search_public_catalog(p_code=>'CROSS555') d")).rows[0].d.totalCount,0);
 }finally{await db.query('rollback')}
});
