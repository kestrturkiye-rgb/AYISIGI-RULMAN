import {publicAssetPath} from './catalog-utils.js';
export async function readIndex(){
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
