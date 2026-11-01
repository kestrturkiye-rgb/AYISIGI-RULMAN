import express from 'express';
import rateLimit from 'express-rate-limit';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { openStore } from './store.js';
import { validPasswordHash, verifyPassword, tokenHash } from './auth.js';

const statuses=['new','in_progress','quoted','closed'];
const fail=(res,status,error)=>res.status(status).json({error});
function validate(body,products) {
 const text=(value,max,required=false)=>{if(typeof value!=='string'||value.length>max||(required&&!value.trim())||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))throw Error('Lütfen form alanlarını kontrol edin.');return value.trim()};
 if(!body||!Array.isArray(body.items)||body.items.length>500||typeof body.requestKey!=='string'||!/^[a-f0-9-]{36}$/i.test(body.requestKey))throw Error('Teklif listesi geçersiz. En fazla 500 ürün çeşidi gönderebilirsiniz.');
 const details={customer:text(body.details?.customer,120,true),email:text(body.details?.email,160,true),phone:text(body.details?.phone||'',40),note:text(body.details?.note||'',1200)};
 if(!/^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/.test(details.email)||/[\r\n]/.test(details.customer+details.phone))throw Error('Geçerli bir e-posta adresi ve iletişim bilgileri girin.');
 if(body.website)throw Error('Talep doğrulanamadı.');
 const ids=new Set();const lines=body.items.map(item=>{if(!item||typeof item!=='object')throw Error('Ürün bilgisi geçersiz.');const p=products.get(item.id);if(!p||ids.has(item.id)||!Number.isSafeInteger(item.qty)||item.qty<1||item.qty>1000000)throw Error('Ürün veya adet bilgisi geçersiz.');ids.add(item.id);return {id:p.id,brand:p.brand,code:p.code,name:p.name,qty:item.qty}});
 if(!lines.length&&!details.note)throw Error('Ürün ekleyin veya talebinizi yazın.');
 return {details,lines};
}

export function createApplication({dbPath,products,adminHash,origin,mailer,staticDir,secureCookies=true,trustProxy=false}) {
 if(!validPasswordHash(adminHash))throw Error('ADMIN_PASSWORD_HASH must be configured with npm run admin:password.');
 const allowedOrigin=new URL(origin).origin;
 const app=express();app.disable('x-powered-by');app.set('trust proxy',trustProxy);
 const store=openStore(dbPath);let processing=null;
 app.use((req,res,next)=>{res.set({'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','X-Frame-Options':'DENY'});if(req.path.startsWith('/api/'))res.set('Cache-Control','no-store');next()});
 app.use('/api',express.json({limit:'128kb'}));
 app.use('/api',(req,res,next)=>{
  if(['POST','PATCH','DELETE'].includes(req.method)&&req.get('origin')!==allowedOrigin)return fail(res,403,'İstek kaynağı doğrulanamadı. Sayfayı yenileyin.');
  if(['POST','PATCH'].includes(req.method)&&!req.is('application/json'))return fail(res,415,'JSON isteği gerekiyor.');next();
 });
 const limiter=(limit,windowMs)=>rateLimit({windowMs,limit,standardHeaders:'draft-8',legacyHeaders:false,handler:(_req,res)=>fail(res,429,'Çok fazla deneme yaptınız. Lütfen daha sonra tekrar deneyin.')});
 app.get('/api/status',(_req,res)=>res.json({quotesEnabled:Boolean(mailer)}));
 app.post('/api/quotes',limiter(10,3600000),(req,res)=>{
  if(!mailer)return fail(res,503,'Teklif gönderimi henüz açılmadı. WhatsApp veya telefonla bize ulaşabilirsiniz.');
  let payload;try{payload=validate(req.body,products)}catch(error){return fail(res,400,error.message)}
  const fingerprint=createHash('sha256').update(JSON.stringify(payload)).digest('hex');const old=store.existing(req.body.requestKey);
  if(old){if(old.fingerprint!==fingerprint)return fail(res,409,'Bu gönderim anahtarı başka bir talebe ait. Sayfayı yenileyin.');return res.json({id:old.id,emailStatus:old.email_status})}
  const id=`RT-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${randomUUID()}`;
  store.insert(id,req.body.requestKey,fingerprint,payload);res.status(201).json({id,emailStatus:'queued'});
 });
 const cookieName=secureCookies?'__Host-rt-session':'rt-session';
 const cookieToken=req=>{const value=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1)||'';return /^[a-f0-9]{64}$/.test(value)?tokenHash(value):''};
 const cookieOptions={httpOnly:true,secure:secureCookies,sameSite:'strict',path:'/'};
 const auth=(req,res,next)=>store.authenticated(cookieToken(req))?next():fail(res,401,'Yönetici girişi gerekiyor.');
 app.post('/api/admin/login',limiter(8,900000),(req,res)=>{
  if(!verifyPassword(req.body?.password,adminHash))return fail(res,401,'Şifre yanlış.');
  const token=randomBytes(32).toString('hex');store.session(tokenHash(token),Date.now()+28800000);res.cookie(cookieName,token,{...cookieOptions,maxAge:28800000});res.json({authenticated:true});
 });
 app.get('/api/admin/session',auth,(_req,res)=>res.json({authenticated:true}));
 app.post('/api/admin/logout',auth,(req,res)=>{store.logout(cookieToken(req));res.clearCookie(cookieName,cookieOptions);res.json({ok:true})});
 app.get('/api/admin/quotes',auth,(req,res)=>{
  const status=req.query.status||'',search=req.query.q||'',page=Number(req.query.page||1);
  if(typeof status!=='string'||(status&&!statuses.includes(status))||typeof search!=='string'||search.length>120||!Number.isSafeInteger(page)||page<1)return fail(res,400,'Filtre geçersiz.');
  res.json({...store.list(status,search,page),page});
 });
 app.patch('/api/admin/quotes/:id',auth,(req,res)=>{
  if(!statuses.includes(req.body?.status))return fail(res,400,'Durum geçersiz.');if(!store.get(req.params.id))return fail(res,404,'Talep bulunamadı.');
  store.setStatus(req.params.id,req.body.status);res.json(store.get(req.params.id));
 });
 app.post('/api/admin/quotes/:id/retry-email',auth,(req,res)=>{const quote=store.get(req.params.id);if(!quote)return fail(res,404,'Talep bulunamadı.');if(!mailer)return fail(res,503,'SMTP bağlantısı yapılandırılmadı.');if(quote.emailStatus!=='failed')return fail(res,409,'Yalnızca başarısız bildirimler yeniden denenebilir.');store.retry(req.params.id);res.json({ok:true})});
 app.use('/api',(_req,res)=>fail(res,404,'API adresi bulunamadı.'));
 if(staticDir)app.use(express.static(staticDir,{dotfiles:'deny',index:'index.html'}));
 app.use((error,_req,res,_next)=>{if(error.type==='entity.too.large')return fail(res,413,'Talep çok büyük. En fazla 500 ürün çeşidi gönderebilirsiniz.');if(error instanceof SyntaxError)return fail(res,400,'İstek biçimi geçersiz.');console.error('Request failed:',error.code||error.name);fail(res,500,'İşlem tamamlanamadı. Lütfen tekrar deneyin.')});
 function processOutbox(){
  if(processing)return processing;
  if(!mailer)return Promise.resolve();
  processing=Promise.resolve().then(async()=>{for(const id of store.due()){try{await mailer(store.get(id));store.emailResult(id,true)}catch{store.emailResult(id,false);console.error('Quote email pending:',id)}}}).finally(()=>{processing=null});
  return processing;
 }
 return {app,store,processOutbox};
}
