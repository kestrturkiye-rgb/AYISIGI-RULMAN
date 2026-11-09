import { client } from './config';
export type CallbackResult = { password: boolean; error: string };
let pending: Promise<CallbackResult> | undefined;
export function completeCallback(): Promise<CallbackResult> {
  return pending ||= run();
}
async function run(): Promise<CallbackResult> {
  const query = new URLSearchParams(location.search);
  const fragment = new URLSearchParams(location.hash.slice(1));
  const present = ['code','token_hash','error'].some(k=>query.has(k)) ||
    ['access_token','refresh_token','error'].some(k=>fragment.has(k));
  if (!present) return { password: false, error: '' };
  const kind = query.get('type') || fragment.get('type') || query.get('auth_action');
  try {
    if (!client || query.has('error') || fragment.has('error')) throw Error('callback');
    let error;
    if (query.get('code')) ({error} = await client.auth.exchangeCodeForSession(query.get('code')!));
    else if (query.get('token_hash') && ['invite','recovery'].includes(kind || ''))
      ({error} = await client.auth.verifyOtp({token_hash:query.get('token_hash')!,type:kind as 'invite'|'recovery'}));
    else if (fragment.get('access_token') && fragment.get('refresh_token'))
      ({error} = await client.auth.setSession({access_token:fragment.get('access_token')!,refresh_token:fragment.get('refresh_token')!}));
    else throw Error('callback');
    if (error) throw error;
    return {password: ['invite','recovery'].includes(kind || ''), error: ''};
  } catch {
    return {password:false,error:'Giriş bağlantısı geçersiz veya süresi dolmuş. Yeni bir bağlantı isteyin.'};
  } finally {
    history.replaceState(null,'',import.meta.env.BASE_URL + '#/giris');
  }
}
