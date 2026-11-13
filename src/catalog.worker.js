import {decodeCatalog} from './catalog-decode.js';
import {readIndex} from './catalog-fetch.js';
import {publicAssetPath} from './catalog-utils.js';
import {catalogStats} from './catalog-stats.js';
import {mergeManifest} from './catalog-merge.js';

Promise.all([readIndex(),fetch(publicAssetPath('catalog/manifest.json')).then(response=>{
 if(!response.ok)throw Error('Katalog yüklenemedi.');return response.json();
})]).then(([data,manifest])=>{
 const products=decodeCatalog(data,undefined,{sourceLinks:false});
 self.postMessage({products,manifest:mergeManifest(manifest,data.additionManifest),stats:catalogStats(products)});
}).catch(()=>self.postMessage({error:'Ürün kataloğu yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.'}));
