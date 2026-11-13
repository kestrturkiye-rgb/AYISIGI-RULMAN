import { normalizeCode } from './technical-search.js';
import displayImages from './product-image-map.json' with { type: 'json' };

import {appBase, publicAssetPath, sourceNames, formatDimensions} from './catalog-utils.js';
export {publicAssetPath, sourceNames, formatCount, formatDimensions} from './catalog-utils.js';

export function decodeCatalog(data, assetBase = appBase, {sourceLinks=true}={}) {
 if(data.schemaVersion!==1||!Array.isArray(data.rows))throw new Error('Katalog biçimi desteklenmiyor.');
 return data.rows.map(row=>{
  const [id,code,brandId,categoryId,measurements,title,image,refs,baseCode,detailChunk,imageKind,manufacturerCode,imageReference,extra={}]=row;
  const displayImage=image?(displayImages[image.split('/').pop()]||image):null;
  const dimensions={};['inner','outer','width'].forEach((key,i)=>{if(measurements?.[i]!=null)dimensions[key]=measurements[i]});
  const category=data.categories[categoryId];const brand=data.brands[brandId];
  const sources=sourceLinks?refs.map(([key,urlId])=>({key,name:sourceNames[key],url:data.urls[urlId]})):[];
  return {id,code,brand,category,dimensions,name:title||category,image:displayImage?publicAssetPath(displayImage,assetBase):null,imageKind:imageKind||(image?'product':null),imageReferenceUrl:sourceLinks&&imageReference!=null?data.urls[imageReference]:null,sources,baseCode,detailChunk,manufacturerCode,codeAliases:[...new Set([...(manufacturerCode&&manufacturerCode!==code?[manufacturerCode]:[]),...(extra.additionalAliases||[])])],referenceCode:extra.codeKind==='reference',variantName:extra.variantName||'',imageStatus:extra.imageStatus||null,
   size:formatDimensions(dimensions),type:category==='Yataklı rulmanlar'?'housing':category==='Zincirler'?'chain':category.includes('Makaralı')?'roller':'steel',
   searchText:`${code} ${title||''} ${brand} ${category}`.toLocaleLowerCase('tr'),normalizedCode:normalizeCode(code),normalizedBrand:normalizeCode(brand),normalizedCodes:[...new Set([code,baseCode,manufacturerCode,...(extra.additionalAliases||[])].filter(Boolean).map(normalizeCode))]};
 });
}
