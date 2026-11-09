export function supabaseConfiguration(env={}){
 const url=(env.VITE_SUPABASE_URL||'').trim();const key=(env.VITE_SUPABASE_PUBLISHABLE_KEY||env.VITE_SUPABASE_ANON_KEY||'').trim();
 if(!url&&!key)return {configured:false};
 if(!url||!key)return {configured:false,error:'Supabase adresi ve publishable key birlikte tanımlanmalı.'};
 let parsed;try{parsed=new URL(url)}catch{return {configured:false,error:'Supabase adresi geçersiz.'}}
 if(parsed.username||parsed.password||parsed.search||parsed.hash||!['','/'].includes(parsed.pathname))return {configured:false,error:'Supabase proje adresini ek yol veya kimlik bilgisi olmadan girin.'};
 if(parsed.protocol!=='https:'&&!(parsed.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(parsed.hostname)))return {configured:false,error:'Supabase bağlantısında HTTPS kullanılmalı.'};
 if(key.startsWith('sb_secret_'))return {configured:false,error:'Sunucu anahtarı tarayıcıda kullanılamaz; publishable key gerekiyor.'};
 if(!key.startsWith('sb_publishable_')){
  try{const payload=JSON.parse(atob(key.split('.')[1].replaceAll('-','+').replaceAll('_','/')));if(payload.role!=='anon')throw Error('role')}catch{return {configured:false,error:'Yalnızca publishable veya legacy anon key kullanılabilir.'}}
 }
 return {configured:true,url:parsed.origin,key};
}
export function authRedirectUrl(location,base='/',action){
 const url=new URL(base,location.origin);if(action)url.searchParams.set('auth_action',action);return url.href;
}
export function hasAuthCallback(location){
 const params=new URLSearchParams(location.search);const hash=new URLSearchParams(location.hash.replace(/^#/,''));
 return params.has('code')||params.has('token_hash')||hash.has('access_token')||hash.has('refresh_token')||params.has('error')||hash.has('error');
}
