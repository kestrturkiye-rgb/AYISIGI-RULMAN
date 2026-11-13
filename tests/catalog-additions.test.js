import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {mergeCatalog,mergeManifest} from '../src/catalog-merge.js';
import {decodeCatalog} from '../src/catalog-decode.js';
import {productGroups} from '../src/catalog-groups.js';
import {matchesProductCode,matchesTextQuery,matchesTechnicalQuery} from '../src/technical-search.js';
import {createQuoteText} from '../src/quote.js';
const read=path=>JSON.parse(fs.readFileSync(new URL(path,import.meta.url)));
const baselineBytes=fs.readFileSync(new URL('../public/catalog/index.json',import.meta.url));
const base=JSON.parse(baselineBytes),extra=read('../public/catalog/additions.json');
const report=read('../docs/catalog-expansion/result.json'),snapshot=read('../docs/catalog-expansion/reviewed-input.json');
const merged=mergeCatalog(base,extra),products=decodeCatalog(merged,'/AYISIGI-RULMAN/',{sourceLinks:false});
const added=products.slice(base.rows.length);

test('the 109417 original IDs, dictionary indices, catalog bytes and order are preserved',()=>{
 assert.equal(createHash('sha256').update(baselineBytes).digest('hex'),snapshot.baselineSha256);
 assert.equal(base.rows.length,109417);assert.deepEqual(merged.rows.slice(0,base.rows.length),base.rows);
 for(const key of ['brands','categories','urls'])assert.deepEqual(merged[key].slice(0,base[key].length),base[key]);
 assert.equal(products.length,report.totalProducts);assert.equal(added.length,report.addedProducts);assert.equal(new Set(products.map(p=>p.id)).size,products.length);
});
test('each reviewed candidate has one stable record and unresolved input remains excluded',()=>{
 assert.equal(report.heldCandidates.length,2);assert.equal(report.unresolvedComparisonRows,258);
 assert.equal(new Set(extra.rows.map(r=>r[0])).size,snapshot.records.length-report.heldCandidates.length-report.resolvedCrossSourceDuplicates.length);
 const observed=new Set(report.products.flatMap(p=>p.inputSourceIdentities.map(([source,parent,variant])=>`${source}|${parent}|${variant}`)));
 for(const r of snapshot.records){const held=report.heldCandidates.some(x=>x.source===r.source&&x.code===r.seller_code);assert.equal(observed.has(`${r.source}|${r.parent_id}|${r.variant_id}`),!held)}
 assert.throws(()=>mergeCatalog(merged,extra),/Tekrarlanan/);
});
test('added dictionary references and source mappings resolve to the reviewed values',()=>{
 const byId=new Map(report.products.map(p=>[p.id,p]));
 for(const p of added){const source=byId.get(p.id);assert.equal(p.brand,source.brand);assert.equal(p.category,source.category);assert.equal(p.name,source.name);assert.equal(p.code,source.code);assert.ok(p.referenceCode);assert.equal(p.sources.length,0)}
 const linked=decodeCatalog(merged).slice(base.rows.length);for(const p of linked)assert.ok(p.sources.every(s=>s.name&&s.url.startsWith('https://')));
});
test('all five new category routes contain products and every added category belongs to exactly one group',()=>{
 for(const id of report.newGroups){const g=productGroups.find(g=>g.id===id);assert.ok(g,id);assert.ok(added.some(p=>g.categories.includes(p.category)),id)}
 assert.equal(report.newGroups.length,5);
 for(const p of added)assert.equal(productGroups.filter(g=>g.categories.includes(p.category)).length,1,p.category);
 const burr=added.find(p=>p.name.includes('ELMAS KALIPÇI FREZE'));assert.equal(burr.category,'Çapak alma frezeleri');
 for(const p of added.filter(p=>p.brand==='BORDIGNON'))assert.equal(p.category,'Kalıp yayları');
});
test('new products retain full code and variant searches without fabricated bearing dimensions',()=>{
 for(const p of added){assert.ok(matchesProductCode(p,p.code),p.code);assert.ok(matchesTextQuery(p,p.code.replace(/[\s-]+/g,'')),p.code);assert.deepEqual(p.dimensions,{});assert.equal(matchesTechnicalQuery(p,{inner:20,outer:47}),false)}
 assert.equal(products.filter(p=>matchesTechnicalQuery(p,{inner:20,outer:47})).length,331);
 const springs=added.filter(p=>p.brand==='BORDIGNON');assert.equal(springs.length,221);assert.equal(new Set(springs.map(p=>p.id)).size,221);
});
test('commercial claims, borrowed prices, stock and unverified images are not published',()=>{
 for(const row of extra.rows){assert.equal(row[6],null);assert.equal(row[10],null);assert.equal(row[13].imageStatus,'pending');assert.ok(!/\bor[iı]?jinal\b|\borjinal\b/i.test(row[5]));assert.ok(!('price'in row[13]));assert.ok(!('stock'in row[13]))}
 for(const p of added){assert.equal(p.image,null);assert.equal(p.imageStatus,'pending');assert.equal(p.imageKind,null)}
});
test('lazy added detail files have the right IDs and useful, noncommercial properties',()=>{
 for(const row of extra.rows){const chunk=read(`../public/catalog/details-${row[9]}.json`);assert.ok(chunk[row[0]]);for(const [name,value]of chunk[row[0]].specs){assert.ok(name&&value);assert.doesNotMatch(name,/fiyat|stok|kargo|garanti|taksit/i)}}
 assert.ok(report.details.specifications>0);
});
test('runtime counts reconcile with all baseline and added inventory',()=>{
 const manifest=mergeManifest(read('../public/catalog/manifest.json'),merged.additionManifest);
 assert.equal(manifest.totalProducts,products.length);assert.equal(manifest.pendingPhotos,added.length);assert.equal(manifest.withImages,products.filter(p=>p.image).length);
 const counts={};for(const p of decodeCatalog(merged))for(const key of new Set(p.sources.map(s=>s.key)))counts[key]=(counts[key]||0)+1;assert.deepEqual(manifest.sourceCounts,counts);
});
test('quote messages identify new reference-code products by their actual model and option',()=>{
 const p=added.find(p=>p.variantName);const result=createQuoteText([{...p,qty:2}]);assert.ok(result.includes(p.name));assert.ok(result.includes(p.code));assert.match(result,/2 adet/);
});
test('invalid supplemental dictionaries, counts and repeated IDs fail instead of silently dropping new products',()=>{
 assert.throws(()=>mergeCatalog(base,{...extra,manifest:{totalProducts:0}}),/sayımı/);
 const repeated=[...extra.rows[0]];repeated[0]=base.rows[0][0];assert.throws(()=>mergeCatalog(base,{...extra,rows:[repeated]}),/Tekrarlanan/);
 const broken=extra.rows.map(r=>[...r]);broken[0][2]=999999;assert.throws(()=>mergeCatalog(base,{...extra,rows:broken}),/sınıflandırması/);
});

