// LOCAL TEST ONLY: real Supabase Auth + PostgreSQL; never included in dist.
import {spawn,spawnSync} from 'node:child_process';
import {randomBytes,createHmac} from 'node:crypto';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {connect,applyMigrations} from './supabase/database.mjs';
const localDir=process.env.ADMIN_LOCAL_DIR||'/tmp/rt-admin-local-test';
const localContainer=process.env.ADMIN_LOCAL_CONTAINER||'rt-admin-step1-db',authContainer=process.env.ADMIN_LOCAL_AUTH_CONTAINER||'rt-admin-local-auth';
if(!/^rt-[a-z0-9-]+$/.test(localContainer)||!/^rt-[a-z0-9-]+$/.test(authContainer)||!/^\/tmp\/rt-admin-[a-z0-9-]+$/.test(localDir))throw Error('Geçersiz yerel test hedefi.');
const dockerArgs=['--host=unix:///var/run/docker.sock'];
const dockerEnv={...process.env};for(const key of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete dockerEnv[key];
function docker(...args){const r=spawnSync('docker',[...dockerArgs,...args],{env:dockerEnv,encoding:'utf8'});if(r.status!==0)throw Error('Yerel Docker işlemi başarısız: '+args[0]+' '+(r.stderr||'').slice(0,200));return r.stdout.trim();}
function jwt(role,secret){const data=[{alg:'HS256',typ:'JWT'},{role,iss:'supabase',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+86400}].map(v=>Buffer.from(JSON.stringify(v)).toString('base64url')).join('.');return data+'.'+createHmac('sha256',secret).update(data).digest('base64url');}
const database=process.env.ADMIN_LOCAL_DATABASE||'rt_admin_local_auth';if(!/^rt_admin_local_auth(?:_[a-z0-9]+)?$/.test(database))throw Error('Geçersiz yerel test veritabanı.');let gateway,dev,db;let started=false;let reuse=false;
async function main(){
 await mkdir(localDir,{recursive:true,mode:0o700});
 docker('info','--format','{{.ServerVersion}}');
 const check=spawnSync('docker',[...dockerArgs,'inspect',localContainer],{env:dockerEnv,stdio:'ignore'});
 if(check.status!==0)docker('run','-d','--name',localContainer,'-e','POSTGRES_HOST_AUTH_METHOD=trust','-p','127.0.0.1:55432:5432','postgres:17-alpine','postgres','-c','wal_level=logical');
 else docker('start',localContainer);
 let dbReady=false;for(let i=0;i<30;i++){const probe=spawnSync('docker',[...dockerArgs,'exec',localContainer,'pg_isready','-U','postgres'],{env:dockerEnv,stdio:'ignore'});if(probe.status===0){dbReady=true;break;}await new Promise(r=>setTimeout(r,300));}if(!dbReady)throw Error('Yerel PostgreSQL başlamadı.');
 const owner=await connect('postgresql://postgres@127.0.0.1:55432/postgres',{localOnly:true});
 try{reuse=!!(await owner.query('select 1 from pg_database where datname=$1',[database])).rowCount;if(!reuse){await owner.query('create database '+database);await owner.query('alter database '+database+' set search_path to auth,public');}}finally{await owner.end();}
 db=await connect('postgresql://postgres@127.0.0.1:55432/'+database,{localOnly:true});
 await db.query('create schema if not exists auth');
 const secret=reuse?(await readFile(localDir+'/auth.env','utf8')).match(/^GOTRUE_JWT_SECRET=(.+)$/m)[1]:randomBytes(48).toString('hex'),anon=jwt('anon',secret),service=jwt('service_role',secret);
 const dbIp=docker('inspect',localContainer,'--format','{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}');
 const envPath=localDir+'/auth.env';
 await writeFile(envPath,[
  'GOTRUE_API_HOST=0.0.0.0','PORT=9999','GOTRUE_API_PORT=9999','API_EXTERNAL_URL=http://127.0.0.1:4182/auth/v1',
  'GOTRUE_SITE_URL=http://127.0.0.1:4180/admin/','GOTRUE_URI_ALLOW_LIST=http://127.0.0.1:4180/admin/**',
  'GOTRUE_DB_DRIVER=postgres','GOTRUE_DB_DATABASE_URL=postgres://postgres@'+dbIp+':5432/'+database+'?sslmode=disable',
  'GOTRUE_DB_NAMESPACE=auth','GOTRUE_JWT_SECRET='+secret,'GOTRUE_JWT_ADMIN_ROLES=service_role','GOTRUE_JWT_AUD=authenticated',
  'GOTRUE_JWT_DEFAULT_GROUP=authenticated','GOTRUE_JWT_EXP=3600','GOTRUE_DISABLE_SIGNUP=true','GOTRUE_MAILER_AUTOCONFIRM=true','GOTRUE_SMTP_ADMIN_EMAIL=local@example.test',
 ].join('\n')+'\n',{mode:0o600});
 docker('run','-d','--name',authContainer,'--env-file',envPath,'-p','127.0.0.1:9999:9999','supabase/gotrue:v2.177.0');started=true;
 let ready=false;for(let i=0;i<40;i++){try{if((await fetch('http://127.0.0.1:9999/health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}if(!ready)throw Error('Yerel Auth servisi başlamadı. Konteyner loglarını inceleyin.');
 // Minimal storage/auth API scaffolding for this local harness, not a cloud migration.
 let bootstrap=await readFile(new URL('../supabase/tests/bootstrap.sql',import.meta.url),'utf8');
 bootstrap=bootstrap.replace('create function auth.uid()', 'create or replace function auth.uid()').replace('create schema auth;','').replace('create table auth.users(id uuid primary key,email text);','');
 if(!reuse)await db.query(bootstrap);await applyMigrations(db);
 const accounts=[];
 if(!reuse)for(const role of ['admin','editor','sales','unassigned']){
  const email=role+'@rulman.local',password=randomBytes(18).toString('base64url');
  const response=await fetch('http://127.0.0.1:9999/admin/users',{method:'POST',headers:{Authorization:'Bearer '+service,'Content-Type':'application/json'},body:JSON.stringify({email,password,email_confirm:true,role:'authenticated'})});
  if(!response.ok)throw Error('Yerel test hesabı oluşturulamadı ('+response.status+').');const user=await response.json();
  if(role==='admin')await db.query('select private.bootstrap_first_admin($1)',[user.id]);
  else if(role!=='unassigned')await db.query('insert into private.staff_members(user_id,role) values($1,$2)',[user.id,role]);
  accounts.push({role,email,password});
 }
 if(!reuse)await writeFile(localDir+'/accounts.json',JSON.stringify({notice:'Yalnızca yerel geçici test hesapları. Gerçek müşteri/veri yoktur.',url:'http://127.0.0.1:4180/admin/',accounts},null,2)+'\n',{mode:0o600});
 gateway=createServer(async(req,res)=>{
  const origin=req.headers.origin;const allowed=['http://127.0.0.1:4180','http://localhost:4180'];
  if(origin&&!allowed.includes(origin)){res.writeHead(403);res.end();return;}
  res.setHeader('Access-Control-Allow-Origin',origin||allowed[0]);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','authorization,apikey,content-type,content-profile,accept-profile,prefer,x-client-info,x-supabase-api-version');res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS');res.setHeader('Cache-Control','no-store');
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
  try{
   if(req.url?.startsWith('/auth/v1/')){
    // Local gateway intentionally exposes no admin endpoints.
    if(req.url.startsWith('/auth/v1/admin')){res.writeHead(403);res.end();return;}
    const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>65536)throw Error('limit');chunks.push(chunk);}
    const upstream=await fetch('http://127.0.0.1:9999/'+req.url.slice('/auth/v1/'.length),{method:req.method,headers:{'Content-Type':'application/json',Authorization:req.headers.authorization||'',apikey:anon},body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)});
    res.writeHead(upstream.status,{'Content-Type':'application/json'});res.end(await upstream.text());return;
   }
   if(req.method==='POST'&&['/rest/v1/rpc/get_staff_access','/rest/v1/rpc/get_admin_dashboard'].includes(req.url)){
    const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>2048)throw Error('limit');chunks.push(chunk);}
    const args=JSON.parse(Buffer.concat(chunks).toString()||'{}');
    const response=await fetch('http://127.0.0.1:9999/user',{headers:{Authorization:req.headers.authorization||''}});
    if(!response.ok){res.writeHead(401);res.end('{}');return;}const user=await response.json();
    // A dedicated connection per request prevents interleaved transaction identities.
    const scoped=await connect('postgresql://postgres@127.0.0.1:55432/'+database,{localOnly:true});
    try{await scoped.query('begin');await scoped.query('set local role authenticated');await scoped.query("select set_config('request.jwt.claim.sub',$1,true)",[user.id]);const dashboard=req.url.endsWith('get_admin_dashboard');const result=dashboard?await scoped.query('select public.get_admin_dashboard($1) as data',[args.p_period||'week']):await scoped.query('select * from public.get_staff_access()');await scoped.query('rollback');res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(dashboard?result.rows[0].data:result.rows));}finally{await scoped.end();}return;
   }
   res.writeHead(404);res.end('{}');
  }catch{res.writeHead(503);res.end('{"message":"Yerel test servisi kullanılamıyor."}');}
 });
 await new Promise(r=>gateway.listen(4182,'127.0.0.1',r));
 dev=spawn(process.execPath,[new URL('../node_modules/vite/bin/vite.js',import.meta.url).pathname,'--host','0.0.0.0','--port','4180','--strictPort'],{cwd:new URL('../apps/admin/',import.meta.url),stdio:'inherit',env:{...process.env,VITE_SUPABASE_URL:'http://127.0.0.1:4182',VITE_SUPABASE_PUBLISHABLE_KEY:anon,VITE_ADMIN_LOCAL_TEST:'true'}});
 console.log('GERÇEK YEREL AUTH TESTİ — hesaplar: '+localDir+'/accounts.json');
 console.log('Bu kurulum yalnızca Auth ve rol RPC akışını çalıştırır; tam Supabase emülatörü değildir. E-posta teslimi yoktur.');
}
async function stop(){dev?.kill('SIGTERM');gateway?.close();await db?.end();if(started)try{docker('rm','-f',authContainer);}catch{}process.exit();}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
main().catch(async e=>{console.error(e.message);gateway?.close();await db?.end();process.exitCode=1;});
