// Trusted operator CLI. No browser/service key access required.
import {connect,assertProject} from './database.mjs';
const args=process.argv.slice(2),flag=name=>{const i=args.indexOf(name);return i>=0?args[i+1]:undefined;};
try{
 const user=flag('--user-id'),role=flag('--role');
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(user||''))throw Error('Geçerli --user-id gerekir.');
 if(!['admin','editor','sales'].includes(role))throw Error('--role admin, editor veya sales olmalı.');
 if(!args.includes('--apply'))throw Error('Yetki değişikliği için --apply gerekir.');
 assertProject({databaseUrl:process.env.SUPABASE_DB_URL,projectUrl:process.env.SUPABASE_URL,confirmation:flag('--confirm-project'),local:args.includes('--local')});
 const db=await connect(process.env.SUPABASE_DB_URL);
 try{
  await db.query('begin');await db.query("select pg_advisory_xact_lock(hashtext('rulman-staff-roles'))");
  if(!(await db.query("select 1 from private.staff_members where role='admin' and active")).rowCount)throw Error('Önce ilk admin bootstrap işlemini tamamlayın.');
  if(!(await db.query('select 1 from auth.users where id=$1',[user])).rowCount)throw Error('Hesap önce Supabase Auth içinde oluşturulmalı.');
  await db.query('insert into private.staff_members(user_id,role) values($1,$2) on conflict(user_id) do update set role=excluded.role,active=true',[user,role]);
  await db.query("insert into private.audit_log(entity_table,entity_id,action) values('private.staff_members',$1,$2)",[user,'operator_cli_set_role:'+role]);
  await db.query('commit');console.log('Hesap yetkisi güncellendi. Son admin koruması korunur.');
 }catch(e){await db.query('rollback');throw e;}finally{await db.end();}
}catch(e){console.error(e.code?'Yetki değiştirilemedi ('+e.code+').':e.message);process.exitCode=1;}
