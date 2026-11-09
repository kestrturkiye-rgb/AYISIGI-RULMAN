import {connect,assertProject} from './database.mjs';
const args=process.argv.slice(2);const value=flag=>{const i=args.indexOf(flag);return i<0?undefined:args[i+1]};
try{
 const user=value('--user-id');if(!/^[a-f0-9-]{36}$/i.test(user||''))throw Error('Supabase Auth içinde oluşturulmuş hesabın --user-id UUID değerini girin.');
 if(!args.includes('--apply'))throw Error('İlk admini tanımlamak için --apply gerekir. Şifre bu araçtan alınmaz.');
 assertProject({databaseUrl:process.env.SUPABASE_DB_URL,projectUrl:process.env.SUPABASE_URL,confirmation:value('--confirm-project'),local:args.includes('--local')});
 const client=await connect(process.env.SUPABASE_DB_URL);try{await client.query('select private.bootstrap_first_admin($1::uuid)',[user]);console.log('İlk admin rolü tanımlandı. İkinci kez başlatılamaz.')}finally{await client.end()}
}catch(error){console.error(error.code?`Admin başlatılamadı (${error.code}); mevcut admini veya Auth hesabını kontrol edin.`:error.message);process.exitCode=1}
