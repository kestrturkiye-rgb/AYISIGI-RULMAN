import {createClient} from 'npm:@supabase/supabase-js@2.118.0';
const project=Deno.env.get('SUPABASE_URL')!,service=createClient(project,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const allowed=new Set(['https://rulman-teklif-admin.vercel.app','https://kestrturkiye-rgb.github.io','http://127.0.0.1:4180','http://127.0.0.1:4186','http://localhost:4180']);
const encoder=new TextEncoder();
async function digest(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value)))).map(b=>b.toString(16).padStart(2,'0')).join('');}
async function verifiedGateway(request:Request,text:string){const secret=Deno.env.get('RT_GATEWAY_HMAC_SECRET'),time=request.headers.get('x-rt-time')||'',sig=request.headers.get('x-rt-signature')||'';if(!secret||!/^\d{13}$/.test(time)||Math.abs(Date.now()-Number(time))>90000||!/^\w{64}$/.test(sig))return false;const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);return crypto.subtle.verify('HMAC',key,new Uint8Array(sig.match(/../g)!.map(p=>parseInt(p,16))),encoder.encode(time+'.'+text));}
async function body(request:Request){const reader=request.body?.getReader();if(!reader)throw Error('İstek gövdesi gerekli.');let size=0,parts:Uint8Array[]=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>140000){await reader.cancel();throw Error('İstek çok büyük.');}parts.push(value);}const bytes=new Uint8Array(size);let n=0;for(const p of parts){bytes.set(p,n);n+=p.length;}return new TextDecoder().decode(bytes);}
function checked<T>(value:{data:T,error:any}):T{if(value.error)throw Object.assign(Error(value.error.message||'İşlem tamamlanamadı.'),{code:value.error.code});return value.data;}
async function notifyQuote(id:string){
 const key=Deno.env.get('RT_RESEND_API_KEY'),from=Deno.env.get('RT_NOTIFY_FROM');if(!key||!from)return;
 // Claims each row with a lease before sending, so parallel submissions cannot duplicate notification work.
 const leased=checked(await service.rpc('lease_quote_notification',{p_quote:id}));if(!leased)return;
 try{const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json','Idempotency-Key':'rt-quote-'+id},body:JSON.stringify({from,to:[leased.recipient],subject:'Yeni teklif talebi · Rulman Teklif',text:'Yeni bir teklif talebi alındı. Yönetim paneli: https://rulman-teklif-admin.vercel.app/admin/#/teklifler/'+id}),signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('Email provider rejected');const result=await response.json();checked(await service.rpc('finish_quote_notification',{p_quote:id,p_success:true,p_message:result.id||null}));}catch{await service.rpc('finish_quote_notification',{p_quote:id,p_success:false,p_message:null});}
}
Deno.serve(async request=>{
 const origin=request.headers.get('origin'),headers={'Access-Control-Allow-Origin':origin&&allowed.has(origin)?origin:'https://rulman-teklif-admin.vercel.app','Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Vary':'Origin','Cache-Control':'no-store'};
 const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...headers,'Content-Type':'application/json'}});
 if(origin&&!allowed.has(origin))return reply({error:'Bu kaynağa izin verilmedi.'},403);if(request.method==='OPTIONS')return new Response(null,{status:204,headers});if(request.method!=='POST')return reply({error:'Yalnızca POST kullanılabilir.'},405);
 try{
  const text=await body(request);const data=JSON.parse(text);
  if(data.action==='collect'||data.action==='quote'||data.action==='maintenance'){
   if(!await verifiedGateway(request,text))return reply({error:'Geçersiz sunucu imzası.'},403);
   if(data.action==='maintenance'){const result=checked(await service.rpc('prune_site_events'));const ids=checked(await service.rpc('pending_quote_notifications'));for(const id of ids)await notifyQuote(id);return reply(result);}
   if(data.action==='collect'){const accepted=checked(await service.rpc('ingest_site_event',{p_data:data.event}));return reply({accepted},202);}
   let member:string|null=null;if(data.memberToken){const {data:{user},error}=await service.auth.getUser(data.memberToken);if(error||!user)return reply({error:'Üye oturumu geçersiz; yeniden giriş yapın.'},401);member=user.id;}
   const result=checked(await service.rpc('submit_site_quote',{p_data:data.quote,p_ip_hash:data.ipHash,p_fingerprint:await digest(JSON.stringify({items:data.quote.items,details:data.quote.details})),p_member_id:member}));
   if(!result.duplicate){const task=notifyQuote(result.id).catch(()=>{});const runtime=(globalThis as unknown as {EdgeRuntime?:{waitUntil:(p:Promise<unknown>)=>void}}).EdgeRuntime;if(runtime)runtime.waitUntil(task);else await task;}return reply(result,201);
  }
  const token=(request.headers.get('authorization')||'').replace(/^Bearer /,'');if(!token)return reply({error:'Giriş gerekli.'},401);
  const {data:{user},error}=await service.auth.getUser(token);if(error||!user)return reply({error:'Oturum doğrulanamadı.'},401);
  const caller=createClient(project,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false}});const access=await caller.rpc('get_staff_access');const role=access.data?.[0]?.role;if(access.error||!['admin','editor','sales'].includes(role))return reply({error:'Yönetim yetkisi gerekli.'},403);
  if(data.action==='delete_media'){
   if(!['admin','editor'].includes(role))return reply({error:'Medya yönetim yetkisi yok.'},403);const asset=checked(await caller.rpc('admin_media_delete',{p_id:data.id,p_version:data.version}));
   if(!asset.external_url){const paths=[asset.object_path];if(asset.object_path.endsWith('/display.webp')||asset.object_path.endsWith('/document.pdf'))paths.push(asset.object_path.replace(/\/(display.webp|document.pdf)$/,'/original'));for(const bucket of ['media-originals','media-published'])checked(await service.storage.from(bucket).remove(paths));}return reply({deleted:true});
  }
  if(role!=='admin')return reply({error:'Yalnızca admin bu işlemi yapabilir.'},403);
  if(data.action==='create_staff'||data.action==='create_member'){
   if(typeof data.email!=='string'||!/^\S+@\S+\.\S+$/.test(data.email)||data.email.length>254||typeof data.password!=='string'||data.password.length<12||data.password.length>128||typeof data.full_name!=='string'||!data.full_name.trim()||data.full_name.length>160||(data.action==='create_staff'&&!['admin','editor','sales'].includes(data.role)))return reply({error:'E-posta, ad, rol ve en az 12 karakterli parolayı kontrol edin.'},400);
   const created=await service.auth.admin.createUser({email:data.email.trim().toLowerCase(),password:data.password,email_confirm:true,user_metadata:{full_name:data.full_name.trim()}});data.password='';if(created.error)return reply({error:created.error.message.includes('already')?'Bu e-posta zaten kayıtlı. Var olan bir hesabın üzerine yazılmadı.':'Hesap oluşturulamadı; e-posta adresini kontrol edin.'},409);
   const id=created.data.user.id;const assigned=data.action==='create_staff'?await caller.rpc('admin_set_staff',{p_user_id:id,p_role:data.role,p_active:true}):await caller.rpc('admin_member_profile',{p_user_id:id,p_data:{name:data.full_name,company:'',phone:'',active:true}});if(assigned.error){await service.auth.admin.deleteUser(id);throw assigned.error;}return reply({user_id:id,created:true},201);
  }
  if(data.action==='notification_settings'){
   const configured=!!Deno.env.get('RT_RESEND_API_KEY')&&!!Deno.env.get('RT_NOTIFY_FROM');if(data.value?.enabled&&!configured)return reply({error:'Önce sunucuda RT_RESEND_API_KEY ve RT_NOTIFY_FROM tanımlanmalıdır.'},400);
   const settings=checked(await caller.rpc('admin_notification_settings',{p_value:data.value||null}));return reply({settings,providerConfigured:configured});
  }
  if(data.action==='retry_notifications'){const ids=checked(await service.rpc('pending_quote_notifications'));for(const id of ids)await notifyQuote(id);return reply({processed:ids.length});}
  return reply({error:'İşlem bulunamadı.'},404);
 }catch(e){const error=e as {code?:string,message?:string};const status=error.code==='42501'?403:error.code==='PT409'?409:error.code==='PT429'?429:400;return reply({error:['23505','23514','22P02'].includes(error.code||'')?'Girdiğiniz alanları kontrol edin.':error.message||'İşlem tamamlanamadı.'},status);}
});
