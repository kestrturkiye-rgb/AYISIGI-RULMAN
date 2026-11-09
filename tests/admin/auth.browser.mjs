import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {connect} from '../../scripts/supabase/database.mjs';
const accountFile=process.env.ADMIN_LOCAL_ACCOUNTS||'/tmp/rt-admin-local-test/accounts.json';
const {accounts}=JSON.parse(await readFile(accountFile,'utf8'));
const url=process.env.ADMIN_TEST_URL||'http://127.0.0.1:4180/admin/';
assert.equal(new URL(url).hostname,'127.0.0.1','Yerel gerçek-Auth testi yalnızca loopback üzerinde çalışır.');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const errors=[];const checks=[];let scans=0;
async function login(page,account){await page.goto(url+'#/giris');await page.getByLabel('E-posta adresi').fill(account.email);await page.getByLabel('Şifre',{exact:true}).fill(account.password);await page.getByRole('button',{name:'Giriş yap',exact:true}).click();}
try{
 const context=await browser.newContext();const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url+'#/');await page.getByRole('heading',{name:'Yönetim paneline giriş'}).waitFor();
 await page.getByRole('button',{name:'Giriş yap',exact:true}).click();await page.getByText('Geçerli bir e-posta adresi girin.').waitFor();
 await page.getByLabel('E-posta adresi').fill(accounts[0].email);await page.getByLabel('Şifre',{exact:true}).fill('wrong-password-123');await page.getByRole('button',{name:'Giriş yap',exact:true}).click();await page.getByRole('alert').filter({hasText:'Giriş bilgileri doğrulanamadı'}).waitFor();checks.push('Korumalı rota, Türkçe doğrulama ve yanlış parola reddi');
 await login(page,accounts[0]);await page.getByRole('heading',{name:'Oturumunuz doğrulandı'}).waitFor();await page.getByText('Admin',{exact:true}).waitFor();
 await page.reload();await page.getByRole('heading',{name:'Oturumunuz doğrulandı'}).waitFor();
 const second=await context.newPage();await second.goto(url);await second.getByRole('heading',{name:'Oturumunuz doğrulandı'}).waitFor();
 await page.getByRole('button',{name:'Çıkış yap',exact:true}).click();await second.getByRole('heading',{name:'Yönetim paneline giriş'}).waitFor();await second.close();checks.push('Gerçek Supabase Auth admin girişi, yenilemede oturum, sekmeler arası çıkış');
 for(const [width,height] of [[360,800],[390,844],[768,1024],[1280,900],[1920,1080]]){
  await page.setViewportSize({width,height});await page.goto(url+'#/giris');await page.getByRole('heading',{name:'Yönetim paneline giriş'}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(scan.violations,[],JSON.stringify(scan.violations));scans++;
  if(width===390)await page.screenshot({path:'/tmp/rt-admin-login-mobile.png',fullPage:true});if(width===1280)await page.screenshot({path:'/tmp/rt-admin-login-desktop.png',fullPage:true});
 }checks.push('Beş ekran genişliği, taşma ve WCAG erişilebilirlik taramaları');
 await context.close();
 for(const role of ['editor','sales','unassigned']){
  const c=await browser.newContext();const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await login(p,accounts.find(a=>a.role===role));
  if(role==='unassigned')await p.getByText('Bu hesapta etkin admin, editör veya satış rolü bulunmuyor.').waitFor();
  else{await p.getByRole('heading',{name:'Oturumunuz doğrulandı'}).waitFor();await p.getByText(role==='sales'?'Satış':'Editör',{exact:true}).waitFor();}
  await c.close();
 }checks.push('Editör/satış rolü ve rol atanmamış gerçek hesap');
 const c=await browser.newContext();const p=await c.newPage();await login(p,accounts[2]);await p.getByRole('heading',{name:'Oturumunuz doğrulandı'}).waitFor();
 const db=await connect('postgresql://postgres@127.0.0.1:55432/rt_admin_local_auth',{localOnly:true});
 try{await db.query("update private.staff_members set active=false where user_id=(select id from auth.users where email=$1)",[accounts[2].email]);await p.getByRole('button',{name:'Yetkiyi yenile'}).click();await p.getByText('Bu hesapta etkin admin, editör veya satış rolü bulunmuyor.').waitFor();}
 finally{await db.query("update private.staff_members set active=true where user_id=(select id from auth.users where email=$1)",[accounts[2].email]);await db.end();await c.close();}
 checks.push('Rol iptali gerçek DB üzerinden erişimi kapatır');
 const invalid=await browser.newPage();await invalid.goto(url+'?error=access_denied&error_description=untrusted#/giris');await invalid.getByRole('alert').filter({hasText:'Giriş bağlantısı geçersiz'}).waitFor();assert.equal(new URL(invalid.url()).search,'');await invalid.close();checks.push('Geçersiz auth callback reddi ve URL temizliği');
 assert.deepEqual(errors,[]);await writeFile('/tmp/rt-admin-auth-browser.json',JSON.stringify({checks,accessibilityScans:scans,runtimeErrors:errors,auth:'real-local-gotrue',database:'real-local-postgres'},null,2));console.log(JSON.stringify({checks,scans,errors}));
}finally{await browser.close();}
