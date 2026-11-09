import {connect,applyMigrations,assertProject} from './database.mjs';
const args=process.argv.slice(2);const confirmation=args[args.indexOf('--confirm-project')+1];
try{
 if(!args.includes('--apply'))throw Error('Uygulamak için --apply ve --confirm-project gerekir. Önce SQL dosyalarını inceleyin.');
 assertProject({databaseUrl:process.env.SUPABASE_DB_URL,projectUrl:process.env.SUPABASE_URL,confirmation,local:args.includes('--local')});
 const client=await connect(process.env.SUPABASE_DB_URL);try{await applyMigrations(client);console.log('Migration dosyaları uygulandı; site veri kaynağı değiştirilmedi.')}finally{await client.end()}
}catch(error){console.error(error.code?`Veritabanı işlemi başarısız (${error.code}); hedef ve yetkileri kontrol edin.`:error.message);process.exitCode=1}
