import {hasAuthCallback} from './config.js';
let callbackState={kind:null,error:''};
export function consumeAuthCallback(){const result=callbackState;callbackState={kind:null,error:''};return result}
export async function initializeAuthCallback(){
 if(!hasAuthCallback(window.location))return;
 const params=new URLSearchParams(location.search),fragment=new URLSearchParams(location.hash.slice(1));
 const kind=params.get('type')||fragment.get('type')||params.get('auth_action');
 callbackState.kind=['invite','recovery'].includes(kind)?kind:null;
 try{
  const [{getSupabaseClient},{completeAuthCallback}]=await Promise.all([import('./client.js'),import('./auth-service.js')]);
  const client=getSupabaseClient();if(!client)throw Error('Supabase bağlantısı tanımlanmadan giriş bağlantısı kullanılamaz.');
  await completeAuthCallback(client,window.location);
 }catch{callbackState.error='Giriş bağlantısı doğrulanamadı. Proje bağlantısını kontrol edin veya yeni bir şifre bağlantısı isteyin.'}
 finally{history.replaceState(null,'',import.meta.env.BASE_URL+(String(params.get('auth_action')||'').startsWith('member_')?'#/hesabim'+(params.get('auth_action')==='member_recovery'?'?sifre=1':''):'#/admin'))}
}
