import {readFile,writeFile} from 'node:fs/promises';
import {createHmac,randomBytes} from 'node:crypto';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const dir='/tmp/rt-admin-local-test';
const secret=(await readFile(dir+'/auth.env','utf8')).match(/^GOTRUE_JWT_SECRET=(.+)$/m)[1];
const data=[{alg:'HS256',typ:'JWT'},{role:'service_role',iss:'supabase',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+300}].map(v=>Buffer.from(JSON.stringify(v)).toString('base64url')).join('.');
const service=data+'.'+createHmac('sha256',secret).update(data).digest('base64url');
const file=JSON.parse(await readFile(dir+'/accounts.json','utf8'));const account=file.accounts.find(a=>a.role==='editor');
const r=await fetch('http://127.0.0.1:9999/admin/generate_link',{method:'POST',headers:{Authorization:'Bearer '+service,'Content-Type':'application/json'},body:JSON.stringify({type:'recovery',email:account.email})});assert.ok(r.ok);const link=await r.json();assert.ok(link.hashed_token);
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:4180/admin/?token_hash='+encodeURIComponent(link.hashed_token)+'&type=recovery');await page.getByRole('heading',{name:'Şifrenizi belirleyin'}).waitFor();assert.equal(new URL(page.url()).search,'');
 await page.getByLabel('Yeni şifre',{exact:true}).fill('short');await page.getByLabel('Şifreyi tekrar girin').fill('different');await page.getByRole('button',{name:'Şifreyi kaydet'}).click();await page.getByText('En az 12 karakterli bir şifre seçin.').waitFor();await page.getByText('Şifreler eşleşmiyor.').waitFor();
 const password=randomBytes(18).toString('base64url');await page.getByLabel('Yeni şifre',{exact:true}).fill(password);await page.getByLabel('Şifreyi tekrar girin').fill(password);await page.getByRole('button',{name:'Şifreyi kaydet'}).click();await page.getByRole('heading',{name:'Kontrol paneli'}).waitFor();account.password=password;await writeFile(dir+'/accounts.json',JSON.stringify(file,null,2)+'\n',{mode:0o600});
 if(await page.locator('.profile-button').isVisible())await page.locator('.profile-button').click();await page.getByRole('button',{name:'Çıkış yap',exact:true}).click();await page.getByLabel('Kullanıcı adı veya e-posta').fill(account.email);await page.getByLabel('Şifre',{exact:true}).fill(password);await page.getByRole('button',{name:'Giriş yap',exact:true}).click();await page.getByRole('heading',{name:'Kontrol paneli'}).waitFor();
 const other=await browser.newContext();const reused=await other.newPage();await reused.goto('http://127.0.0.1:4180/admin/?token_hash='+encodeURIComponent(link.hashed_token)+'&type=recovery');await reused.getByRole('alert').filter({hasText:'Giriş bağlantısı geçersiz'}).waitFor();await other.close();
 await writeFile('/tmp/rt-admin-recovery-browser.json',JSON.stringify({checks:['Gerçek Auth recovery token doğrulaması','URL token temizliği','Türkçe parola uzunluk/eşleşme hataları','Parola kaydetme ve yeni parolayla giriş','Kullanılmış tek seferlik token reddi'],emailDeliveryTested:false},null,2));console.log('Gerçek yerel recovery akışı: 5 kontrol geçti; e-posta teslimi test edilmedi.');
}finally{await browser.close();}
