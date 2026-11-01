import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {decodeCatalog, publicAssetPath} from '../src/catalog-data.js';
import {productGroups} from '../src/catalog-groups.js';
import {matchesTechnicalQuery,matchesProductCode,matchesTextQuery} from '../src/technical-search.js';
const index=JSON.parse(readFileSync(new URL('../public/catalog/index.json',import.meta.url)));
const manifest=JSON.parse(readFileSync(new URL('../public/catalog/manifest.json',import.meta.url)));
const products=decodeCatalog(index);

test('catalog assets work under the GitHub Pages project path',()=>{
 assert.equal(publicAssetPath('/catalog/index.json','/AYISIGI-RULMAN/'),'/AYISIGI-RULMAN/catalog/index.json');
 assert.equal(publicAssetPath('catalog/index.json','/'),'/catalog/index.json');
 const sample=decodeCatalog({...index,rows:[index.rows[0]]},'/AYISIGI-RULMAN/')[0];
 assert.ok(sample.image.startsWith('/AYISIGI-RULMAN/catalog/images/'));
 assert.ok(sample.sources.every(source=>source.url.startsWith('https://')));
});

test('all imported records have stable unique IDs, known categories and a traceable source',()=>{
 assert.equal(products.length,manifest.totalProducts);
 assert.equal(new Set(products.map(p=>p.id)).size,products.length);
 const categories=new Set(productGroups.flatMap(g=>g.categories));
 const hosts=new Set(['www.skf.com','stsrulman.com.tr','rulmantoptancisi.com']);
 for(const p of products){
  assert.ok(p.code&&p.brand&&categories.has(p.category),p.code);
  assert.ok(p.sources.length>0);
  for(const s of p.sources){const url=new URL(s.url);assert.equal(url.protocol,'https:');assert.ok(hosts.has(url.hostname));}
 }
});
test('compressed catalog contains exactly the same records as the plain index',()=>{
 const compressed=readFileSync(new URL('../public/catalog/index.json.gz',import.meta.url));
 assert.deepEqual(JSON.parse(gunzipSync(compressed).toString()),index);
});
test('STS full public product list and source membership counts reconcile',()=>{
 const sts=new Set();const counts={};
 for(const p of products){
  for(const source of new Set(p.sources.map(s=>s.key)))counts[source]=(counts[source]||0)+1;
  for(const s of p.sources)if(s.key==='sts')sts.add(s.url);
 }
 assert.deepEqual(counts,manifest.sourceCounts);
 assert.equal(sts.size,manifest.stsExpected);
 assert.equal(manifest.rawSourceCounts.sts,manifest.stsExpected);
 assert.deepEqual(manifest.rtFailures,[]);
});
test('only actual positive dimensions enter exact technical search; missing values never match',()=>{
 for(const p of products)for(const value of Object.values(p.dimensions))assert.ok(Number.isFinite(value)&&value>0);
 for(const p of products)if(p.dimensions.inner!==undefined&&p.dimensions.outer!==undefined)assert.ok(p.dimensions.inner<p.dimensions.outer);
 const sample=products.find(p=>p.dimensions.inner===20&&p.dimensions.outer===47&&p.dimensions.width===14);
 assert.ok(sample,'20 × 47 × 14 catalog product must exist');
 assert.ok(matchesTechnicalQuery(sample,{inner:20,outer:47,width:14}));
 assert.equal(matchesTechnicalQuery(sample,{inner:20,outer:48,width:14}),false);
 const missing=products.find(p=>Object.keys(p.dimensions).length===0);
 assert.ok(missing);assert.equal(matchesTechnicalQuery(missing,{inner:20}),false);
});
test('locally retained photos and lazy technical-detail chunks exist',()=>{
 assert.equal(products.filter(p=>p.image).length,manifest.withImages);
 assert.equal(products.filter(p=>p.dimensions.inner!==undefined&&p.dimensions.outer!==undefined).length,manifest.withBothDiameters);
 for(const p of products){
  if(p.image){assert.ok(['product','series','category'].includes(p.imageKind));assert.ok(p.image.startsWith('/catalog/images/'));assert.ok(existsSync(new URL('../public'+p.image,import.meta.url)));}
  if(p.imageKind==='category')assert.ok(p.imageReferenceUrl?.startsWith('https://'));
  if(p.detailChunk!=null){const path=new URL(`../public/catalog/details-${p.detailChunk}.json`,import.meta.url);assert.ok(existsSync(path));}
 }
 const sample=products.find(p=>p.detailChunk!=null);
 const chunk=JSON.parse(readFileSync(new URL(`../public/catalog/details-${sample.detailChunk}.json`,import.meta.url)));
 assert.ok(chunk[sample.id].specs.length>0);
});
test('every product has a displayed image and representative images remain explicitly identified',()=>{
 assert.ok(products.every(p=>p.image));
 const kinds={};for(const p of products)kinds[p.imageKind]=(kinds[p.imageKind]||0)+1;
 assert.deepEqual(kinds,manifest.imageKinds);
 assert.equal((kinds.product||0)+(kinds.series||0),manifest.withSourceImages);
 assert.equal(kinds.category||0,manifest.withoutSourceImages);
});
test('manufacturer exact-code measurements and verified code aliases are usable',()=>{
 const skf=products.find(p=>p.brand==='SKF'&&p.code==='6204');assert.ok(skf);
 assert.deepEqual(skf.dimensions,{inner:20,outer:47,width:14});
 assert.ok(skf.image&&skf.imageKind==='product');assert.ok(skf.detailChunk!=null);
 const alias=products.find(p=>p.brand==='SKF'&&p.code==='6001 2RSH C3');assert.ok(alias);
 assert.ok(alias.codeAliases.includes('6001-2RSH/C3'));
 assert.ok(matchesProductCode(alias,'SKF6001-2RSH/C3'));
 assert.ok(matchesTextQuery(alias,'SKF6001-2RSH/C3'));
});
test('every imported product can be found by its own code, including compact input',()=>{
 for(const p of products){
  assert.ok(matchesProductCode(p,p.code),p.code);
  assert.ok(matchesProductCode(p,p.code.replace(/[\s-]+/g,'')),p.code);
  assert.ok(matchesTextQuery(p,p.code.replace(/[\s-]+/g,'')),p.code);
 }
});
test('inner + outer diameter search matches the actual catalog values together',()=>{
 for(const p of products){
  const {inner,outer}=p.dimensions;
  if(inner===undefined||outer===undefined)continue;
  assert.ok(matchesTechnicalQuery(p,{inner,outer}),p.code);
  assert.equal(matchesTechnicalQuery(p,{inner,outer:outer+0.01}),false,p.code);
 }
});