test('conflicting source titles and reused barcodes cannot create misleading product identities',()=>{
 const held=report.heldCandidates.find(x=>x.code==='16ER 19 W ECT');assert.ok(held);assert.ok(!added.some(p=>p.brand==='EKSCUT'&&p.code==='16ER 19 W ECT'));assert.ok(added.some(p=>p.brand==='EKSCUT'&&p.code==='16ER 3 TR ECT'));
 for(const code of report.suppressedDuplicateBarcodes)assert.ok(added.every(p=>!p.codeAliases.includes(code)));
});

test('manually reviewed name identities use internal RT references and manufacturer codes remain empty',()=>{
 const internal=added.filter(p=>p.code.startsWith('RT-'));assert.ok(internal.length>750);for(const p of internal){assert.ok(p.name.length>=16);assert.ok(p.referenceCode);assert.equal(p.manufacturerCode,null)}
 const drills=added.filter(p=>p.brand==='Bosch'&&/GSB\s*13\s*RE/i.test(p.name));assert.equal(drills.length,1);assert.ok(matchesTextQuery(drills[0],'BoschGSB13RE'));assert.ok(report.resolvedCrossSourceDuplicates.length>0);
 assert.ok(!added.some(p=>p.code==='TG-RLMN485'));
});

test('compressed supplemental catalog is byte-equivalent after decompression',()=>{
 const plain=fs.readFileSync(new URL('../public/catalog/additions.json',import.meta.url));const zipped=fs.readFileSync(new URL('../public/catalog/additions.json.gz',import.meta.url));assert.deepEqual(gunzipSync(zipped),plain);assert.ok(zipped.length<plain.length/2);
});
