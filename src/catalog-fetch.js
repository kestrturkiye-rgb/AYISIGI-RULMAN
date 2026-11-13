import {publicAssetPath} from './catalog-utils.js';
import {mergeCatalog} from './catalog-merge.js';
async function readCatalogFile(name){
 if(typeof DecompressionStream!=='undefined'){
  try{
   const response=await fetch(publicAssetPath(`catalog/${name}.json.gz`));
   if(!response.ok)throw new Error('Sıkıştırılmış katalog bulunamadı.');
   // Browsers already decode when the server supplies Content-Encoding.
   if(response.headers.get('content-encoding')?.includes('gzip'))return await response.json();
   return await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).json();
  }catch{ /* Older hosts/browsers can use the identical plain JSON. */ }
 }
 const response=await fetch(publicAssetPath(`catalog/${name}.json`));if(!response.ok)throw new Error('Katalog yüklenemedi.');return response.json();
}

export async function readIndex(){
 const [base,additions]=await Promise.all([readCatalogFile('index'),readCatalogFile('additions')]);
 return mergeCatalog(base,additions);
}
