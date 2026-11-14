import {randomBytes,createCipheriv,createDecipheriv,timingSafeEqual} from 'node:crypto';
const SESSION_TTL=12*3600,PKCE_TTL=15*60;
export function authCookieNames(dev=false){return {session:dev?'rt-session-dev':'__Host-rt-session',csrf:dev?'rt-csrf-dev':'__Host-rt-csrf',pkce:dev?'rt-pkce-dev':'__Host-rt-pkce'};}
export function readCookies(header=''){const result={};for(const entry of String(header).split(';')){const n=entry.indexOf('=');if(n>0){const key=entry.slice(0,n).trim();if(!Object.hasOwn(result,key))result[key]=entry.slice(n+1).trim();}}return result;}
function key(){const raw=process.env.RT_AUTH_COOKIE_KEY||'';if(!/^[a-f0-9]{64}$/i.test(raw))throw Error('cookie_key_configuration');return Buffer.from(raw,'hex');}
export function seal(value,purpose){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(),iv);cipher.setAAD(Buffer.from('rt-auth-v1:'+purpose));const bytes=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);return 'v1.'+Buffer.concat([iv,cipher.getAuthTag(),bytes]).toString('base64url');}
export function unseal(value,purpose){try{if(!value?.startsWith('v1.')||value.length>3900)return null;const bytes=Buffer.from(value.slice(3),'base64url');if(bytes.length<29)return null;const decipher=createDecipheriv('aes-256-gcm',key(),bytes.subarray(0,12));decipher.setAAD(Buffer.from('rt-auth-v1:'+purpose));decipher.setAuthTag(bytes.subarray(12,28));return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)),decipher.final()]).toString('utf8'));}catch{return null;}}
export function sameValue(a,b){if(typeof a!=='string'||typeof b!=='string'||Buffer.byteLength(a)!==Buffer.byteLength(b)||a.length>1000)return false;return timingSafeEqual(Buffer.from(a),Buffer.from(b));}
export function freshCsrf(){return randomBytes(32).toString('hex');}
export function setCookie(res,name,value,{dev=false,httpOnly=true,maxAge=SESSION_TTL,sameSite='Lax'}={}){
 if(value.length>3850)throw Error('cookie_too_large');
 const line=`${name}=${value}; Path=/; Max-Age=${maxAge}; SameSite=${sameSite}`+(dev?'':'; Secure')+(httpOnly?'; HttpOnly':'');
 const old=res.getHeader?.('Set-Cookie');res.setHeader('Set-Cookie',[...(Array.isArray(old)?old:old?[String(old)]:[]),line]);
}
export function clearSessionCookies(res,dev=false){for(const name of Object.values(authCookieNames(dev)))setCookie(res,name,'',{dev,maxAge:0});}
export function storeSession(res,session,{dev=false,issuedAt=Date.now(),recovery=false}={}){
 const value={access_token:session.access_token,refresh_token:session.refresh_token,expires_at:session.expires_at||Math.floor(Date.now()/1000)+(session.expires_in||3600),issuedAt,recovery};
 setCookie(res,authCookieNames(dev).session,seal(value,'session'),{dev,maxAge:Math.max(0,Math.floor(SESSION_TTL-(Date.now()-issuedAt)/1000))});return value;
}
export function sessionFromCookie(req,dev=false){const s=unseal(readCookies(req.headers.cookie)[authCookieNames(dev).session],'session');return s&&typeof s.access_token==='string'&&typeof s.refresh_token==='string'&&Number.isFinite(s.expires_at)&&Number.isFinite(s.issuedAt)&&Date.now()-s.issuedAt<SESSION_TTL*1000&&s.issuedAt<=Date.now()+10000?s:null;}
export function storeVerifier(res,value,dev=false){setCookie(res,authCookieNames(dev).pkce,seal({...value,createdAt:Date.now()},'pkce'),{dev,maxAge:PKCE_TTL});}
export function verifierFromCookie(req,dev=false){const v=unseal(readCookies(req.headers.cookie)[authCookieNames(dev).pkce],'pkce');return v&&typeof v.verifier==='string'&&Number.isFinite(v.createdAt)&&v.createdAt<=Date.now()+10000&&Date.now()-v.createdAt<PKCE_TTL*1000?v:null;}
