import test,{before,after} from 'node:test';import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {connect,applyMigrations} from '../scripts/supabase/database.mjs';
import {createImportPlan} from '../scripts/supabase/import-plan.mjs';
import {mergeCatalog} from '../src/catalog-merge.js';
import {applyImport,uploadFile} from '../scripts/supabase/import.mjs';
const base=process.env.TEST_POSTGRES_URL||'postgresql://postgres@127.0.0.1:55432/postgres';
const name='rt_phase1_import_'+process.pid;let admin,db,plan;
before(async()=>{admin=await connect(base,{localOnly:true});await admin.query(`create database ${name}`);const url=new URL(base);url.pathname='/'+name;db=await connect(url.toString(),{localOnly:true});await db.query(await readFile(new URL('../supabase/tests/bootstrap.sql',import.meta.url),'utf8'));await applyMigrations(db);plan=await createImportPlan()});
after(async()=>{await db?.end();if(admin){await admin.query(`drop database if exists ${name} with (force)`);await admin.end()}});
test('complete legacy catalog imports into PostgreSQL with exact IDs, counts and dimensions',async()=>{
 const result=await applyImport(db,plan,{local:true});assert.equal(result.alreadyCompleted,false);
 for(const [table,count] of Object.entries(plan.report.counts))assert.equal(Number((await db.query(`select count(*) n from ${table}`)).rows[0].n),count,table);
 const baseline=JSON.parse(await readFile(new URL('../public/catalog/index.json',import.meta.url)));const input=mergeCatalog(baseline,JSON.parse(await readFile(new URL('../public/catalog/additions.json',import.meta.url))));assert.deepEqual((await db.query('select id from public.products order by sort_order')).rows.map(p=>p.id),input.rows.map(r=>r[0]));
 assert.equal(Number((await db.query('select count(*) n from public.products where inner_mm=20 and outer_mm=47')).rows[0].n),331);
 assert.equal(Number((await db.query("select sum(jsonb_array_length(specifications)) n from public.products")).rows[0].n),plan.report.specifications);assert.equal(Number((await db.query('select sum(jsonb_array_length(specifications)) n from public.products where sort_order<109417')).rows[0].n),342504);
 const search=(await db.query('select public.search_public_catalog(p_inner=>20,p_outer=>47) data')).rows[0].data;assert.equal(search.totalCount,331);assert.equal(search.items.length,24);
 const site=(await db.query('select public.get_public_site() data')).rows[0].data;assert.equal(site.totalProducts,plan.report.products);assert.equal(site.articles.length,10);
 const code=(await db.query("select public.search_public_catalog(p_code=>'SKF6001-2RSH/C3') data")).rows[0].data;assert.ok(code.totalCount>0);assert.ok(code.items.every(p=>p.brand==='SKF')); 
 assert.equal((await db.query('select count(*) n from private.product_prices')).rows[0].n,'0');
});
test('repeat import is idempotent and does not overwrite later admin edits',async()=>{
 const id=(await db.query('select id from public.products limit 1')).rows[0].id;await db.query('update public.products set name=$2 where id=$1',[id,'Admin tarafından değiştirildi']);const result=await applyImport(db,plan,{local:true});assert.equal(result.alreadyCompleted,true);assert.equal((await db.query('select name from public.products where id=$1',[id])).rows[0].name,'Admin tarafından değiştirildi');assert.equal((await db.query('select count(*) n from private.import_runs')).rows[0].n,'1');
});
test('a different source cannot silently merge into the completed one-time import',async()=>{
 await assert.rejects(applyImport(db,{...plan,report:{...plan.report,sourceSha256:'b'.repeat(64)}},{local:true}),/Farklı kaynak/);
});
test('public read after import returns the same catalog and never leaks import-source metadata',async()=>{
 await db.query('begin');try{await db.query('set local role anon');assert.equal((await db.query('select count(*) n from public.products')).rows[0].n,String(plan.report.products));assert.equal((await db.query('select count(*) n from public.articles')).rows[0].n,'10');await assert.rejects(db.query('select * from private.product_import_metadata limit 1'),e=>e.code==='42501')}finally{await db.query('rollback')}
});
test('Storage duplicate check verifies existing contents instead of overwriting',async()=>{
 const file=plan.uploads[0];const bytes=await readFile(new URL('../public/'+file.local,import.meta.url));let uploads=0;
 const storage={from:()=>({upload:async(_path,payload,options)=>{uploads++;assert.equal(options.upsert,false);assert.equal(Buffer.compare(bytes,payload),0);return {error:{statusCode:409}}},download:async()=>({data:new Blob([bytes])})})};await uploadFile(storage,file);assert.equal(uploads,1);
 await assert.rejects(uploadFile({from:()=>({upload:async()=>({error:{statusCode:409}}),download:async()=>({data:new Blob(['wrong'])})})},file),/eşleşmiyor/);
});

test('an interrupted import resumes checkpoints without overwriting completed batches',async()=>{
 const temporary='rt_phase1_resume_'+process.pid;await admin.query(`create database ${temporary}`);const url=new URL(base);url.pathname='/'+temporary;const resumed=await connect(url.toString(),{localOnly:true});
 try{
  await resumed.query(await readFile(new URL('../supabase/tests/bootstrap.sql',import.meta.url),'utf8'));await applyMigrations(resumed);
  const products=[];for(const product of plan.tableRows['public.products']()){products.push(product);if(products.length===3)break}
  const tableRows={'public.brands':plan.tableRows['public.brands'],'public.categories':plan.tableRows['public.categories'],'public.products':products};
  const small={uploads:[],tableRows,report:{sourceSha256:'c'.repeat(64),counts:Object.fromEntries(Object.entries(tableRows).map(([table,rows])=>[table,rows.length]))}};
  let fail=true;const interrupted={query:(sql,values)=>{if(fail&&sql.startsWith('insert into public.products')){fail=false;throw Error('simulated interruption')}return resumed.query(sql,values)}};
  await assert.rejects(applyImport(interrupted,small,{local:true}),/interruption/);
  const checkpoint=(await resumed.query('select checkpoint,state from private.import_runs')).rows[0];assert.equal(checkpoint.state,'failed');assert.equal(checkpoint.checkpoint['public.categories'],plan.report.counts['public.categories']);assert.equal((await resumed.query('select count(*) n from public.products')).rows[0].n,'0');
  await resumed.query("update public.brands set name='Edited after interruption' where id='brand-0'");await applyImport(resumed,small,{local:true});assert.equal((await resumed.query('select count(*) n from public.products')).rows[0].n,'3');assert.equal((await resumed.query("select name from public.brands where id='brand-0'")).rows[0].name,'Edited after interruption');
 }finally{await resumed.end();await admin.query(`drop database if exists ${temporary} with (force)`)}
});
