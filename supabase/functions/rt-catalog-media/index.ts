import {createClient} from 'npm:@supabase/supabase-js@2.118.0';
import * as magick from 'npm:@imagemagick/magick-wasm@0.0.35';
import {processFile,validatePdf} from './processor.mjs';
import {brotliDecompressSync} from 'node:zlib';
import {PDFDocument} from 'npm:pdf-lib@1.17.1';
const allowed=new Set(['https://rulman-teklif-admin.vercel.app','https://kestrturkiye-rgb.github.io','http://localhost:4180','http://127.0.0.1:4180']);
const project=Deno.env.get('SUPABASE_URL')!;
const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!; // provider-injected server secret, never sent to the browser
const service=createClient(project,key,{auth:{persistSession:false,autoRefreshToken:false}});
let initialized:Promise<void>|undefined;
function check<T>(result:{data:T|null,error:unknown}):T{if(result.error||result.data===null)throw Error('Depolama işlemi tamamlanamadı. Tekrar deneyin.');return result.data;}
async function boundedBody(request:Request,max:number){
 if(Number(request.headers.get('content-length')||0)>max)throw Error('İstek boyutu sınırı aşıldı.');
 const reader=request.body?.getReader();if(!reader)throw Error('Dosya veya istek gövdesi gerekli.');
 const chunks:Uint8Array[]=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw Error('İstek boyutu sınırı aşıldı.');}chunks.push(value);}
 const raw=new Uint8Array(size);let offset=0;for(const chunk of chunks){raw.set(chunk,offset);offset+=chunk.length;}return raw;
}
async function digest(bytes:ArrayBuffer|Uint8Array){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes as BufferSource))).map(b=>b.toString(16).padStart(2,'0')).join('');}
Deno.serve(async request=>{
 const origin=request.headers.get('origin');
 const headers={'Access-Control-Allow-Origin':origin&&allowed.has(origin)?origin:'https://rulman-teklif-admin.vercel.app','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin','Cache-Control':'no-store'};
 const reply=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{...headers,'Content-Type':'application/json'}});
 if(origin&&!allowed.has(origin))return reply({error:'Bu kaynağa izin verilmiyor.'},403);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(request.method!=='POST')return reply({error:'Yalnızca POST kullanılabilir.'},405);
 const authorization=request.headers.get('authorization')||'';
 if(!/^Bearer \S+$/.test(authorization))return reply({error:'Giriş gerekli.'},401);
 const {data:{user},error}=await service.auth.getUser(authorization.slice(7));
 if(error||!user)return reply({error:'Oturum geçersiz.'},401);
 const caller=createClient(project,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}});
 const access=await caller.rpc('get_staff_access');
 if(access.error||!['admin','editor'].includes(access.data?.[0]?.role))return reply({error:'Katalog yönetim yetkiniz yok.'},403);
 try{
  check(await caller.rpc('admin_media_rate_limit'));
  if(request.headers.get('content-type')?.includes('application/json')){
   const text=new TextDecoder().decode(await boundedBody(request,8192));
   const body=JSON.parse(text);
   if(body.action!=='publish'||!Array.isArray(body.ids)||body.ids.length>30||body.ids.some((id:unknown)=>typeof id!=='string'||id.length>160))return reply({error:'Geçersiz yayınlama isteği.'},400);
   const items=[];
   for(const id of [...new Set<string>(body.ids)]){
    const asset=check<{id:string,status:string,object_path:string,sha256:string,mime_type:string}>(await service.from('media_assets').select('*').eq('id',id).is('deleted_at',null).single());
    if(asset.status!=='published'){
     // Only normalized derivatives are copied. Originals stay private forever.
     if(!asset.object_path.endsWith('/display.webp')&&!asset.object_path.endsWith('/document.pdf'))throw Error('İşlenmemiş dosya yayınlanamaz.');
     const file=check(await service.storage.from('media-originals').download(asset.object_path));
     if(await digest(await file.arrayBuffer())!==asset.sha256)throw Error('Dosya bütünlüğü doğrulanamadı.');
     const uploaded=await service.storage.from('media-published').upload(asset.object_path,file,{contentType:asset.mime_type,upsert:false,cacheControl:'31536000'});
     if(uploaded.error&&uploaded.error.message!=='The resource already exists')throw Error('Dosya yayınlanamadı.');
     const finalized=await service.rpc('publish_catalog_media',{p_actor:user.id,p_id:id});
     if(finalized.error){if(!uploaded.error){const latest=await service.from('media_assets').select('status').eq('id',id).single();if(!latest.error&&latest.data.status!=='published')await service.storage.from('media-published').remove([asset.object_path]);}throw Error('Medya yetkisi değişti. Yeniden giriş yapın.');}
     Object.assign(asset,finalized.data);
    }
    items.push({...asset,media_id:asset.id,is_primary:false});
   }
   return reply({items});
  }
  const raw=await boundedBody(request,10*1024*1024+65536);
  const form=await new Request(request.url,{method:'POST',headers:{'Content-Type':request.headers.get('content-type')||''},body:raw}).formData();
  const file=form.get('file');if(!(file instanceof File))throw Error('Dosya seçin.');
  initialized??=(async()=>{const packed=await Deno.readFile(new URL('./magick.wasm.br',import.meta.url));await magick.initializeImageMagick(brotliDecompressSync(packed));})();
  await initialized;
  const original=new Uint8Array(await file.arrayBuffer());const processed=processFile(original,magick);
  if(processed.mime_type==='application/pdf')await validatePdf(original,PDFDocument);
  const id=crypto.randomUUID(),prefix=`${user.id}/${id}`,path=`${prefix}/${processed.extension==='pdf'?'document.pdf':'display.webp'}`;
  // Original cannot be published through the function and has no public metadata.
  check(await service.storage.from('media-originals').upload(`${prefix}/original`,original,{contentType:processed.extension==='pdf'?'application/pdf':file.type,upsert:false}));
  try{
   check(await service.storage.from('media-originals').upload(path,processed.bytes,{contentType:processed.mime_type,upsert:false}));
   const sha256=await digest(processed.bytes);
   const result=check(await service.rpc('register_catalog_media',{p_actor:user.id,p_data:{id,object_path:path,mime_type:processed.mime_type,size_bytes:processed.bytes.length,width:processed.width,height:processed.height,sha256}}));
   return reply(result,201);
  }catch(e){await service.storage.from('media-originals').remove([path,`${prefix}/original`]);throw e;}
 }catch(e){console.error('catalog_media_failure',e instanceof Error?e.name:'unknown');return reply({error:e instanceof Error?e.message:'Dosya işlenemedi.'},400);}
});
