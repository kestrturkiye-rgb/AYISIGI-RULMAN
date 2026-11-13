import {catalogListSchema,lookupsSchema,mediaSchema,productSchema,taxonomySchema,type Product,type Taxonomy,type Media} from '@rt/contracts';
import {client,config} from '../../lib/config';
export function message(error:unknown):string{
 const e=error as {code?:string,message?:string};
 if((e?.code==='40001'||e?.code==='PT409'))return 'Bu kayıt başka bir kullanıcı tarafından değiştirildi. Kaydınızı kaybetmeden yeni bir sekmede güncel ürünü açıp karşılaştırın.';
 if(e?.code==='23505')return 'Bu adres adı (slug) veya ilişkili kod zaten kullanılıyor. Değiştirip tekrar deneyin.';
 if(e?.code==='42501')return 'Bu işlem için yetkiniz yok. Yetkinizi yenileyin veya yöneticinize başvurun.';
 if(e?.code==='23514'||e?.code==='23502')return 'Zorunlu alanları, ölçüleri ve özellik değerlerini kontrol edin.';
 if(e?.code==='P0002')return 'Kayıt bulunamadı. Listeyi yenileyin.';
 if(e?.code==='22023'||e?.code==='P0001')return e.message||'Veriyi kontrol edin.';
 return error instanceof Error?error.message:'İşlem tamamlanamadı. Bağlantınızı kontrol edip tekrar deneyin.';
}
export async function rpc(name:string,args:Record<string,unknown>={}){
 if(!client)throw Error('Supabase bağlantısı tanımlanmadı.');
 const {data,error}=await client.rpc(name,args);if(error)throw Object.assign(Error(message(error)),{code:error.code});return data;
}
export const loadLookups=async()=>lookupsSchema.parse(await rpc('admin_catalog_lookups'));
export const loadProducts=async(filters:Record<string,unknown>)=>catalogListSchema.parse(await rpc('admin_catalog_list',{p_filters:filters}));
export const loadProduct=async(id:string)=>productSchema.parse(await rpc('admin_product_detail',{p_id:id}));
export const saveProduct=async(p:Product)=>productSchema.parse(await rpc('admin_save_product',{p_id:p.id||null,p_version:p.lock_version||null,p_data:p}));
export const catalogAction=(kind:string,id:string,version:number,action:string)=>rpc('admin_catalog_action',{p_kind:kind,p_id:id,p_version:version,p_action:action});
export const saveTaxonomy=async(kind:string,p:Taxonomy)=>taxonomySchema.parse(await rpc('admin_save_taxonomy',{p_kind:kind,p_id:p.id||null,p_version:p.lock_version||null,p_data:p}));
export const reorderTaxonomy=(kind:string,items:{id:string,version:number,order:number}[])=>rpc('admin_reorder_taxonomy',{p_kind:kind,p_items:items});
export const draft=(id:string,payload?:unknown,clear=false)=>rpc('admin_product_draft',{p_id:id,p_payload:payload??null,p_clear:clear});
async function mediaRequest(body:FormData|Record<string,unknown>){
 if(!client)throw Error('Bağlantı yok.');
 const {data:{session}}=await client.auth.getSession();if(!session)throw Error('Oturumunuz sona erdi.');
 const headers:Record<string,string>={Authorization:`Bearer ${session.access_token}`,apikey:config.key!};
 if(!(body instanceof FormData))headers['Content-Type']='application/json';
 const res=await fetch(`${config.url}/functions/v1/rt-catalog-media`,{method:'POST',headers,body:body instanceof FormData?body:JSON.stringify(body),signal:AbortSignal.timeout(90000)});
 const data=await res.json().catch(()=>({error:'Medya hizmeti yanıt vermedi.'}));if(!res.ok)throw Error(data.error||'Dosya işlenemedi.');return data;
}
export async function uploadMedia(file:File):Promise<Media>{
 if(!['image/jpeg','image/png','image/webp','application/pdf'].includes(file.type))throw Error('JPEG, PNG, WebP veya PDF seçin.');
 if(file.size>10*1024*1024)throw Error('Dosya en fazla 10 MB olabilir.');
 const form=new FormData();form.set('file',file);const a=await mediaRequest(form);return mediaSchema.parse({media_id:a.id,...a,alt_text:'',is_primary:false});
}
export async function publishMedia(media:Media[]){
 const ids=media.filter(m=>m.status!=='published').map(m=>m.media_id);if(!ids.length)return media;
 const data=await mediaRequest({action:'publish',ids});const records=mediaSchema.array().parse(data.items);
 return media.map(m=>{const record=records.find(r=>r.media_id===m.media_id);return record?{...record,alt_text:m.alt_text,is_primary:m.is_primary}:m;});
}
export async function mediaUrl(m:Pick<Media,'bucket_id'|'object_path'|'external_url'>){
 if(m.external_url&&/^https:\/\/kestrturkiye-rgb\.github\.io\/AYISIGI-RULMAN\//.test(m.external_url))return m.external_url;
 if(!client)return '';
 if(m.bucket_id==='media-published')return client.storage.from(m.bucket_id).getPublicUrl(m.object_path).data.publicUrl;
 const {data,error}=await client.storage.from(m.bucket_id).createSignedUrl(m.object_path,300);if(error)throw Error('Dosya önizlemesi alınamadı.');return data.signedUrl;
}
