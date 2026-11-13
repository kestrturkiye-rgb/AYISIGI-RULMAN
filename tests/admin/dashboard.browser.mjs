import assert from 'node:assert/strict';import {readFile,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';import AxeBuilder from '@axe-core/playwright';
const url=process.env.DASHBOARD_TEST_URL||'http://127.0.0.1:4186/admin/';
const project=JSON.parse(await readFile('apps/admin/src/project-config.json','utf8')).url;
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const uid='11111111-1111-4111-8111-111111111111';let role='admin',fail=false,bad=false,roleFail=false,held=null,holdWeek=false;const calls=[],errors=[],checks=[];let scans=0;
const user=()=>({id:uid,email:'fixture@example.test',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{username:'TestYonetici'},created_at:new Date().toISOString()});
const token=()=>[Buffer.from('{"alg":"HS256"}').toString('base64url'),Buffer.from(JSON.stringify({sub:uid,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'test'].join('.');
function dashboard(period='week'){
 return {role:bad?'sales':role,generatedAt:'2026-11-13T12:00:00+00:00',period,periodStart:'2026-11-08T21:00:00+00:00',timezone:'Europe/Istanbul',
  catalog:role==='sales'?null:{total:12,published:9,drafts:3},
  quotes:role==='editor'?null:{today:2,week:8,pending:3,new:2,periodTotal:8,statuses:[{status:'new',count:2},{status:'in_progress',count:1},{status:'quoted',count:5}]},
  recentQuotes:role==='editor'?[]:[{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',status:'new',created_at:'2026-11-13T11:15:00+00:00',customer:period==='today'?'Bugünkü müşteri':'Haftalık müşteri',lines:2,quantity:5}],
  topProducts:role==='editor'?[]:[{product_id:'p',sku:'6204',name:'Sabit bilyalı rulman',quantity:24,requests:3}],
  stock:{lowCount:1,unknownCount:1,items:[{id:'p',sku:'6204',name:'Sabit bilyalı rulman',quantity:2,threshold:3}]}};
}
async function context(){const c=await browser.newContext();await c.route(project+'/**',async route=>{
 const req=route.request(),path=new URL(req.url()).pathname;const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'};
 const json=(body,status=200)=>route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(body)});
 if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
 if(path==='/auth/v1/token')return json({access_token:token(),refresh_token:'fixture-refresh',token_type:'bearer',expires_in:3600,user:user()});
 if(path==='/auth/v1/user')return json(user());
 if(path==='/auth/v1/logout')return route.fulfill({status:204,headers});
 if(path==='/rest/v1/rpc/get_staff_access')return roleFail?json({},503):json([{user_id:uid,role}]);
 if(path==='/rest/v1/rpc/get_admin_dashboard'){
  const period=req.postDataJSON().p_period;calls.push({role,period});const value=dashboard(period);
  if(holdWeek&&period==='week'){await new Promise(resolve=>{held=resolve;});}
  return fail?json({},503):json(value);
 }
 return json({},404);
 });const p=await c.newPage();p.setDefaultTimeout(30000);p.on('pageerror',e=>errors.push(e.message));return {c,p};}
async function login(p){await p.goto(url+'#/giris');await p.getByLabel('Kullanıcı adı veya e-posta').fill('TestYonetici');await p.getByLabel('Şifre',{exact:true}).fill('fixture-password');await p.getByRole('button',{name:'Giriş yap',exact:true}).click();await p.getByRole('heading',{name:'Kontrol paneli',exact:true}).waitFor();}
try{
 let {c,p}=await context();await p.goto(url);await p.getByRole('heading',{name:'Yönetim paneline giriş'}).waitFor();assert.equal(calls.length,0);await login(p);await p.getByText('Haftalık müşteri',{exact:true}).waitFor();assert.equal(await p.locator('.metric-card').filter({hasText:'Toplam ürün'}).locator('strong').innerText(),'12');assert.equal(await p.getByRole('link',{name:'Ürünler',exact:true}).first().isVisible(),true);
 checks.push('Protected dashboard and real-shaped bounded data, active catalog navigation');
 await p.getByRole('button',{name:'Menüyü daralt'}).click();await p.reload();await p.getByRole('button',{name:'Menüyü genişlet'}).waitFor();await p.getByRole('button',{name:'Menüyü genişlet'}).click();
 for(const width of [320,390,768,1024,1440]){await p.setViewportSize({width,height:900});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'overflow '+width);const audit=await new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(audit.violations,[],JSON.stringify(audit.violations));scans++;if(width===390)await p.screenshot({path:'/workspace/shared/admin-dashboard-mobil.png',fullPage:true});if(width===1440)await p.screenshot({path:'/workspace/shared/admin-dashboard-masaustu.png',fullPage:true});}
 await p.setViewportSize({width:390,height:844});await p.getByRole('button',{name:'Yönetim menüsünü aç'}).click();await p.getByRole('dialog').waitFor();for(let i=0;i<20;i++)await p.keyboard.press('Tab');assert.ok(await p.getByRole('dialog').evaluate(el=>el.contains(document.activeElement)));await p.keyboard.press('Escape');assert.equal(await p.getByRole('dialog').isVisible(),false);
 checks.push('Persistent collapsed sidebar, five widths/WCAG scans, mobile dialog focus and Escape');
 await p.getByRole('button',{name:'Bugün',exact:true}).click();await p.getByText('Bugünkü müşteri',{exact:true}).waitFor();assert.equal(calls.at(-1).period,'today');await p.getByLabel('Ekrandaki kayıtlarda ara').fill('no-match');await p.getByText('Eşleşen talep yok').waitFor();await p.getByRole('button',{name:'Aramayı temizle'}).click();await p.getByText('Bugünkü müşteri',{exact:true}).waitFor();await p.getByRole('button',{name:'2 yeni talep',exact:true}).click();await p.getByRole('region',{name:'Yeni talepler'}).waitFor();await p.keyboard.press('Escape');
 checks.push('Period filtering, dashboard row search and notifications popover');await c.close();
 for(const next of ['editor','sales']){role=next;({c,p}=await context());await login(p);await p.getByRole('heading',{name:'Stok uyarıları'}).waitFor();if(role==='editor'){assert.equal(await p.getByRole('heading',{name:'Son teklif talepleri'}).count(),0);assert.equal(await p.getByText('Haftalık müşteri').count(),0);assert.equal(await p.getByRole('button',{name:'Müşteriler Yakında'}).count(),0);}else{assert.equal(await p.getByText('Toplam ürün',{exact:true}).count(),0);assert.equal(await p.getByRole('link',{name:'Ürünler',exact:true}).count(),0);}await c.close();}checks.push('Editor and sales layouts do not expose forbidden modules or data');
 role='admin';fail=true;({c,p}=await context());await login(p);await p.getByRole('alert').waitFor();assert.equal(await p.locator('.metric-card').count(),0);fail=false;await p.getByRole('button',{name:'Tekrar dene',exact:true}).click();await p.getByText('Haftalık müşteri',{exact:true}).waitFor();bad=true;await p.getByRole('button',{name:'Panel verilerini yenile'}).click();await p.getByRole('alert').waitFor();assert.equal(await p.locator('.metric-card').count(),0);bad=false;await c.close();checks.push('Network errors and mismatched-role payload fail closed; retry recovers');
 holdWeek=true;({c,p}=await context());await login(p);await p.getByRole('button',{name:'Bugün',exact:true}).click();await p.getByText('Bugünkü müşteri',{exact:true}).waitFor();assert.ok(held);held();holdWeek=false;await p.waitForTimeout(100);assert.equal(await p.getByText('Haftalık müşteri',{exact:true}).count(),0);checks.push('Late response from old period cannot overwrite the current period');
 await p.goto(url+'#/olmayan-sayfa');await p.getByRole('heading',{name:'Sayfa bulunamadı',exact:true}).waitFor();assert.equal(await p.locator('nav a[aria-current=page]').count(),0);await p.getByRole('link',{name:'Kontrol paneline dön',exact:true}).click();await p.getByText('Haftalık müşteri',{exact:true}).waitFor();checks.push('Unknown routes show a real not-found page without a false active menu');
 roleFail=true;await p.evaluate(()=>window.dispatchEvent(new Event('focus')));await p.getByRole('alert').filter({hasText:'yetki doğrulanamadı'}).waitFor();assert.equal(await p.getByRole('heading',{name:'Kontrol paneli',exact:true}).count(),0);roleFail=false;await c.close();checks.push('Background role verification failure removes dashboard access');
 assert.deepEqual(errors,[]);await writeFile('/tmp/rt-dashboard-browser.json',JSON.stringify({checks,scans,runtimeErrors:errors,provider:'Mock HTTP responses; local PostgreSQL tests separately verify SQL'},null,2));console.log(JSON.stringify({checks,scans,errors}));
}finally{await browser.close();}
