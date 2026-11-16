import test from 'node:test';
import assert from 'node:assert/strict';
import {productContent,categoryContent,groupsFor,productGroup,relatedResources,productStructuredData,serializeStructuredData} from '../../src/seo/content.js';
import {guides} from '../../src/seo/category-guides.js';
const site={categories:[{id:'group-bearings',slug:'bearings',name:'Rulmanlar'},{id:'ball',parent_id:'group-bearings',name:'Bilyalı rulmanlar'},{id:'deep',parent_id:'ball',name:'Sabit bilyalı rulmanlar'}],settings:{identity:{name:'Rulman Teklif'}},articles:[{slug:'rulman-secimi-yuk-hiz-ve-omur',title:'Rulman seçiminde yük, hız ve ömür nasıl birlikte değerlendirilir?'},{slug:'lineer-kizak-secimi-hassasiyet-ve-montaj',title:'Lineer kızak sistemlerinde doğru seçim, hassasiyet ve montaj'}]};
const product={sku:'6001',slug:'6001',name:'6001 · Bilyalı rulmanlar',category:'Bilyalı rulmanlar',category_id:'deep',brand:'Belirtilmemiş',inner_mm:12,outer_mm:28,width_mm:8};
test('product metadata uses real identifiers and dimensions without claiming an unknown manufacturer or stock',()=>{
 const copy=productContent(product);assert.ok(copy.title.startsWith('6001 Bilyalı rulmanlar'));for(const value of ['12 mm','28 mm','8 mm'])assert.ok(copy.summary.includes(value));assert.ok(!copy.title.includes('Belirtilmemiş'));assert.ok(!/stokta|ücretsiz kargo|en ucuz/i.test(copy.description));
 const partial=productContent({...product,inner_mm:null,outer_mm:0,width_mm:undefined});assert.deepEqual(partial.measurements,[]);assert.ok(!partial.description.includes('mm'));
});
test('explicit admin SEO overrides retain their exact content and precedence',()=>{
 const copy=productContent({...product,seo:{metaTitle:'Özel başlık',title:'Eski başlık',metaDescription:'Özel açıklama',description:'Eski açıklama'}});assert.equal(copy.title,'Özel başlık');assert.equal(copy.description,'Özel açıklama');
 assert.equal(productContent({...product,seo:{title:'Eski alan başlığı'}}).title,'Eski alan başlığı');
});
test('English output keeps codes and real measurements while translating catalog terms',()=>{
 const copy=productContent({...product,brand:'SKF'},{language:'en'});assert.ok(copy.title.includes('SKF 6001 Ball bearings'));assert.ok(copy.summary.includes('Bore: 12 mm'));assert.ok(copy.description.includes('quotation'));assert.ok(!copy.summary.includes('teklif'));
 const spare=productContent({sku:'RT-123',name:'Matkap uçları',category:'Kesici takımlar',brand:'Bosch'});assert.ok(spare.title.includes('Matkap uçları'));
});
test('product schema includes factual data and breadcrumbs without fabricated offers, ratings or reviews',()=>{
 const schema=productStructuredData(product,site),item=schema['@graph'][0];assert.equal(item.sku,'6001');assert.equal(item.additionalProperty.length,3);for(const key of ['brand','offers','aggregateRating','review'])assert.equal(Object.hasOwn(item,key),false);assert.equal(schema['@graph'][1].itemListElement[1].item,'https://rulmanteklif.com/urunler/bearings?kategori=category%3Adeep');
 const english=productStructuredData({...product,brand:'FAG',manufacturer_code:'6001-2RS'},site,'en');assert.equal(english['@graph'][0].brand.name,'FAG');assert.equal(english['@graph'][0].mpn,'6001-2RS');assert.ok(english['@graph'][0].url.includes('/en/urun/'));
});
test('JSON-LD safely escapes script terminators without changing the parsed product data',()=>{
 const raw={name:'</script><script>alert(1)</script>&\u2028'},encoded=serializeStructuredData(raw);assert.ok(!encoded.includes('</script>'));assert.deepEqual(JSON.parse(encoded),raw);
});
test('category ancestry works for nested categories and cannot loop on invalid cycles',()=>{
 assert.equal(productGroup(product,site).id,'bearings');const broken={categories:[...site.categories,{id:'x',parent_id:'y'},{id:'y',parent_id:'x'}]};assert.equal(groupsFor(broken)[0].categoryRecords.length,2);
});
test('related content only links to published records supplied by the public site',()=>{
 const links=relatedResources({site,product});assert.ok(links.some(l=>l.href==='/urunler/bearings'));assert.ok(links.some(l=>l.href==='/akademi/rulman-secimi-yuk-hiz-ve-omur'));assert.ok(!links.some(l=>l.href.includes('lineer')));assert.ok(!links.some(l=>l.href.includes('rulman-yaglama')));
 const articleLinks=relatedResources({site,article:site.articles[0]});assert.ok(!articleLinks.some(l=>l.href.endsWith(site.articles[0].slug)));
});
test('all twelve catalog guides have Turkish and English selection guidance and distinct titles',()=>{
 const titles=new Set();assert.equal(Object.keys(guides).length,12);for(const [id,guide] of Object.entries(guides)){for(const language of ['tr','en']){assert.ok(guide[language].length>=2);assert.ok(guide[language].every(p=>p.length>50));const copy=categoryContent({id,name:id},{language});assert.ok(copy.description);if(language==='tr')titles.add(copy.title);}}assert.equal(titles.size,12);
});

test('managed English category translations apply equally to metadata and structured data',()=>{const entries=[{source:'Bilyalı rulmanlar',translation:'Custom bearing category'}],copy=productContent(product,{language:'en',entries});assert.ok(copy.title.includes('Custom bearing category'));const schema=productStructuredData(product,{...site,settings:{...site.settings,localization:{entries}}},'en');assert.equal(schema['@graph'][0].category,'Custom bearing category');});
