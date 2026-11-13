import {createImportPlan,root,sha} from './import-plan.mjs';
import {connect,assertProject} from './database.mjs';
import {createClient} from '@supabase/supabase-js';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
export async function insertBatch(client,table,rows){
 if(!rows.length)return 0;
 if(!/^(public|private)\.[a-z_]+$/.test(table))throw Error('Geçersiz aktarım tablosu.');
 const columns=[...new Set(rows.flatMap(row=>Object.keys(row)))];
 if(columns.some(column=>!/^[a-z_][a-z0-9_]*$/.test(column)))throw Error('Geçersiz kolon.');
 const key=table==='private.product_import_metadata'?'product_id':table.endsWith('site_settings')||table.endsWith('ui_texts')?'key':'id';
 const names=columns.map(name=>'"'+name+'"').join(',');
 const result=await client.query(`insert into ${table}(${names}) select ${names} from jsonb_populate_recordset(null::${table},$1::jsonb) on conflict("${key}") do nothing`,[JSON.stringify(rows)]);
 return result.rowCount;
}
export async function uploadFile(storage,file){
 const bytes=readFileSync(path.join(root,'public',file.local));if(sha(bytes)!==file.sha256)throw Error('Yerel dosya aktarım sırasında değişti.');
 const result=await storage.from(file.bucket).upload(file.path,bytes,{contentType:file.mime,upsert:false,cacheControl:'31536000'});
 if(result.error){
  if(String(result.error.statusCode)!=='409'&&!/already exists/i.test(result.error.message))throw Error('Medya yüklenemedi; bağlantı ve Storage izinlerini kontrol edin.');
  const existing=await storage.from(file.bucket).download(file.path);if(existing.error||sha(Buffer.from(await existing.data.arrayBuffer()))!==file.sha256)throw Error('Storage dosyası beklenen içerikle eşleşmiyor.');
 }
}
export async function applyImport(client,plan,{storage=null,local=false}={}){
 await client.query("select pg_advisory_lock(hashtext('rulman-initial-import'))");
 try{
  const other=await client.query("select 1 from private.import_runs where state='completed' and source_sha256<>$1 limit 1",[plan.report.sourceSha256]);
  if(other.rowCount)throw Error('Farklı kaynakla tamamlanmış aktarım var. Otomatik birleştirme yerine yeni aktarımı inceleyin.');
  const result=await client.query("insert into private.import_runs(source_sha256,counts) values($1,$2::jsonb) on conflict(source_sha256) do update set source_sha256=excluded.source_sha256 returning *",[plan.report.sourceSha256,JSON.stringify(plan.report.counts)]);
  const run=result.rows[0];if(run.state==='completed')return {alreadyCompleted:true,runId:run.id};
  const checkpoint=run.checkpoint||{};const inserted={};
  if(!local&&!storage)throw Error('Gerçek projeye aktarımda --upload-media ve sunucu Storage anahtarı gereklidir.');
  if(storage){
   for(let offset=checkpoint.media||0;offset<plan.uploads.length;offset+=8){
    await Promise.all(plan.uploads.slice(offset,offset+8).map(file=>uploadFile(storage,file)));
    checkpoint.media=Math.min(offset+8,plan.uploads.length);await client.query('update private.import_runs set checkpoint=$2::jsonb where id=$1',[run.id,JSON.stringify(checkpoint)]);
   }
  }
  for(const [table,source] of Object.entries(plan.tableRows)){
   let batch=[],seen=0;const saved=checkpoint[table]||0;inserted[table]=0;
   async function flush(){
    await client.query('begin');try{
     inserted[table]+=await insertBatch(client,table,batch);checkpoint[table]=seen;
     await client.query('update private.import_runs set checkpoint=$2::jsonb,state=\'running\' where id=$1',[run.id,JSON.stringify(checkpoint)]);await client.query('commit');batch=[];
    }catch(error){await client.query('rollback');throw error}
   }
   for(const row of typeof source==='function'?source():source){seen++;if(seen<=saved)continue;batch.push(row);if(batch.length>=500)await flush()}
   if(batch.length)await flush();
   if(seen!==plan.report.counts[table])throw Error('Aktarım sayısı beklenen değerle eşleşmedi.');
  }
  await client.query("update private.import_runs set state='completed',completed_at=now(),counts=$2::jsonb where id=$1",[run.id,JSON.stringify({expected:plan.report.counts,lastAttemptInserted:inserted,mediaUploaded:Boolean(storage)})]);
  return {alreadyCompleted:false,runId:run.id,inserted,mediaUploaded:Boolean(storage)};
 }catch(error){await client.query("update private.import_runs set state='failed' where source_sha256=$1 and state<>'completed'",[plan.report.sourceSha256]);throw error}
 finally{await client.query("select pg_advisory_unlock(hashtext('rulman-initial-import'))")}
}
async function main(){
 const args=process.argv.slice(2);const value=flag=>{const i=args.indexOf(flag);return i>=0?args[i+1]:undefined};
 const plan=await createImportPlan();const directory=path.resolve(value('--out')||path.join(root,'data/supabase-import',plan.report.sourceSha256.slice(0,16)));mkdirSync(directory,{recursive:true,mode:0o700});
 writeFileSync(path.join(directory,'report.json'),JSON.stringify(plan.report,null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify({mode:args.includes('--apply')?'apply':'dry-run',...plan.report},null,2));
 if(!args.includes('--apply')){console.log('Dry-run tamamlandı; veritabanına veya Storage’a yazılmadı.');return}
 assertProject({databaseUrl:process.env.SUPABASE_DB_URL,projectUrl:process.env.SUPABASE_URL,confirmation:value('--confirm-project'),local:args.includes('--local')});
 let storage=null;if(args.includes('--upload-media')){
  if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY)throw Error('Storage için SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekiyor.');
  storage=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}}).storage;
 }
 const client=await connect(process.env.SUPABASE_DB_URL);try{const result=await applyImport(client,plan,{storage,local:args.includes('--local')});writeFileSync(path.join(directory,'result.json'),JSON.stringify(result,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(result,null,2))}finally{await client.end()}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{console.error(error.code?`Aktarım durdu (${error.code}). Kaynak raporunu ve migration sürümünü kontrol edin; gizli bağlantı bilgileri yazdırılmadı.`:error.message);process.exitCode=1});
