import {languageFromLocation} from '../i18n/core.js';
import {createClient} from '@supabase/supabase-js';
import {canonicalAuthTarget} from './policy.mjs';
const headerName='x-rt-csrf';
const message='İşlem tamamlanamadı. Bağlantınızı kontrol edip tekrar deneyin.';
export function createCookieAuth({fetcher=globalThis.fetch,location=globalThis.location,document=globalThis.document,storage,broadcast=true}={}){
 let session=null,ready=false,pending=null,timer=null;const listeners=new Set();
 const publicOnly=location?.hostname==='kestrturkiye-rgb.github.io';
 const dev=['localhost','127.0.0.1'].includes(location?.hostname);const csrfName=dev?'rt-csrf-dev':'__Host-rt-csrf';
 // Previous refresh tokens must not survive the migration to HttpOnly cookies.
 try{storage??=globalThis.localStorage;for(const key of ['rt-admin-auth-v1','rt-supabase-auth']){storage?.removeItem(key);storage?.removeItem(key+'-code-verifier');storage?.removeItem(key+'-user');}}catch{}
 const channel=broadcast&&typeof BroadcastChannel!=='undefined'?new BroadcastChannel('rt-session-change-v1'):null;
 function csrf(){return String(document?.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(csrfName+'='))?.slice(csrfName.length+1)||'';}
 function commit(next,event,notify=false){const changed=!ready||session?.access_token!==next?.access_token||session?.user?.id!==next?.user?.id||session?.recovery!==next?.recovery;session=next;ready=true;if(timer)clearTimeout(timer);if(session?.expires_at)timer=setTimeout(()=>{void load(true).catch(()=>{});},Math.max(1000,(session.expires_at*1000-Date.now()-60000)));if(changed||notify)for(const fn of listeners)queueMicrotask(()=>fn(event,next));if(notify)channel?.postMessage({changed:true});}
 async function request(action,body){if(publicOnly)throw Error('Üyelik için güvenli giriş adresini açın.');const isGet=action==='session';if(!isGet&&!csrf())await load(true);let r;try{r=await fetcher('/api/auth/'+action,{method:isGet?'GET':'POST',credentials:'same-origin',headers:{Accept:'application/json',...(!isGet?{'Content-Type':'application/json',[headerName]:csrf()}:{})},body:isGet?undefined:JSON.stringify(body||{}),signal:AbortSignal.timeout(25000)});}catch{throw Error(message);}const value=await r.json().catch(()=>({error:message}));if(!r.ok)throw Object.assign(Error(value.error||message),{status:r.status,code:r.status===429?'rate_limit':undefined});return value;}
 async function load(force=false){if(publicOnly){ready=true;return null;}if(!force&&ready&&(!session||session.expires_at*1000>Date.now()+60000))return session;if(pending)return pending;pending=request('session').then(value=>{const previous=session;commit(value.session,value.session?.recovery?'PASSWORD_RECOVERY':value.session?(previous?'TOKEN_REFRESHED':'SIGNED_IN'):'SIGNED_OUT');return session;}).finally(()=>{pending=null;});return pending;}
 async function result(fn){try{return await fn();}catch(error){return {data:{session:null,user:null},error};}}
 async function receive(action,body){const value=await request(action,body);if(Object.hasOwn(value,'session'))commit(value.session,value.session?.recovery?'PASSWORD_RECOVERY':value.session?'SIGNED_IN':'SIGNED_OUT',true);return {data:{session:value.session||null,user:value.session?.user||null,...value},error:null};}
 if(channel)channel.onmessage=()=>{ready=false;void load(true).catch(()=>{});};
 return {
  getSession:()=>result(async()=>({data:{session:await load()},error:null})),
  getUser:()=>result(async()=>({data:{user:(await load(true))?.user||null},error:null})),
  getAccessToken:async()=>(await load())?.access_token||null,
  onAuthStateChange(fn){listeners.add(fn);queueMicrotask(()=>{void load().then(s=>fn('INITIAL_SESSION',s)).catch(()=>fn('INITIAL_SESSION',null));});return {data:{subscription:{unsubscribe(){listeners.delete(fn);}}}};},
  signInWithPassword:credentials=>result(()=>receive('login',credentials)),
  signUp:({email,password,options})=>result(()=>receive('signup',{email,password,name:options?.data?.full_name||'',lang:languageFromLocation(location)})),
  resetPasswordForEmail:(email,options)=>result(()=>receive('recover',{email,lang:languageFromLocation(location),admin:String(options?.redirectTo||'').includes('/admin/')})),
  updateUser:attributes=>result(()=>receive('password',{password:attributes.password,current_password:attributes.current_password})),
  exchangeCodeForSession:code=>result(()=>receive('callback',{code})),
  verifyOtp:values=>result(()=>receive('callback',values)),
  setSession:values=>result(()=>receive('callback',values)),
  refreshSession:()=>result(async()=>({data:{session:await load(true)},error:null})),
  async signOut(){const r=await result(async()=>{await request('logout');commit(null,'SIGNED_OUT',true);return {error:null};});return {error:r.error||null};},
  deleteAccount:values=>result(async()=>{const r=await request('delete-account',values);commit(null,'SIGNED_OUT',true);return {data:r,error:null};}),
  dispose(){clearTimeout(timer);listeners.clear();channel?.close();},
 };
}
export function createCookieClient(url,key,options={}){
 const auth=createCookieAuth();const sdk=createClient(url,key,{...options,auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},accessToken:()=>auth.getAccessToken()});
 // The SDK consumes accessToken() in memory. Auth operations use same-origin, HttpOnly-cookie endpoints.
 return new Proxy(sdk,{get(target,name){if(name==='auth')return auth;const value=Reflect.get(target,name,target);return typeof value==='function'?value.bind(target):value;}});
}
export function redirectToAuthHost(options={}){const target=globalThis.location&&canonicalAuthTarget(globalThis.location,options);if(!target)return false;globalThis.location.replace(target);return true;}
