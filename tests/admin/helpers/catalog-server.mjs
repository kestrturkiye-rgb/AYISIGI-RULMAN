// Loopback-only test harness. Auth/Storage are emulated; every catalog RPC uses real PostgreSQL + RLS.
import {setTimeout as pause} from 'node:timers/promises';import express from 'express';import {randomUUID} from 'node:crypto';import {makeHandler} from '../../../api/_gateway.mjs';import pg from 'pg';import {readFile} from 'node:fs/promises';import {connect,applyMigrations} from '../../../scripts/supabase/database.mjs';
export const ids={admin:'11111111-1111-4111-8111-111111111111',editor:'22222222-2222-4222-8222-222222222222',sales:'33333333-3333-4333-8333-333333333333',member:'44444444-4444-4444-8444-444444444444'};
export const token=(role='admin')=>[Buffer.from('{"alg":"HS256"}').toString('base64url'),Buffer.from(JSON.stringify({sub:ids[role],role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'test-only'].join('.');
const user=role=>({id:ids[role],email:role+'@example.test',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{username:'TestYonetici'},created_at:new Date().toISOString()});
export async function startCatalogServer({port=4199}={}){
 const base=process.env.TEST_POSTGRES_URL||'postgresql://postgres@127.0.0.1:55432/postgres',name='rt_catalog_browser_'+process.pid;
 const root=await connect(base,{localOnly:true});await root.query('create database '+name);const url=new URL(base);url.pathname='/'+name;const setup=await connect(url.href,{localOnly:true});await setup.query(await readFile('supabase/tests/bootstrap.sql','utf8'));await applyMigrations(setup);
 for(const [role,id]of Object.entries(ids))await setup.query('insert into auth.users values($1,$2)',[id,role+'@example.test']);await setup.query('select private.bootstrap_first_admin($1)',[ids.admin]);await setup.query("insert into private.staff_members(user_id,role) values($1,'editor'),($2,'sales')",[ids.editor,ids.sales]);
 await setup.query("insert into public.categories(id,name,slug,status) values('c','Bilyalı Rulmanlar','bilyali-rulmanlar','published');insert into public.brands(id,name,slug,status) values('b','SKF','skf','published');");
 await setup.query("insert into public.products(id,sku,name,slug,category_id,brand_id,status,inner_mm,outer_mm,width_mm) values('p','6204-2RS','Sabit bilyalı rulman','6204-2rs','c','b','published',20,47,14)");
 await setup.end();const pool=new pg.Pool({connectionString:url.href,max:5});pool.on('error',error=>{if(error.code!=='57P01')console.error('Test database pool error',error.message);});const app=express(),objects=new Map();app.use(express.raw({type:()=>true,limit:'12mb'}));
 const decode=req=>{const t=req.headers.authorization?.replace('Bearer ','');if(t==='test-service-only')return {service:true};try{const p=JSON.parse(Buffer.from(t.split('.')[1],'base64url').toString());const role=Object.entries(ids).find(([,id])=>id===p.sub)?.[0];return role?{role,id:p.sub}:{};}catch{return {};}};
 const json=req=>req.body?.length?JSON.parse(req.body.toString()):{};
 async function sql(req,fn){const actor=decode(req),db=await pool.connect();try{await db.query('begin');await db.query('set local role '+(actor.service?'service_role':actor.id?'authenticated':'anon'));await db.query("select set_config('request.jwt.claim.sub',$1,true)",[actor.id||'']);const result=await fn(db);await db.query('commit');return result;}catch(e){await db.query('rollback');throw e;}finally{db.release();}}
 app.use(async(req,res)=>{try{
 const actor=decode(req),path=req.path;
 if(path==='/auth/v1/token'){const body=json(req),role=body.email?.split('@')[0];if(!ids[role])return res.status(400).json({error:'invalid_grant'});return res.json({access_token:token(role),refresh_token:'test-refresh-'+role,expires_in:3600,token_type:'bearer',user:user(role)});}
 if(path==='/auth/v1/admin/users'&&req.method==='POST'){
 if(!actor.service)return res.status(403).json({message:'Denied'});const data=json(req),id=randomUUID();await pool.query('insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)',[id,data.email,data.user_metadata||{}]);return res.json({id,email:data.email,aud:'authenticated',role:'authenticated',user_metadata:data.user_metadata||{},app_metadata:{},created_at:new Date().toISOString()});
 }
 if(path.startsWith('/auth/v1/admin/users/')&&req.method==='DELETE'){if(!actor.service)return res.status(403).end();await pool.query('delete from auth.users where id=$1',[path.split('/').at(-1)]);return res.json({});}
 if(path==='/auth/v1/user')return actor.role?res.json(user(actor.role)):res.status(401).json({message:'Invalid test token'});
 if(path==='/auth/v1/logout')return res.status(204).end();
 if(path.startsWith('/rest/v1/rpc/')){
 const name=path.split('/').at(-1);if(!/^(admin_|get_admin_dashboard|get_staff_access|register_catalog_media|publish_catalog_media|get_public_|get_member_|my_account|ingest_site_event|submit_site_quote|lease_quote_notification|finish_quote_notification|pending_quote_notifications|prune_site_events)/.test(name))return res.status(404).end();
 const body=json(req);const args=(await pool.query("select proargnames from pg_proc p join pg_namespace n on p.pronamespace=n.oid where n.nspname='public' and p.proname=$1",[name])).rows[0]?.proargnames||[];
 const input=args.filter(k=>Object.hasOwn(body,k));
 if(name==='get_staff_access'){const result=await sql(req,db=>db.query('select * from public.get_staff_access()'));return res.json(result.rows);}
 const data=await sql(req,async db=>{const r=await db.query(`select public.${name}(${input.map((k,i)=>k+'=> $'+(i+1)).join(',')}) d`,input.map(k=>Array.isArray(body[k])&&['p_ids','product_ids','media_ids'].includes(k)?body[k]:typeof body[k]==='object'&&body[k]!==null?JSON.stringify(body[k]):body[k]));return name==='get_staff_access'?r.rows.map(r=>r.d):r.rows[0].d;});
 // PostgreSQL composite returned as text by pg; PostgREST serializes table returns into objects.
 if(name==='get_staff_access')return res.json(actor.role?[{user_id:actor.id,role:actor.role}]:[]);
 return res.json(data);
 }
 if(path==='/rest/v1/media_assets'){
 const id=String(req.query.id||'').replace(/^eq\./,'');const rows=await sql(req,db=>db.query('select * from public.media_assets where id=$1 and deleted_at is null',[id]));if(!rows.rowCount)return res.status(404).json({code:'PGRST116'});return res.json(rows.rows[0]);
 }
 const storage=path.match(/^\/storage\/v1\/object\/(sign\/|authenticated\/|public\/)?(media-originals|media-published)\/?(.*)$/);
 if(storage){const [,mode='',bucket,pathKey]=storage,key=bucket+'/'+pathKey;
 if(req.method==='POST'&&mode==='sign/'){
  if(!['admin','editor'].includes(actor.role)||!objects.has(key))return res.status(403).json({message:'Denied'});
  return res.json({signedURL:`/object/sign/${key}?token=test-signed`});
 }
 if(req.method==='POST'&&!mode){if(!actor.service)return res.status(403).json({message:'Denied'});if(objects.has(key))return res.status(409).json({message:'The resource already exists',error:'Duplicate'});let bytes=req.body,mime=req.headers['content-type'];if(mime?.startsWith('multipart/form-data')){const f=await new Request('http://localhost',{method:'POST',headers:{'Content-Type':mime},body:bytes}).formData();const file=[...f.values()].find(v=>typeof v!=='string');bytes=Buffer.from(await file.arrayBuffer());mime=file.type;}objects.set(key,{bytes,mime});return res.json({Key:key,Id:'test-object'});}
 if(req.method==='DELETE'){if(!actor.service)return res.status(403).end();for(const prefix of json(req).prefixes||[])objects.delete(bucket+'/'+prefix);return res.json([]);}
 if(req.method==='GET'){const value=objects.get(key);if(!value)return res.status(404).json({message:'Not found'});if(bucket==='media-originals'&&!actor.service&&!(mode==='sign/'&&req.query.token==='test-signed'))return res.status(403).end();return res.type(value.mime||'application/octet-stream').send(value.bytes);}
 }
 if(path==='/functions/v1/rt-admin-operations'){
 const upstream=await fetch('http://127.0.0.1:8000',{method:req.method,headers:{authorization:req.headers.authorization||'','content-type':req.headers['content-type']||'application/json'},body:req.body});return res.status(upstream.status).type('json').send(Buffer.from(await upstream.arrayBuffer()));
 }
 if(path==='/api/collect'||path==='/api/quote'){
 req.headers.origin='https://kestrturkiye-rgb.github.io';req.headers['x-forwarded-for']='192.0.2.15';req.headers['x-vercel-ip-country']='TR';req.headers['x-vercel-ip-city']='Ankara';return makeHandler(path.endsWith('collect')?'collect':'quote')(req,res);
 }
 if(path==='/functions/v1/rt-catalog-media'){
 const upstream=await fetch('http://127.0.0.1:8000',{method:req.method,headers:{authorization:req.headers.authorization||'',apikey:'test-public',...(req.headers['content-type']?{'content-type':req.headers['content-type']}:{})},body:req.body});return res.status(upstream.status).type('json').send(Buffer.from(await upstream.arrayBuffer()));
 }
 return res.status(404).json({error:'Unknown test route '+path});
 }catch(e){res.status(e.code==='42501'?403:e.code==='PT409'?409:400).json({code:e.code||'test-error',message:e.message});}});
 const server=await new Promise(resolve=>{const s=app.listen(port,'127.0.0.1',()=>resolve(s));});
 return {url:`http://127.0.0.1:${port}`,pool,objects,async stop(){await new Promise(r=>server.close(r));await pool.end();await pause(50);await root.query('drop database if exists '+name+' with (force)');await root.end();}};
}
