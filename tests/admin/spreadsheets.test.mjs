import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCsv,prepareSheet,readSheet} from '../../apps/admin/src/features/catalog/spreadsheets.ts';
const lookups={brands:[{id:'b',name:'SKF'}],categories:[{id:'c',name:'Bilyalı Rulmanlar'}]};
test('CSV preview handles Turkish headers, semicolon, decimal comma and preserves SKU zeroes',()=>{
 const rows=parseCsv('Ürün kodu;Ürün adı;Marka;Kategori;d;D;B;Durum\n0006204;Örnek rulman;SKF;Bilyalı Rulmanlar;20;47;14,5;taslak');
 const result=prepareSheet(rows,lookups,'new');assert.deepEqual(result.errors,[]);assert.equal(result.valid[0].fields.sku,'0006204');assert.equal(result.valid[0].fields.width_mm,14.5);assert.equal(result.valid[0].fields.category_id,'c');
});
test('preview rejects invalid dimensions and stale updates rather than changing the wrong product',()=>{
 assert.equal(prepareSheet([{sku:'X',name:'X',category_id:'c',inner_mm:'50',outer_mm:'20'}],lookups,'new').errors.length,1);
 assert.equal(prepareSheet([{sku:'X',name:'New'}],lookups,'update').errors.length,1);
 const r=prepareSheet([{id:'p',lock_version:'3',name:'New',inner_mm:''}],lookups,'update');assert.deepEqual(r.errors,[]);assert.equal('inner_mm' in r.valid[0].fields,false);
 assert.equal(prepareSheet([{id:'p',lock_version:'3'},{id:'p',lock_version:'3'}],lookups,'update').errors.length,1);
});
test('XLSX reader preserves string codes and refuses formulas',async()=>{
 const {default:Excel}=await import('exceljs');const book=new Excel.Workbook(),sheet=book.addWorksheet('Ürünler');sheet.addRow(['sku','name','category_id']);sheet.addRow(['0006204','Örnek','c']);
 const f=new File([await book.xlsx.writeBuffer()],'catalog.xlsx');const rows=await readSheet(f);assert.equal(rows[0].sku,'0006204');sheet.getCell('A2').value={formula:'1+1',result:2};
 const bytes=await book.xlsx.writeBuffer();await assert.rejects(()=>readSheet(new File([bytes],'bad.xlsx')),/formül/);
});
test('malformed CSV and oversized imports fail before database writes',()=>{
 assert.throws(()=>parseCsv('sku,name\na,b,c'),/CSV/);
 assert.throws(()=>parseCsv('sku\n'+Array(5001).fill('x').join('\n')),/5.000/);
});
