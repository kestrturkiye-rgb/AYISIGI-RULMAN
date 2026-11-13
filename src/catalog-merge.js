// The original catalog and its audited photographs remain an immutable baseline.
export function mergeCatalog(base, additions){
 if(base.schemaVersion!==1||additions.schemaVersion!==1||!Array.isArray(base.rows)||!Array.isArray(additions.rows))throw Error('Katalog biçimi desteklenmiyor.');
 const dictionaries={};const maps={};
 for(const key of ['brands','categories','urls']){
  if(!Array.isArray(base[key])||!Array.isArray(additions[key]))throw Error('Katalog sözlüğü geçersiz.');
  dictionaries[key]=[...base[key]];const ids=new Map(base[key].map((v,i)=>[v,i]));
  maps[key]=additions[key].map(value=>{if(!ids.has(value)){ids.set(value,dictionaries[key].length);dictionaries[key].push(value)}return ids.get(value)});
 }
 const ids=new Set(base.rows.map(row=>row[0]));
 const extra=additions.rows.map(row=>{
  if(ids.has(row[0]))throw Error('Tekrarlanan ürün kimliği.');ids.add(row[0]);
  if(maps.brands[row[2]]===undefined||maps.categories[row[3]]===undefined)throw Error('Ürün sınıflandırması geçersiz.');
  const refs=row[7].map(([key,index])=>{if(maps.urls[index]===undefined)throw Error('Ürün referansı geçersiz.');return [key,maps.urls[index]]});
  const result=[...row];result[2]=maps.brands[row[2]];result[3]=maps.categories[row[3]];result[7]=refs;
  if(row[12]!=null){if(maps.urls[row[12]]===undefined)throw Error('Görsel referansı geçersiz.');result[12]=maps.urls[row[12]]}
  return result;
 });
 if(additions.manifest?.totalProducts!==extra.length)throw Error('Ek katalog sayımı uyuşmuyor.');
 return {...base,...dictionaries,rows:[...base.rows,...extra],additionManifest:additions.manifest};
}
export function mergeManifest(base,addition){
 if(!addition)return base;
 const result={...base,additionRevision:'catalog-expansion-2026-11-09-v1'};
 for(const key of ['totalProducts','withDimensions','withBothDiameters','withImages','withSourceImages','withoutSourceImages','detailChunks','pendingPhotos'])result[key]=(base[key]||0)+(addition[key]||0);
 for(const key of ['sourceCounts','imageKinds']){
  result[key]={...base[key]};for(const [name,count]of Object.entries(addition[key]||{}))result[key][name]=(result[key][name]||0)+count;
 }
 return result;
}
