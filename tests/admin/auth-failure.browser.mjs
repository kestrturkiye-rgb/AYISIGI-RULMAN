import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const base=process.env.AUTH_TEST_URL||'http://127.0.0.1:4180/admin/';
const project=process.env.AUTH_TEST_PROJECT||'http://127.0.0.1:4182';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const context=await browser.newContext();const page=await context.newPage();
const uid='00000000-0000-4000-8000-000000000002';let failRole=false,invalidUser=false;
const user=()=>({id:uid,email:'editor@example.test',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:new Date().toISOString()});
const token=()=>[Buffer.from('{"alg":"HS256"}').toString('base64url'),Buffer.from(JSON.stringify({sub:uid,role:'authenticated',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'test'].join('.');
const session=()=>({access_token:token(),refresh_token:'mock-refresh',token_type:'bearer',expires_in:3600,user:user()});
await context.route(project+'/**',async route=>{
 const path=new URL(route.request().url()).pathname;const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'};
 const json=(body,status=200)=>route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(body)});
 if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers});
 if(path==='/auth/v1/token')return json(session());
 if(path==='/auth/v1/user')return invalidUser?json({code:'bad_jwt'},401):json(user());
 if(path==='/auth/v1/logout')return route.fulfill({status:204,headers});
 if(path==='/auth/v1/recover')return json({});
 if(path==='/auth/v1/verify')return route.request().postDataJSON().token_hash==='expired'?json({code:'otp_expired'},401):json(session());
 if(path==='/rest/v1/rpc/get_staff_access')return failRole?json({message:'unavailable'},503):json([{user_id:uid,role:'editor'}]);
 return json({},404);
});
try{
 await page.goto(base+'#/giris');await page.getByLabel('E-posta adresi').fill('editor@example.test');await page.getByRole('button',{name:'Şifremi unuttum',exact:true}).click();await page.getByRole('status').filter({hasText:'Hesap uygunsa'}).waitFor();
 failRole=true;await page.getByLabel('Şifre',{exact:true}).fill('mock-password');await page.getByRole('button',{name:'Giriş yap',exact:true}).click();await page.getByRole('alert').filter({hasText:'yetki doğrulanamadı'}).waitFor();assert.equal(await page.getByRole('heading',{name:'Oturumunuz doğrulandı'}).count(),0);
 failRole=false;await page.getByRole('button',{name:'Tekrar kontrol et',exact:true}).click();await page.getByRole('heading',{name:'Oturumunuz doğrulandı'}).waitFor();
 await page.goto(base+'?token_hash=expired&type=recovery');await page.getByRole('alert').filter({hasText:'Giriş bağlantısı geçersiz'}).waitFor();assert.equal(await page.getByLabel('Yeni şifre',{exact:true}).count(),0);assert.equal(new URL(page.url()).search,'');
 await page.getByRole('button',{name:'Çıkış yap',exact:true}).click();await page.goto(base+'?token_hash=mock-invite&type=invite');await page.getByRole('heading',{name:'Şifrenizi belirleyin'}).waitFor();assert.equal(new URL(page.url()).search,'');
 await writeFile('/tmp/rt-admin-failure-browser.json',JSON.stringify({provider:'mocked HTTP; no email delivered',checks:['Şifre yenileme hesap ifşa etmeyen yanıt','Rol servisi hatasında erişim kapanır','Yeniden deneme erişimi geri getirir','Mevcut oturumda süresi dolmuş recovery reddi','Davet callback parola belirleme ve URL temizliği']},null,2));console.log('5 hata/yeniden deneme/davet kontrolü geçti (HTTP fixture).');
}finally{await browser.close();}
