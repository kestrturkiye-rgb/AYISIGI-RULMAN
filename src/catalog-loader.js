import {publicAssetPath} from './catalog-utils.js';
import {readIndex} from './catalog-fetch.js';
import {catalogStats} from './catalog-stats.js';
import {mergeManifest} from './catalog-merge.js';

async function readManifest(){const response=await fetch(publicAssetPath('catalog/manifest.json'));if(!response.ok)throw Error('Katalog yüklenemedi.');return response.json()}
async function loadOnMainThread(){const [{decodeCatalog},data,manifest]=await Promise.all([import('./catalog-decode.js'),readIndex(),readManifest()]);const products=decodeCatalog(data,undefined,{sourceLinks:false});return {products,manifest:mergeManifest(manifest,data.additionManifest),productIndex:new Map(products.map(p=>[p.id,p])),stats:catalogStats(products)}}
function loadInWorker(){
 return new Promise((resolve,reject)=>{
  const worker=new Worker(new URL('./catalog.worker.js',import.meta.url),{type:'module'});
  const timer=setTimeout(()=>{worker.terminate();reject(Error('Katalog yükleme süresi aşıldı.'))},60000);
  const finish=callback=>value=>{clearTimeout(timer);worker.terminate();callback(value)};
  worker.onmessage=finish(event=>event.data.error?reject(Error(event.data.error)):resolve(event.data));
  worker.onerror=finish(()=>reject(Error('Katalog hazırlanamadı.')));
 });
}
let catalogPromise;
export function loadCatalog(){
 if(!catalogPromise)catalogPromise=(typeof Worker==='undefined'?loadOnMainThread():loadInWorker().catch(loadOnMainThread))
  .catch(error=>{catalogPromise=undefined;throw error});
 return catalogPromise;
}
const detailsCache=new Map();
export async function loadProductDetails(product){
 if(product.detailChunk==null)return {specs:[],warning:null};
 const key=product.detailChunk;
 if(detailsCache.has(key)){const cached=detailsCache.get(key);detailsCache.delete(key);detailsCache.set(key,cached)}
 else if(detailsCache.size>=8)detailsCache.delete(detailsCache.keys().next().value);
 if(!detailsCache.has(key))detailsCache.set(key,fetch(publicAssetPath(`catalog/details-${key}.json`)).then(r=>{if(!r.ok)throw new Error('Teknik bilgiler yüklenemedi.');return r.json()}).catch(error=>{detailsCache.delete(key);throw error}));
 const data=await detailsCache.get(key);return data[product.id]||{specs:[],warning:null};
}
