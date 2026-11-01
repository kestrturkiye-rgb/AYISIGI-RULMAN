import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import {decodeCatalog,publicAssetPath} from '../src/catalog-data.js';
const root=path.resolve(import.meta.dirname,'..');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'public/catalog/index.json')));
const report=JSON.parse(fs.readFileSync(path.join(root,'docs/product-image-cleanup-report.json')));
const mapping=JSON.parse(fs.readFileSync(path.join(root,'src/product-image-map.json')));
const originalFiles=new Set(catalog.rows.map(row=>path.basename(row[6])));

test('every catalog image has a completed cleanup decision; no review failures remain',()=>{
 assert.equal(report.totalProducts,catalog.rows.length);
 assert.equal(report.totalImages,originalFiles.size);
 assert.equal(report.images.length,originalFiles.size);
 assert.equal(new Set(report.images.map(item=>item.file)).size,originalFiles.size);
 for(const item of report.images){assert.ok(originalFiles.has(item.file));assert.ok(['cleaned','previously_edited','verified_clean'].includes(item.action),`${item.file}: ${item.action}`);assert.equal(item.processor,report.processor)}
 assert.equal(report.images.reduce((sum,item)=>sum+item.records,0),catalog.rows.length);
});
test('all original product photographs remain byte-for-byte intact',()=>{
 for(const item of report.images){const bytes=fs.readFileSync(path.join(root,'public/catalog/images',item.file));assert.equal(createHash('sha256').update(bytes).digest('hex'),item.inputSha256,item.file)}
});
test('all display overrides point to complete local WebP files',()=>{
 const edited=report.images.filter(item=>item.output);
 assert.equal(Object.keys(mapping).length,edited.length);
 for(const item of edited){assert.equal(mapping[item.file],item.output);assert.ok(!item.output.includes('..'));assert.ok(item.output.startsWith('catalog/clean-images/')||item.output.startsWith('catalog/edited-images/'));const filename=path.join(root,'public',item.output);const bytes=fs.readFileSync(filename);assert.ok(bytes.length>100,filename);assert.equal(bytes.subarray(0,4).toString(),'RIFF');assert.equal(bytes.subarray(8,12).toString(),'WEBP');if(item.outputSha256)assert.equal(createHash('sha256').update(bytes).digest('hex'),item.outputSha256,item.file)}
});
test('diagonal overlay restoration leaves pixels outside its mask unchanged',()=>{
 for(const item of report.images.filter(item=>item.kind==='diagonal'&&item.action==='cleaned')){assert.equal(item.unchangedOutsideMask,true,item.file);assert.ok(item.watermarkPixels>0)}
});

// Cover every distinct asset at both URL bases without repeating shared photos.
test('catalog models use the audited display URL for every image at both base paths',()=>{
 const representativeRows=[...new Map(catalog.rows.map(row=>[row[6],row])).values()];
 const decisions=new Map(report.images.map(item=>[item.file,item]));
 for(const base of ['/','/AYISIGI-RULMAN/']){
  const products=decodeCatalog({...catalog,rows:representativeRows},base);
  for(let i=0;i<representativeRows.length;i++){
   const original=representativeRows[i][6];const decision=decisions.get(path.basename(original));
   const auditedPath=decision.output||original;
   assert.equal(products[i].image,publicAssetPath(auditedPath,base),products[i].code);
  }
 }
});
