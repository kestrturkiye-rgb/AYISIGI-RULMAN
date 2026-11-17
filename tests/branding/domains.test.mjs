import test from 'node:test';import assert from 'node:assert/strict';
import {DOMAIN_BRANDS,PUBLIC_HOSTS,domainBrand,canonicalOrigin,knownBrand} from '../../src/branding/domains.js';
import {brandSite} from '../../src/branding/site.js';import {publicHref} from '../../src/seo/urls.js';
import {productStructuredData} from '../../src/seo/content.js';import {requestAuthOrigin} from '../../src/security/policy.mjs';
const site={settings:{identity:{name:'Rulman Teklif'},contact:{email:'info@rulmanteklif.com'},seo:{title:'Rulman Teklif',description:'Katalog'},privacy:{controllerName:'Gerçek ticari unvan'},footer:{description:'Rulman Teklif tedarik'}},company:{name:'Rulman Teklif',phone:'0553 334 75 63',email:'info@rulmanteklif.com'},pages:[{slug:'hakkimizda',body:{title:'Hakkımızda',paragraphs:['Rulman Teklif olarak ürün seçiyoruz.','Ortak bilgi.']}}],home:[{id:'hero',content:{title:'Rulman Teklif',href:'https://rulmanteklif.com'}}],menus:[],identity:{logoUrl:'/brand/rulman-teklif.webp'},media:new Map()};
test('twenty exact owned hosts map to five brands; lookalikes cannot gain auth or clean routes',()=>{
 assert.equal(DOMAIN_BRANDS.length,5);assert.equal(PUBLIC_HOSTS.length,20);
 for(const brand of DOMAIN_BRANDS)for(const host of [brand.primary,...brand.aliases].flatMap(h=>[h,'www.'+h])){
  assert.equal(domainBrand({hostname:host}).key,brand.key);assert.equal(canonicalOrigin({hostname:host}),brand.origin);assert.equal(publicHref('/urunler',{hostname:host}),'/urunler');assert.equal(requestAuthOrigin(host),'https://'+host);
 }
 for(const host of ['rulmanteknik.com.attacker.test','attacker.test','rulmankodu.com:443','rulmanasistan.com@attacker.test']){assert.equal(knownBrand(host),undefined);assert.equal(requestAuthOrigin(host),null);assert.equal(publicHref('/urunler',{hostname:host}),'#/urunler');}
});
test('brand projection preserves contacts, legal controller, shared cache and per-host logo overrides',()=>{
 const before=JSON.stringify(site);const teknik=brandSite(site,{hostname:'rulmanteknik.com.tr'}),asistan=brandSite(site,{hostname:'rulmanasistan.com'}),primary=brandSite(site,{hostname:'rulmanteklif.online'});
 assert.equal(teknik.company.name,'Rulman Teknik');assert.equal(asistan.company.name,'Rulman Asistan');assert.equal(primary.company.name,'Rulman Teklif');assert.equal(teknik.company.email,'info@rulmanteklif.com');assert.equal(teknik.settings.privacy.controllerName,'Gerçek ticari unvan');assert.match(teknik.pages[0].body.paragraphs[0],/Rulman Teknik/);assert.equal(teknik.home[0].content.href,'https://rulmanteklif.com');assert.equal(JSON.stringify(site),before);
 const override={...site,settings:{...site.settings,identity:{domainBrands:{teknik:{name:'Teknik Özel',logo:'logo-x'}}}},media:new Map([['logo-x',{src:'https://media.example/logo.webp'}]])};assert.equal(brandSite(override,{hostname:'rulmanteknik.com'}).identity.logoUrl,'https://media.example/logo.webp');assert.equal(brandSite(override,{hostname:'rulmanasistan.com'}).identity.logoUrl,site.identity.logoUrl);
});
test('English copy and Product/Breadcrumb URLs follow brand primary origin, aliases keep same canonical',()=>{
 for(const b of DOMAIN_BRANDS){const projected=brandSite(site,{hostname:b.aliases[0]||b.primary},'en');projected.groups=[{id:'bearings',dbId:'root',categoryRecords:[{id:'c'}]}];const schema=productStructuredData({sku:'6001 2RS RBE',slug:'6001-2rs-rbe',category:'Bilyalı rulmanlar',category_id:'c'},projected,'en');assert.equal(schema['@graph'][0].url,b.origin+'/en/6001-2rs-rbe/rulman');assert.ok(schema['@graph'][1].itemListElement.every(x=>x.item.startsWith(b.origin+'/en/')));if(b.key!=='teklif')assert.match(projected.settings.seo.description,/Explore bearings/);}
});
