import pg from 'pg';
import {readFile} from 'node:fs/promises';
import {readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
export function databaseConfig(connectionString,{localOnly=false}={}){
 if(!connectionString)throw Error('SUPABASE_DB_URL tanımlanmalı; bağlantı dizesini komut satırına yazmayın.');
 const url=new URL(connectionString);const local=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
 if(localOnly&&!local)throw Error('Test işlemleri yalnızca yerel PostgreSQL üzerinde çalıştırılabilir.');
 for(const option of ['sslmode','sslcert','sslkey','sslrootcert'])url.searchParams.delete(option);
 return {connectionString:url.toString(),ssl:local?false:{rejectUnauthorized:true},connectionTimeoutMillis:15000};
}
export const connect=async(value,options)=>{const client=new pg.Client(databaseConfig(value,options));await client.connect();return client};
export async function applyMigrations(client){
 await client.query('create schema if not exists private');
 await client.query('create table if not exists private.schema_migrations(version text primary key,sha256 text not null,applied_at timestamptz not null default now())');
 await client.query('revoke all on private.schema_migrations from public,anon,authenticated');
 await client.query('alter table private.schema_migrations enable row level security');
 const files=(await readdir(new URL('../../supabase/migrations/',import.meta.url))).filter(p=>p.endsWith('.sql')).sort();
 for(const name of files){
  const sql=await readFile(new URL('../../supabase/migrations/'+name,import.meta.url),'utf8');const sha=createHash('sha256').update(sql).digest('hex');
  const previous=await client.query('select sha256 from private.schema_migrations where version=$1',[name]);
  if(previous.rowCount){if(previous.rows[0].sha256!==sha)throw Error('Uygulanmış migration değişmiş: '+name);continue}
  await client.query('begin');try{await client.query(sql);await client.query('insert into private.schema_migrations(version,sha256) values($1,$2)',[name,sha]);await client.query('commit')}catch(error){await client.query('rollback');throw error}
 }
}
export function assertProject({databaseUrl,projectUrl,confirmation,local=false}){
 const db=new URL(databaseUrl);if(local){
  if(!['localhost','127.0.0.1','[::1]'].includes(db.hostname)||!db.pathname.startsWith('/rt_phase1_'))throw Error('--local yalnızca rt_phase1_ adlı yerel test veritabanlarında kullanılabilir.');return;
 }
 if(db.hostname.endsWith('.pooler.supabase.com')&&db.port&&db.port!=='5432')throw Error('Aktarım için Direct veya 5432 Session Pooler kullanın; Transaction Pooler oturum kilitleriyle uyumlu değildir.');
 const project=new URL(projectUrl||'https://missing.invalid');const ref=project.hostname.match(/^([a-z0-9-]+)\.supabase\.co$/)?.[1];
 if(!ref||confirmation!==ref)throw Error('--confirm-project ile SUPABASE_URL proje kimliği eşleşmeli.');
 if(db.hostname!==`db.${ref}.supabase.co`&&!(db.hostname.endsWith('.pooler.supabase.com')&&decodeURIComponent(db.username)===`postgres.${ref}`))throw Error('Veritabanı bağlantısı onaylanan Supabase projesiyle eşleşmiyor.');
}
