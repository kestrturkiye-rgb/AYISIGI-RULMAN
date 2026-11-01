import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { createApplication } from '../server/app.js';
import { hashPassword,verifyPassword } from '../server/auth.js';
const password='test-only-admin-password-12345';
const products=new Map([['known-product',{id:'known-product',brand:'SKF',code:'6204-2RSH',name:'Bilyalı rulman'}]]);
async function fixture(t,{mailer=async()=>{},path}={}){
 const directory=path||mkdtempSync(join(tmpdir(),'rt-server-'));let origin;
 const runtime=createApplication({dbPath:join(directory,'quotes.sqlite'),products,adminHash:hashPassword(password),origin:'http://localhost',mailer,secureCookies:false});
 const server=runtime.app.listen(0,'127.0.0.1');await once(server,'listening');origin=`http://127.0.0.1:${server.address().port}`;
 t.after(async()=>{await new Promise(resolve=>server.close(resolve));runtime.store.close();if(!path)rmSync(directory,{recursive:true,force:true})});
 const request=async(path,method='GET',body,cookie,requestOrigin='http://localhost')=>{const response=await fetch(origin+'/api'+path,{method,headers:{'Content-Type':'application/json',Origin:requestOrigin,...(cookie?{Cookie:cookie}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:response.status,body:await response.json(),cookie:response.headers.get('set-cookie')}};
 const login=async()=>{const result=await request('/admin/login','POST',{password});assert.equal(result.status,200);return result.cookie.split(';')[0]};
 return {...runtime,request,login,directory};
}
const payload=()=>({requestKey:randomUUID(),items:[{id:'known-product',qty:3,code:'FORGED CODE'}],details:{customer:'Örnek Firma',email:'alici@example.com',phone:'0555 111 22 33',note:'Ölçü ve teslimat teyidi'}});

test('server refuses to start without an admin password hash',()=>{assert.throws(()=>createApplication({}),/ADMIN_PASSWORD_HASH/)});
test('password verification rejects incorrect and malformed values',()=>{const hash=hashPassword(password);assert.ok(verifyPassword(password,hash));assert.equal(verifyPassword('wrong',hash),false);assert.equal(verifyPassword({},hash),false)});
test('quote is durable, server resolves product data, and repeated submissions are idempotent',async t=>{
 const f=await fixture(t);const body=payload();const result=await f.request('/quotes','POST',body);assert.equal(result.status,201);assert.equal(result.body.emailStatus,'queued');
 const again=await f.request('/quotes','POST',body);assert.equal(again.body.id,result.body.id);
 assert.equal((await f.request('/quotes','POST',{...body,items:[{id:'known-product',qty:4}]})).status,409);
 const admin=await f.login();const list=await f.request('/admin/quotes','GET',undefined,admin);assert.equal(list.body.total,1);assert.equal(list.body.quotes[0].lines[0].code,'6204-2RSH');assert.equal(list.body.quotes[0].lines[0].qty,3);
 assert.equal((await f.request(`/admin/quotes/${result.body.id}`,'PATCH',{status:'quoted'},admin)).body.status,'quoted');
 assert.equal((await f.request('/admin/quotes?status=new','GET',undefined,admin)).body.total,0);
 assert.equal((await f.request('/admin/quotes?q=%C3%96rnek','GET',undefined,admin)).body.total,1);
 assert.equal((await f.request('/admin/quotes?q=%25','GET',undefined,admin)).body.total,0);
 const {DatabaseSync}=await import('node:sqlite');const disk=new DatabaseSync(join(f.directory,'quotes.sqlite'));assert.equal(disk.prepare('SELECT count(*) as n FROM quotes').get().n,1);disk.close();
});
test('admin requests require a valid session; logout revokes it',async t=>{
 const f=await fixture(t);assert.equal((await f.request('/admin/quotes')).status,401);assert.equal((await f.request('/admin/login','POST',{password:'wrong'})).status,401);
 const cookie=await f.login();assert.ok(cookie.startsWith('rt-session='));assert.equal((await f.request('/admin/session','GET',undefined,cookie)).status,200);
 assert.equal((await f.request('/admin/logout','POST',{},cookie)).status,200);assert.equal((await f.request('/admin/session','GET',undefined,cookie)).status,401);
});
test('cross-origin mutations and invalid products, quantities and contact information are rejected',async t=>{
 const f=await fixture(t);assert.equal((await f.request('/quotes','POST',payload(),undefined,'https://other.invalid')).status,403);
 for(const items of [[{id:'unknown',qty:1}],[{id:'known-product',qty:-1}],[{id:'known-product',qty:1.5}],[{id:'known-product',qty:1},{id:'known-product',qty:1}]])assert.equal((await f.request('/quotes','POST',{...payload(),items})).status,400);
 for(const details of [{customer:'',email:'a@b.com'},{customer:'Firma',email:'bad'},{customer:'Firma\nBcc: injected',email:'a@b.com'}])assert.equal((await f.request('/quotes','POST',{...payload(),details})).status,400);
 assert.equal((await f.request('/quotes','POST',{...payload(),website:'spam'})).status,400);
});
test('email failure never loses the quote; retries and notification state are visible to admin',async t=>{
 let failures=true;const sent=[];const f=await fixture(t,{mailer:async quote=>{if(failures)throw Error('SMTP unavailable');sent.push(quote)}});
 const result=await f.request('/quotes','POST',payload());await f.processOutbox();assert.equal(f.store.get(result.body.id).emailStatus,'queued');assert.equal(f.store.get(result.body.id).emailAttempts,1);
 for(let attempt=0;attempt<4;attempt++){f.store.db.prepare('UPDATE quotes SET next_email_at=0').run();await f.processOutbox()}
 assert.equal(f.store.get(result.body.id).emailStatus,'failed');const cookie=await f.login();failures=false;assert.equal((await f.request(`/admin/quotes/${result.body.id}/retry-email`,'POST',{},cookie)).status,200);await f.processOutbox();assert.equal(f.store.get(result.body.id).emailStatus,'sent');assert.equal(sent.length,1);await f.processOutbox();assert.equal(sent.length,1);
});
test('missing SMTP disables public submissions without claiming success',async t=>{const f=await fixture(t,{mailer:null});assert.equal((await f.request('/status')).body.quotesEnabled,false);assert.equal((await f.request('/quotes','POST',payload())).status,503);assert.equal(f.store.list('','',1).total,0)});
test('unlisted product requests need a note and retain the customer text',async t=>{const f=await fixture(t);const body=payload();body.items=[];assert.equal((await f.request('/quotes','POST',body)).status,201);body.requestKey=randomUUID();body.details.note='';assert.equal((await f.request('/quotes','POST',body)).status,400)});

test('SMTP notification has the fixed merchant recipient, customer Reply-To and all quote items',async()=>{
 const {createMailer}=await import('../server/mail.js');let captured,settings;
 const mailer=createMailer({SMTP_HOST:'smtp.example.invalid',SMTP_USER:'test',SMTP_PASSWORD:'test-only',SMTP_FROM:'info@rulmanteklif.com',APP_ORIGIN:'https://example.invalid'},options=>{settings=options;return {sendMail:async message=>{captured=message;return {accepted:['info@rulmanteklif.com']}}}});
 await mailer({id:'RT-TEST',createdAt:'2026-11-01',details:{customer:'Firma',email:'customer@example.com',phone:'0555',note:'Teyit'},lines:[{brand:'SKF',code:'6204',qty:5}]});
 assert.equal(captured.to,'info@rulmanteklif.com');assert.equal(captured.replyTo,'customer@example.com');assert.ok(captured.text.includes('SKF 6204 — 5 adet'));assert.ok(captured.text.includes('https://example.invalid/#/admin'));assert.equal(settings.requireTLS,true);
});

test('idle email worker accepts future work and concurrent runs do not send a duplicate',async t=>{
 const sent=[];const f=await fixture(t,{mailer:async quote=>{await new Promise(resolve=>setTimeout(resolve,10));sent.push(quote.id)}});await f.processOutbox();
 const result=await f.request('/quotes','POST',payload());await Promise.all([f.processOutbox(),f.processOutbox()]);assert.deepEqual(sent,[result.body.id]);assert.equal(f.store.get(result.body.id).emailStatus,'sent');
});
