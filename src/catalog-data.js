import { normalizeCode } from './technical-search.js';

const appBase = import.meta.env?.BASE_URL || '/';
export function publicAssetPath(path, base = appBase) {
 return `${base.endsWith('/') ? base : base + '/'}${path.replace(/^\/+/, '')}`;
}

export const sourceNames = { skf: 'SKF', sts: 'STS Rulman', rt: 'Rulman Toptancısı' };
export const formatCount = value => value.toLocaleString('tr-TR');
export function formatDimensions(dimensions) {
 const format=n=>n.toLocaleString('tr-TR',{maximumFractionDigits:4});
 const {inner,outer,width}=dimensions;
 if(inner!==undefined&&outer!==undefined&&width!==undefined)return `${format(inner)} × ${format(outer)} × ${format(width)} mm`;
 const parts=[inner!==undefined&&`İç: ${format(inner)}`,outer!==undefined&&`Dış: ${format(outer)}`,width!==undefined&&`En: ${format(width)}`].filter(Boolean);
 return parts.length?`${parts.join(' · ')} mm`:'Ölçü bilgisi kaynaktan doğrulanmalı';
}
export function decodeCatalog(data, assetBase = appBase) {
 if(data.schemaVersion!==1||!Array.isArray(data.rows))throw new Error('Katalog biçimi desteklenmiyor.');
 return data.rows.map(row=>{
  const [id,code,brandId,categoryId,measurements,title,image,refs,baseCode,detailChunk,imageKind,manufacturerCode,imageReference]=row;
  const dimensions={};['inner','outer','width'].forEach((key,i)=>{if(measurements?.[i]!=null)dimensions[key]=measurements[i]});
  const category=data.categories[categoryId];const brand=data.brands[brandId];
  const sources=refs.map(([key,urlId])=>({key,name:sourceNames[key],url:data.urls[urlId]}));
  return {id,code,brand,category,dimensions,name:title||category,image:image?publicAssetPath(image,assetBase):null,imageKind:imageKind||(image?'product':null),imageReferenceUrl:imageReference!=null?data.urls[imageReference]:null,sources,baseCode,detailChunk,manufacturerCode,codeAliases:manufacturerCode&&manufacturerCode!==code?[manufacturerCode]:[],
   size:formatDimensions(dimensions),type:category==='Yataklı rulmanlar'?'housing':category==='Zincirler'?'chain':category.includes('Makaralı')?'roller':'steel',
   searchText:`${code} ${title||''} ${brand} ${category}`.toLocaleLowerCase('tr'),normalizedCode:normalizeCode(code),normalizedBrand:normalizeCode(brand)};
 });
}
let catalogPromise;
async function readIndex(){
 if(typeof DecompressionStream!=='undefined'){
  try{
   const response=await fetch(publicAssetPath('catalog/index.json.gz'));
   if(!response.ok)throw new Error('Sıkıştırılmış katalog bulunamadı.');
   // Browsers already decode when the server supplies Content-Encoding.
   if(response.headers.get('content-encoding')?.includes('gzip'))return await response.json();
   return await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).json();
  }catch{ /* Older hosts/browsers can use the identical plain JSON. */ }
 }
 const response=await fetch(publicAssetPath('catalog/index.json'));if(!response.ok)throw new Error('Katalog yüklenemedi.');return response.json();
}
export function loadCatalog(){
 if(!catalogPromise)catalogPromise=Promise.all([readIndex(),fetch(publicAssetPath('catalog/manifest.json')).then(r=>{if(!r.ok)throw new Error('Katalog yüklenemedi.');return r.json()})])
  .then(([data,manifest])=>({products:decodeCatalog(data),manifest})).catch(error=>{catalogPromise=undefined;throw error});
 return catalogPromise;
}
const detailsCache=new Map();
export async function loadProductDetails(product){
 if(product.detailChunk==null)return {specs:[],warning:null};
 const key=product.detailChunk;
 if(!detailsCache.has(key))detailsCache.set(key,fetch(publicAssetPath(`catalog/details-${key}.json`)).then(r=>{if(!r.ok)throw new Error('Teknik bilgiler yüklenemedi.');return r.json()}).catch(error=>{detailsCache.delete(key);throw error}));
 const data=await detailsCache.get(key);return data[product.id]||{specs:[],warning:null};
}
