export function authError(error){
 if(!error)return '';
 if(error.code==='email_not_confirmed')return 'Giriş yapmadan önce e-posta adresinizi doğrulayın.';
 if(error.code==='invalid_credentials'||error.status===400)return 'E-posta veya şifre yanlış.';
 if(error.status===429||error.code?.includes('rate_limit'))return 'Çok fazla deneme yapıldı. Bir süre sonra tekrar deneyin.';

 return 'İşlem tamamlanamadı. Bağlantınızı kontrol edip yeniden deneyin.';
}
export async function staffAccess(client){
 const {data,error}=await client.rpc('get_staff_access');
 if(error)throw error;
 const member=data?.[0];return member&&['admin','editor','sales'].includes(member.role)?member:null;
}
export async function signIn(client,email,password){
 const result=await client.auth.signInWithPassword({email:email.trim(),password});if(result.error)throw result.error;return result.data;
}
export async function completeAuthCallback(client,location){
 const params=new URLSearchParams(location.search);const fragment=new URLSearchParams(location.hash.replace(/^#/,''));
 if(params.has('error')||fragment.has('error'))throw Error('Bağlantı geçersiz veya süresi dolmuş. Yeni bir şifre bağlantısı isteyin.');
 if(params.has('code')){const result=await client.auth.exchangeCodeForSession(params.get('code'));if(result.error)throw Error('Giriş bağlantısı doğrulanamadı. Yeni bir bağlantı isteyin.');return}
 if(params.has('token_hash')){
  const type=params.get('type');if(!['invite','recovery'].includes(type))throw Error('Bu giriş bağlantısı desteklenmiyor.');
  const result=await client.auth.verifyOtp({token_hash:params.get('token_hash'),type});if(result.error)throw Error('Giriş bağlantısı doğrulanamadı. Yeni bir bağlantı isteyin.');
 }
 if(fragment.has('access_token')||fragment.has('refresh_token')){
  if(!fragment.get('access_token')||!fragment.get('refresh_token'))throw Error('Eksik oturum bağlantısı.');
  const result=await client.auth.setSession({access_token:fragment.get('access_token'),refresh_token:fragment.get('refresh_token')});
  if(result.error)throw Error('Giriş bağlantısı doğrulanamadı. Yeni bir bağlantı isteyin.');
 }
}
