// Non-mutating checks for an attached production domain. No login attempts or accepted analytics.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {AUTH_ORIGINS} from '../../src/security/policy.mjs';

const origin=process.argv[2]||'https://rulmanteklif.com';
if(!AUTH_ORIGINS.includes(origin))throw Error('Yalnızca onaylı üretim adresleri kontrol edilebilir.');
const proxyUrl=process.env.HTTPS_PROXY||process.env.https_proxy;
let proxy;
if(proxyUrl){const u=new URL(proxyUrl);proxy={server:u.origin,...(u.username?{username:decodeURIComponent(u.username),password:decodeURIComponent(u.password)}:{})};}
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox'],...(proxy?{proxy}:{})});
const checks=[],errors=[];
try{
 const context=await browser.newContext();const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 const response=await page.goto(origin+'/#/',{waitUntil:'domcontentloaded'});
 assert.equal(response.status(),200);assert.equal(new URL(page.url()).origin,origin);
 assert.ok(response.headers()['content-security-policy']?.includes("frame-ancestors 'none'"));
 await page.locator('.product-grid > article.product').nth(23).waitFor();checks.push('HTTPS ana sayfa, CSP ve 24 ürün');
 const reject=page.getByRole('button',{name:'Yalnızca zorunlu',exact:true});if(await reject.isVisible())await reject.click();
 const first=await page.locator('.product-grid .product-title').allTextContents();await page.reload();await page.locator('.product-grid > article.product').nth(23).waitFor();assert.notDeepEqual(await page.locator('.product-grid .product-title').allTextContents(),first);checks.push('Her açılışta farklı ürün seçkisi');
 await page.setViewportSize({width:390,height:844});await page.goto(origin+'/#/kvkk');await page.locator('.legal-page h1').waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);checks.push('Mobil yasal sayfa');
 await page.goto(origin+'/admin/#/giris');await page.getByRole('heading',{name:'Yönetim paneline giriş',exact:true}).waitFor();assert.equal(new URL(page.url()).origin,origin);checks.push('Aynı domainde admin girişi');
 const session=await context.request.get(origin+'/api/auth/session',{headers:{Origin:origin}});assert.equal(session.status(),200);assert.equal((await session.json()).session,null);assert.ok((await context.cookies()).some(c=>c.name==='__Host-rt-csrf'&&c.secure&&c.sameSite==='Strict'));checks.push('Aynı domainde güvenli anonim oturum');
 assert.equal((await context.request.post(origin+'/api/auth/password',{headers:{Origin:'https://attacker.invalid'},data:{}})).status(),403);
 assert.equal((await context.request.post(origin+'/api/collect',{headers:{Origin:origin},data:{consent:false}})).status(),400);
 assert.equal((await context.request.post(origin+'/api/quote',{headers:{Origin:origin},data:{website:'spam'}})).status(),400);checks.push('Kaynak, rıza ve geçersiz teklif korumaları');
 assert.deepEqual(errors,[]);
 const report={origin,checks,errors,productionRecordsWritten:false,authenticatedLoginTested:false,checkedAtUtc:new Date().toISOString()};
 await writeFile('docs/domain-setup/smoke-'+new URL(origin).hostname+'.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({origin,checks:checks.length,errors}));
}finally{await browser.close();}
