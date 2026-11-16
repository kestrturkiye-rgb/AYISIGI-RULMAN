// Read-only live checks. Quote-list changes stay in an isolated browser context.
import {chromium,request} from 'playwright';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const origin='https://rulmanteklif.com';
let proxy;const raw=process.env.HTTPS_PROXY||process.env.https_proxy;
if(raw){const u=new URL(raw);proxy={server:u.origin,...(u.username?{username:decodeURIComponent(u.username),password:decodeURIComponent(u.password)}:{})};}
const api=await request.newContext({...(proxy?{proxy}:{}),timeout:45000});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox'],...(proxy?{proxy}:{})});
const context=await browser.newContext(),p=await context.newPage(),checks=[],errors=[];
context.on('page',page=>page.on('pageerror',e=>errors.push(e.message)));
p.on('pageerror',e=>errors.push(e.message));
try{
 await p.goto(origin+'/urunler?kod=6204',{waitUntil:'domcontentloaded'});
 await p.locator('a.product-title').first().waitFor();const consent=p.getByRole('button',{name:'Yalnızca zorunlu',exact:true});if(await consent.isVisible())await consent.click();
 const listing=p.url(),href=await p.locator('a.product-title').first().getAttribute('href'),code=await p.locator('a.product-title').first().innerText();
 assert.ok(href.startsWith('/urun/'));
 await p.locator('a.product-title').first().click();await p.waitForURL(origin+href);
 await p.getByRole('heading',{name:code,exact:true}).waitFor();assert.equal(await p.locator('.detail-modal').count(),0);
 assert.equal(await p.locator('link[rel=canonical]').getAttribute('href'),origin+href);
 checks.push('Katalog başlığı ayrı ürün sayfasına açılır; canonical aynı ürünü gösterir');
 const html=await api.get(origin+href);assert.equal(html.status(),200);assert.ok((await html.text()).includes('https://schema.org/Product'));
 await p.reload();await p.getByRole('heading',{name:code,exact:true}).waitFor();checks.push('Doğrudan bağlantı ve yenileme çalışır; ürün sunucu HTML içinde bulunur');
 await p.getByRole('button',{name:'Bağlantıyı kopyala',exact:true}).click();assert.equal(await p.getByRole('textbox',{name:'Ürün sayfası bağlantısı',exact:true}).inputValue(),origin+href);
 await p.getByRole('button',{name:'Teklif sepetine ekle',exact:true}).click();const cart=await p.evaluate(()=>localStorage.getItem('rulman-teklif-cart'));assert.equal(JSON.parse(cart).length,1);checks.push('Ürün bağlantısı kopyalanabilir ve teklif listesine eklenebilir');
 await p.goto(listing);await p.locator('a.product-visual').first().waitFor();const imageHref=await p.locator('a.product-visual').first().getAttribute('href');
 const opened=context.waitForEvent('page');await p.locator('a.product-visual').first().click({modifiers:['Control']});const tab=await opened;await tab.bringToFront();await tab.waitForURL(origin+imageHref);await tab.locator('.detail-copy h1').waitFor();await tab.close();await p.bringToFront();assert.equal(p.url(),listing);checks.push('Görsel bağlantısı Ctrl+tıklama ile yeni sekmede açılır');
 await p.locator('a.product-visual').first().click();await p.waitForURL(origin+imageHref);await p.locator('.detail-copy h1').waitFor();await p.goBack();await p.waitForURL(listing);await p.locator('a.product-title').first().waitFor();checks.push('Tarayıcı geri düğmesi katalog filtresini korur');
 await p.goto(origin+'/en'+href);await p.locator('.detail-copy h1').waitFor();await p.getByRole('button',{name:'Copy link',exact:true}).click();assert.equal(await p.getByRole('textbox',{name:'Product page link',exact:true}).inputValue(),origin+'/en'+href);assert.equal(await p.locator('html').getAttribute('lang'),'en');assert.equal(await p.evaluate(()=>localStorage.getItem('rulman-teklif-cart')),cart);checks.push('İngilizce ürün sayfası ve paylaşım bağlantısı dili korur; sepet değişmez');
 await p.setViewportSize({width:1366,height:900});await p.goto(origin+href);await p.locator('.detail-copy h1').waitFor();await p.screenshot({path:'docs/product-pages/desktop-live.png',fullPage:true});
 for(const width of [390,360]){await p.setViewportSize({width,height:844});await p.goto(origin+href);await p.locator('.detail-copy h1').waitFor();assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.ok(Math.abs((await p.locator('.product-page-media>.detail-image').boundingBox()).width-(await p.locator('.product-page-media').boundingBox()).width)<1);}
 await p.screenshot({path:'docs/product-pages/mobile-live.png',fullPage:true});checks.push('390px ve 360px ürün sayfasında yatay taşma yok');
 await p.goto(origin+'/kampanyalar');await p.locator('.campaign-section').waitFor();const campaign=p.locator('a.campaign-image').first();if(await campaign.count()){assert.ok((await campaign.getAttribute('href')).includes('/urun/'));checks.push('Yayındaki kampanya kartları ürün adresine bağlı');}
 const missing=await api.get(origin+'/urun/nonexistent-product-pages-test-942834');assert.equal(missing.status(),404);assert.deepEqual(errors,[]);
 const report={checkedAtUtc:new Date().toISOString(),exampleUrl:origin+href,checks,errors,quoteRequestsSubmitted:false,accountsCreated:false,trackingConsentGranted:false};
 await writeFile('docs/product-pages/live-smoke.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await browser.close();await api.dispose();}
