import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {readCart,resolveCart,saveCart} from '../src/cart.js';
import {readCatalogFilters,updateCatalogParams} from '../src/catalog-filters.js';
import {compileTechnicalQuery,compileTextQuery,matchesTechnicalQuery,matchesTextQuery} from '../src/technical-search.js';
import {decodeCatalog} from '../src/catalog-data.js';
import {catalogStats} from '../src/catalog-stats.js';
import {articles} from '../src/academy-data.js';
const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url)));
const catalog=read('../public/catalog/index.json');
const products=decodeCatalog(catalog);

test('cart handles corrupt, duplicate and denied storage without breaking the page',()=>{
 const denied={getItem(){throw Error('denied')},setItem(){throw Error('quota')}};
 assert.deepEqual(readCart(denied),[]);assert.equal(saveCart([],denied),false);
 assert.deepEqual(readCart({getItem:()=>'{broken'}),[]);
 const p=products[0],byId=new Map([[p.id,p]]);
 assert.deepEqual(resolveCart([null,{}, {id:p.id,qty:-1},{id:'missing',qty:5},{id:p.id,qty:2},{id:p.id,qty:3}],byId),[{id:p.id,qty:5}]);
 assert.deepEqual(resolveCart([{id:p.id,qty:Number.MAX_SAFE_INTEGER}],byId),[{id:p.id,qty:1000000}]);
 assert.deepEqual(resolveCart([{id:p.id,qty:2}],new Map()),[]);
});
test('filters retain code, both diameters and brand through URL updates and reload parsing',()=>{
 const route={path:'/urunler/bearings',params:new URLSearchParams('kod=6204&inner=20&outer=47&marka=SKF&kategori=Bilyal%C4%B1+rulmanlar')};
 const filters=readCatalogFilters(route);assert.equal(filters.category,'Bilyalı rulmanlar');assert.equal(filters.brand,'SKF');assert.deepEqual(filters.technicalQuery,{code:'6204',inner:20,outer:47});
 const next=new URL(updateCatalogParams(route,{marka:'FAG'}),'https://local.invalid');assert.equal(next.searchParams.get('outer'),'47');assert.equal(next.searchParams.get('marka'),'FAG');
 const cleared=new URL(updateCatalogParams(route,{kod:null,inner:null,outer:null,width:null}),'https://local.invalid');assert.equal(cleared.searchParams.get('marka'),'SKF');assert.equal(cleared.searchParams.has('kod'),false);
 assert.ok(readCatalogFilters({path:'/urunler',params:new URLSearchParams('inner=50&outer=20')}).error);
 assert.ok(readCatalogFilters({path:'/urunler',params:new URLSearchParams('inner=abc')}).error);
});
test('compiled search preserves exact and text search results across the complete catalog',()=>{
 for(const query of [{code:'SKF6001-2RSH/C3'},{inner:20,outer:47},{code:'6204',inner:20},null]){
  const fast=compileTechnicalQuery(query);assert.deepEqual(products.filter(fast).map(p=>p.id),products.filter(p=>matchesTechnicalQuery(p,query)).map(p=>p.id));
 }
 for(const query of ['SKF6001-2RSH/C3','6204','FAG 6205','', '6306 ZZ']){
  const fast=compileTextQuery(query);assert.deepEqual(products.filter(fast).map(p=>p.id),products.filter(p=>matchesTextQuery(p,query)).map(p=>p.id));
 }
});
test('browser catalog omits source links while preserving product IDs and search data',()=>{
 const compact=decodeCatalog({...catalog,rows:catalog.rows.slice(0,10)},'/AYISIGI-RULMAN/',{sourceLinks:false});
 assert.deepEqual(compact.map(p=>p.id),products.slice(0,10).map(p=>p.id));assert.ok(compact.every(p=>p.sources.length===0&&p.imageReferenceUrl===null));
});
test('all ten academy articles have unique routes, full content and valid local images',()=>{
 assert.equal(articles.length,10);assert.equal(new Set(articles.map(a=>a.slug)).size,10);
 for(const article of articles){assert.match(article.slug,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);assert.ok(article.intro.length>160);assert.ok(article.sections.length>=3);assert.ok(article.sections.every(s=>s.paragraphs.length>=2));assert.ok(article.references.length>=2);assert.ok(existsSync(new URL('../public/'+article.image,import.meta.url)),article.slug)}
});
test('responsive variants cover all audited display images without stale source hashes',()=>{
 const report=read('../docs/product-image-thumbnails.json');const mapping=read('../src/product-image-map.json');
 const assets=new Set(catalog.rows.map(row=>mapping[row[6].split('/').pop()]||row[6].replace(/^\//,'')));
 assert.equal(Object.keys(report.files).length,assets.size);
 for(const asset of assets){
  const item=report.files[asset];assert.ok(item,asset);assert.equal(createHash('sha256').update(readFileSync(new URL('../public/'+asset,import.meta.url))).digest('hex'),item.sourceSha256,asset);
  for(const size of ['320','full']){const output=item.outputs[size];assert.ok(output.width>0&&output.width<=(size==='320'?320:640));const file=readFileSync(new URL('../public/'+output.path,import.meta.url));assert.equal(createHash('sha256').update(file).digest('hex'),output.sha256,output.path)}
 }
});

test('precomputed catalog counts reconcile with the complete product inventory',()=>{
 const stats=catalogStats(products);assert.equal(stats.brands.reduce((n,b)=>n+b.count,0),products.length);assert.equal(Object.values(stats.categories).reduce((a,b)=>a+b,0),products.length);
 for(const brand of stats.brands)assert.equal(brand.count,products.filter(p=>p.brand===brand.name).length);
});
