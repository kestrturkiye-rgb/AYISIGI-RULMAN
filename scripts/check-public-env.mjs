import {assertPublicEnvironment} from '../src/supabase/env-guard.js';
export {assertPublicEnvironment} from '../src/supabase/env-guard.js';

if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 try{const {loadEnv}=await import('vite');const {readFile}=await import('node:fs/promises');const project=JSON.parse(await readFile(new URL('../apps/admin/src/project-config.json',import.meta.url),'utf8'));const env={...loadEnv('production',new URL('../',import.meta.url).pathname,'VITE_'),...process.env};if(env.VITE_DATA_SOURCE==='supabase'){env.VITE_SUPABASE_URL||=project.url;env.VITE_SUPABASE_PUBLISHABLE_KEY||=project.publicKey;}if(env.VITE_ADMIN_LOCAL_TEST==='true')throw Error('Yerel test modu production derlemesine eklenemez.');assertPublicEnvironment(env);console.log('Public ortam değişkenleri kontrol edildi.')}catch(error){console.error(error.message);process.exitCode=1}
}
