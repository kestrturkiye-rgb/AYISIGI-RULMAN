import {randomBytes,createHash,randomUUID,createHmac} from 'node:crypto';
import project from '../apps/admin/src/project-config.json' with {type:'json'};
import {AUTH_ORIGIN,passwordProblem} from '../src/security/policy.mjs';
import {callOperations} from './_service.mjs';
import {authCookieNames,readCookies,sameValue,freshCsrf,setCookie,clearSessionCookies,storeSession,sessionFromCookie,storeVerifier,verifierFromCookie} from './_auth-cookies.mjs';
import {visitorMetadata} from './_gateway.mjs';
class AuthError extends Error{constructor(message,status=400){super(message);this.status=status;}}
function settings(){return {url:process.env.RT_SUPABASE_URL||project.url,key:process.env.RT_SUPABASE_PUBLIC_KEY||project.publicKey};}
function localMode(req){if(process.env.NODE_ENV==='production'||process.env.RT_AUTH_ALLOW_LOCALHOST!=='true')return false;return /^(127\.0\.0\.1|localhost)(:\d+)?$/.test(String(req.headers.host||''));}
async function readBody(req){let text;if(req.body!==undefined)text=typeof req.body==='string'?req.body:Buffer.isBuffer(req.body)?req.body.toString():JSON.stringify(req.body);else{let n=0,parts=[];for await(const chunk of req){n+=chunk.length;if(n>20000)throw new AuthError('İstek çok büyük.',413);parts.push(chunk);}text=Buffer.concat(parts).toString();}if(Buffer.byteLength(text)>20000)throw new AuthError('İstek çok büyük.',413);try{return JSON.parse(text||'{}');}catch{throw new AuthError('İstek geçersiz.');}}
async function provider(path,body,{method,token}={}){const {url,key}=settings();let r;try{r=await fetch(url+'/auth/v1/'+path,{method:method||(body?'POST':'GET'),headers:{apikey:key,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(12000)});}catch{throw new AuthError('Giriş hizmetine ulaşılamadı. Yeniden deneyin.',503);}const data=r.status===204?{}:await r.json().catch(()=>null);if(!r.ok){const code=data?.error_code||data?.code;if(r.status===429)throw new AuthError('Çok fazla deneme yapıldı. Bir süre sonra tekrar deneyin.',429);if(code==='email_not_confirmed')throw new AuthError('Giriş yapmadan önce e-posta adresinizi doğrulayın.',401);throw new AuthError('İşlem doğrulanamadı. Bilgilerinizi veya bağlantınızı kontrol edin.',r.status===401||r.status===400?401:503);}if(!data)throw new AuthError('Giriş hizmeti geçerli yanıt vermedi.',503);return data;}
function publicSession(session,user){return session?{access_token:session.access_token,refresh_token:'',token_type:'bearer',expires_at:session.expires_at,expires_in:Math.max(0,session.expires_at-Math.floor(Date.now()/1000)),user,recovery:session.recovery===true}:null;}
async function checkMembership(token){const {url,key}=settings();const r=await fetch(url+'/rest/v1/rpc/member_session_status',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(12000)});if(!r.ok)throw new AuthError('Üyelik doğrulanamadı. Yeniden deneyin.',r.status===401?401:503);const state=await r.json();if(state.erased||(state.disabled&&!state.staff))throw new AuthError('Bu sitedeki üyeliğiniz etkin değil.',401);}
async function registerOwned(token){const r=await callOperations({action:'register_member',memberToken:token});if(r.status!==200)throw new AuthError('Üyelik kaydı tamamlanamadı. Yeniden deneyin.',503);}
function genuineSignup(data,started){const user=data.user;return user&&Array.isArray(user.identities)&&user.identities.length>0&&Date.parse(user.created_at)>=started-5000?user.id:null;}
async function verifiedSession(req,res,dev){let s=sessionFromCookie(req,dev);if(!s)return null;if(s.expires_at<Math.floor(Date.now()/1000)+60){const next=await provider('token?grant_type=refresh_token',{refresh_token:s.refresh_token});s=storeSession(res,next,{dev,issuedAt:s.issuedAt,recovery:s.recovery});}const user=await provider('user',undefined,{token:s.access_token});await checkMembership(s.access_token);return {s,user};}
function requireEmail(value){if(typeof value!=='string'||value.length>254||!/^\S+@\S+\.\S+$/.test(value))throw new AuthError('Geçerli bir e-posta adresi girin.');return value.trim().toLowerCase();}
function requirePassword(value,creating=false){if(typeof value!=='string'||!value.length||value.length>128)throw new AuthError('Parolanızı kontrol edin.');if(creating){const error=passwordProblem(value);if(error)throw new AuthError(error);}return value;}
function csrf(req,res,dev,force=false){const names=authCookieNames(dev),cookies=readCookies(req.headers.cookie);let token=cookies[names.csrf];if(force||!/^[a-f0-9]{64}$/.test(token||'')){token=freshCsrf();setCookie(res,names.csrf,token,{dev,httpOnly:false,sameSite:'Strict'});}return token;}
async function guard(req,action,email=''){
 const key=process.env.RT_GATEWAY_HMAC_SECRET;if(!key)throw Error('gateway_configuration');const metadata=visitorMetadata(req.headers,key);const account=email?createHmac('sha256',key).update('auth-account:'+email).digest('hex'):null;
 const result=await callOperations({action:'auth_guard',scope:action,ipHash:metadata.ip_hash,accountHash:account});if(result.status!==200||result.data.allowed!==true)throw new AuthError('Çok fazla deneme yapıldı. Bir süre sonra tekrar deneyin.',result.status===503?503:429);
}
function callbackTarget(kind,admin){return AUTH_ORIGIN+(admin?'/admin/':'/')+'?auth_action='+(kind==='recovery'?(admin?'recovery':'member_recovery'):'member_signup');}
export function makeAuthHandler(){return async(req,res)=>{
 const dev=localMode(req),origin=dev?'http://'+req.headers.host:AUTH_ORIGIN;const names=authCookieNames(dev);const id=randomUUID();
 for(const [key,value]of Object.entries({'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, private','Vary':'Cookie','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}))res.setHeader(key,value);
 const reply=(value,status=200)=>{res.statusCode=status;res.end(JSON.stringify(value));};
 try{
  const action=String(req.query?.action||new URL(req.url,origin).pathname.split('/').filter(Boolean).at(-1)||'');
  if(!['session','login','logout','signup','recover','callback','password','delete-account'].includes(action))return reply({error:'İşlem bulunamadı.'},404);
  if(action==='session'){
   if(req.method!=='GET')return reply({error:'Yalnızca GET kullanılabilir.'},405);
   if(req.headers.origin&&req.headers.origin!==origin)return reply({error:'Kaynak doğrulanamadı.'},403);
   csrf(req,res,dev);let verified;try{verified=await verifiedSession(req,res,dev);}catch(error){if(error.status===503)throw error;clearSessionCookies(res,dev);csrf(req,res,dev,true);}
   return reply({session:verified?publicSession(verified.s,verified.user):null});
  }
  if(req.method!=='POST')return reply({error:'Yalnızca POST kullanılabilir.'},405);
  if(req.headers.origin!==origin||!['same-origin','none',undefined].includes(req.headers['sec-fetch-site']))return reply({error:'Kaynak doğrulanamadı.'},403);
  const expected=readCookies(req.headers.cookie)[names.csrf];if(!/^[a-f0-9]{64}$/.test(expected||'')||!sameValue(expected,req.headers['x-rt-csrf']))return reply({error:'Güvenlik doğrulaması yenilenmeli. Sayfayı yenileyin.'},403);
  if(!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json'))return reply({error:'JSON isteği gerekli.'},415);
  const body=await readBody(req);
  if(action==='login'){
   const email=requireEmail(body.email),password=requirePassword(body.password);await guard(req,'login',email);const data=await provider('token?grant_type=password',{email,password});const user=await provider('user',undefined,{token:data.access_token});await checkMembership(data.access_token);const s=storeSession(res,data,{dev});setCookie(res,names.csrf,freshCsrf(),{dev,httpOnly:false,sameSite:'Strict'});return reply({session:publicSession(s,user)});
  }
  if(action==='logout'){
   const s=sessionFromCookie(req,dev);clearSessionCookies(res,dev);if(s)await provider('logout?scope=local',{}, {token:s.access_token}).catch(()=>{});return reply({signedOut:true});
  }
  if(action==='signup'||action==='recover'){
   const email=requireEmail(body.email);await guard(req,action,email);if(action==='signup')requirePassword(body.password,true);
   const verifier=randomBytes(32).toString('base64url'),challenge=createHash('sha256').update(verifier).digest('base64url');const pkce={verifier,intent:action==='recover'?'recovery':'signup'};
   const started=Date.now();const data=await provider((action==='signup'?'signup':'recover')+'?redirect_to='+encodeURIComponent(callbackTarget(pkce.intent,body.admin===true)),{email,...(action==='signup'?{password:body.password,data:{full_name:String(body.name||'').trim().slice(0,160)}}:{}),code_challenge:challenge,code_challenge_method:'s256'});
   if(action==='signup')pkce.ownedUserId=genuineSignup(data,started);storeVerifier(res,pkce,dev);if(data.access_token&&data.refresh_token){const user=await provider('user',undefined,{token:data.access_token});if(pkce.ownedUserId===user.id)await registerOwned(data.access_token);await checkMembership(data.access_token);return reply({session:publicSession(storeSession(res,data,{dev}),user)});}return reply({session:null,verificationRequired:true});
  }
  if(action==='callback'){
   await guard(req,'callback');const pkce=verifierFromCookie(req,dev);let data,recovery=false;
   if(typeof body.code==='string'&&body.code.length<4096){if(!pkce)throw new AuthError('Bu bağlantıyı istediğiniz tarayıcıda açın veya yeni bağlantı isteyin.');data=await provider('token?grant_type=pkce',{auth_code:body.code,code_verifier:pkce.verifier});recovery=pkce.intent==='recovery';}
   else if(typeof body.token_hash==='string'&&body.token_hash.length<4096&&['invite','recovery'].includes(body.type)){data=await provider('verify',{token_hash:body.token_hash,type:body.type});recovery=['invite','recovery'].includes(body.type);}
   else if(typeof body.access_token==='string'&&typeof body.refresh_token==='string'&&body.access_token.length<6000&&body.refresh_token.length<1000){data={access_token:body.access_token,refresh_token:body.refresh_token};let payload;try{payload=JSON.parse(Buffer.from(body.access_token.split('.')[1],'base64url'));}catch{throw new AuthError('Giriş bağlantısı geçersiz.');}if(!Number.isFinite(payload.exp)||payload.exp<=Date.now()/1000)throw new AuthError('Giriş bağlantısının süresi dolmuş.');data.expires_at=payload.exp;recovery=payload.amr?.some(x=>['recovery','invite'].includes(x.method))===true;}
   else throw new AuthError('Giriş bağlantısı geçersiz veya süresi dolmuş.');
   const user=await provider('user',undefined,{token:data.access_token});if(body.code&&pkce?.intent==='signup'&&pkce.ownedUserId===user.id)await registerOwned(data.access_token);await checkMembership(data.access_token);setCookie(res,names.pkce,'',{dev,maxAge:0});return reply({session:publicSession(storeSession(res,data,{dev,recovery}),user)});
  }
  const verified=await verifiedSession(req,res,dev);if(!verified)throw new AuthError('Yeniden giriş yapın.',401);await guard(req,action,verified.user.email||'');
  if(action==='password'){
   requirePassword(body.password,true);let session=verified.s;
   if(!verified.s.recovery||Date.now()-verified.s.issuedAt>15*60*1000){const reauth=await provider('token?grant_type=password',{email:verified.user.email,password:requirePassword(body.current_password)});const user=await provider('user',undefined,{token:reauth.access_token});if(user.id!==verified.user.id)throw new AuthError('Hesap doğrulanamadı.',403);session=reauth;}
   await provider('user',{password:body.password},{method:'PUT',token:session.access_token});const s=storeSession(res,session,{dev,issuedAt:verified.s.issuedAt,recovery:false});return reply({session:publicSession(s,verified.user),updated:true});
  }
  if(action==='delete-account'){
   if(body.confirmation!=='HESABIMI SİL')throw new AuthError('Onay alanına HESABIMI SİL yazın.');const data=await provider('token?grant_type=password',{email:verified.user.email,password:requirePassword(body.current_password)});const user=await provider('user',undefined,{token:data.access_token});if(user.id!==verified.user.id)throw new AuthError('Hesap doğrulanamadı.',403);
   const result=await callOperations({action:'delete_member',memberToken:data.access_token});if(![200,202].includes(result.status))throw new AuthError('Hesap silinemedi. Daha sonra tekrar deneyin.',result.status);clearSessionCookies(res,dev);return reply({deleted:result.status===200,pending:result.status===202,sharedIdentityRetained:result.data.sharedIdentityRetained===true},result.status);
  }
 }catch(error){if(error.status===401)clearSessionCookies(res,dev);if(!(error instanceof AuthError))console.error(JSON.stringify({event:'rt.auth_failed',requestId:id,code:'unexpected'}));return reply({error:error instanceof AuthError?error.message:'İşlem tamamlanamadı. Daha sonra tekrar deneyin.',requestId:id},error instanceof AuthError?error.status:503);}
};}
