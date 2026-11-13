import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {mergeCatalog} from '../src/catalog-merge.js';
import {decodeCatalog} from '../src/catalog-decode.js';
const base=process.env.SITE_URL||'http://127.0.0.1:4173/AYISIGI-RULMAN/';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url)));
const raw=read('../public/catalog/index.json'),extra=read('../public/catalog/additions.json');
const products=decodeCatalog(mergeCatalog(raw,extra)),added=products.slice(raw.rows.length);
const browser=await chromium.launch({executablePath:existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1440,height:950},reducedMotion:'reduce'});const page=await context.newPage();page.setDefaultTimeout(30000);
const errors=[],failed=[],checks=[],audits=[];page.on('pageerror',e=>errors.push(e.message));context.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)failed.push({url:r.url(),status:r.status()})});
async function ready(){await page.locator('.product').first().waitFor({timeout:60000})}
try{
 await page.goto(base+'#/urunler');await ready();assert.equal((await page.locator('.catalog-count').innerText()).replaceAll('.',''),products.length+' ürün bulundu');
 for(const group of extra.groups){
  const link=page.getByRole('navigation',{name:'Diğer ürün grupları'}).getByRole('link',{name:group.name,exact:true});await link.click();await page.waitForURL('**#/urunler/'+group.id);await ready();await page.getByRole('heading',{level:1,name:group.name,exact:true}).waitFor();assert.equal(await page.locator('.product:not(.product-text)').count(),0);assert.equal(await page.locator('.product img').count(),0);
  const expected=added.filter(p=>group.categories.includes(p.category)).length;assert.match((await page.locator('.catalog-count').innerText()).replaceAll('.',''),new RegExp('^'+expected+' ürün'));
  for(const width of [320,390,768,1024,1440]){await page.setViewportSize({width,height:950});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'overflow '+width+' '+group.id)}
  for(const width of [390,1440]){await page.setViewportSize({width,height:950});const result=await new AxeBuilder({page}).analyze();audits.push({group:group.id,width,violations:result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))})}
 }
 checks.push('All five new top navigation tabs have populated routes, correct counts, five viewport widths and ten accessibility scans');
 const spring=added.find(p=>p.brand==='BORDIGNON'&&p.variantName);await page.getByLabel('Ürün ara',{exact:true}).fill(spring.code);await page.getByLabel('Ürün ara',{exact:true}).press('Enter');await ready();assert.ok((await page.locator('.product-info').allTextContents()).some(t=>t.includes(spring.name)));
 await page.getByRole('button',{name:`Özellikleri incele: ${spring.brand} ${spring.code}`,exact:true}).click();let dialog=page.getByRole('dialog');await dialog.waitFor();await dialog.locator('summary').waitFor();await dialog.locator('summary').click();assert.match(await dialog.innerText(),new RegExp(spring.variantName.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));assert.equal(await dialog.locator('img').count(),0);assert.equal(await dialog.locator('a[href^="http"]').count(),0);assert.match(await dialog.innerText(),/fotoğraf henüz eklenmedi/);await page.keyboard.press('Escape');
 await page.getByRole('button',{name:`${spring.brand} ${spring.code} teklif sepetine ekle`,exact:true}).click();await page.locator('.cart-button').click();dialog=page.getByRole('dialog');await dialog.locator('.cart-item').waitFor();await dialog.locator('.quantity button').last().click();assert.equal(await dialog.locator('.quantity span').innerText(),'2');await page.evaluate(()=>{window.open=url=>{window.__quoteURL=url;return null}});await dialog.getByRole('button',{name:/WhatsApp ile teklif iste/}).click();assert.ok(decodeURIComponent(await page.evaluate(()=>window.__quoteURL)).includes(spring.name));await page.keyboard.press('Escape');await page.reload();await ready();await page.locator('.cart-button').click();assert.equal(await page.getByRole('dialog').locator('.quantity span').innerText(),'2');await page.keyboard.press('Escape');checks.push('Reference-code and variant detail, no source links or unverified photographs, basket quantity and reload, full model in WhatsApp');
 await page.goto(base+'#/urunler/agricultural-parts');await ready();await page.getByRole('group',{name:'Ürün kategorileri'}).getByRole('button',{name:'İlaçlama parçaları',exact:true}).click();await ready();assert.ok((await page.locator('.product-info>small').allTextContents()).every(t=>t.includes('İlaçlama parçaları')));await page.reload();await ready();assert.match(await page.locator('main h1').innerText(),/İlaçlama parçaları/);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/rt-catalog-expansion-mobile.png',fullPage:true});await page.setViewportSize({width:1440,height:950});await page.screenshot({path:'/tmp/rt-catalog-expansion-desktop.png',fullPage:true});checks.push('New subcategory filter and reload retain the correct products');
 const offline=await browser.newContext();await offline.route('**/catalog/additions.json*',r=>r.abort());const op=await offline.newPage();op.on('pageerror',e=>errors.push(e.message));await op.goto(base+'#/urunler/power-tools');await op.getByRole('button',{name:'Tekrar dene',exact:true}).waitFor({timeout:60000});await offline.unroute('**/catalog/additions.json*');await op.getByRole('button',{name:'Tekrar dene',exact:true}).click();await op.locator('.product').first().waitFor({timeout:60000});await offline.close();checks.push('Supplement download failures are visible and retry restores the combined catalog');
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);assert.ok(audits.every(a=>a.violations.length===0),JSON.stringify(audits.filter(a=>a.violations.length),null,2));
 writeFileSync('/tmp/rt-catalog-expansion-browser.json',JSON.stringify({checks,audits,errors,failed},null,2));console.log(JSON.stringify({checks,audits:audits.length,errors:0}));
}finally{await browser.close()}
