import {formatDimensions} from '../catalog-utils.js';
import {legacyCartCodes} from '../cart.js';
import {normalizeCode} from '../technical-search.js';
export function dataMode(env={}){const mode=env.VITE_DATA_SOURCE||'static';if(!['static','supabase'].includes(mode))throw Error('VITE_DATA_SOURCE static veya supabase olmalı.');return mode}
export function safeLink(value,fallback='#/'){
 if(typeof value!=='string')return fallback;
 if(/^#\/[a-z0-9/?&=%._+\-]*$/i.test(value)||/^(https:\/\/|mailto:|tel:)/i.test(value))return value;
 return fallback;
}
export function mediaUrl(media,projectUrl){
 if(media?.url&&/^https:\/\/kestrturkiye-rgb\.github\.io\/AYISIGI-RULMAN\//.test(media.url))return media.url;
 if(!media||media.bucket!=='media-published'||typeof media.path!=='string'||media.path.split('/').includes('..'))return null;
 return `${projectUrl}/storage/v1/object/public/media-published/${media.path.split('/').map(encodeURIComponent).join('/')}`;
}
export function adaptMedia(media,url){
 const src=mediaUrl(media,url);if(!src)return null;
 const variant=label=>media.variants?.[label]?.path?mediaUrl({...media,path:media.variants[label].path},url):null;
 return {src,small:variant('320')||src,full:variant('full')||src,alt:media.alt||''};
}
export function adaptProduct(row,url){
 const dimensions={};for(const [field,key] of [['inner_mm','inner'],['outer_mm','outer'],['width_mm','width']])if(row[field]!=null)dimensions[key]=Number(row[field]);
 const image=adaptMedia(row.media,url);
 return {id:row.id,code:row.sku,name:row.name,slug:row.slug,brand:row.brand||'Belirtilmemiş',brandId:row.brand_id,category:row.category,categoryId:row.category_id,
  dimensions,size:formatDimensions(dimensions),image:image?.src||null,remoteImage:image,imageKind:row.image_kind||'product',sources:[],
  baseCode:row.base_code,manufacturerCode:row.manufacturer_code,codeAliases:row.manufacturer_code?[row.manufacturer_code]:[],normalizedCode:normalizeCode(row.sku),
  imageStatus:!image&&row.is_new?'pending':null,stockStatus:row.stock_status,priceMode:row.price_mode,price:row.price||null,remote:true,
  specs:row.specifications?.map(s=>[s.name,[s.value,s.unit].filter(v=>v!==null&&v!==undefined&&v!=='').join(' ')]),warning:row.technical_warning||null,longDescription:row.long_description,origin:row.origin,
  gallery:row.gallery?.map(media=>adaptMedia(media,url)).filter(Boolean)};
}
export function adaptSite(raw,media,url){
 const settings=raw.settings||{};const records=raw.categories||[];const roots=records.filter(c=>!c.parent_id);
 function children(id,path=[]){if(path.includes(id)||path.length>32)return [];return records.filter(c=>c.parent_id===id).flatMap(c=>[c,...children(c.id,[...path,id])])}
 const groups=roots.map(root=>{const categories=children(root.id);return {id:root.id.startsWith('group-')?root.id.slice(6):root.slug,dbId:root.id,name:root.name,description:root.description,categories:categories.map(c=>c.name),categoryRecords:categories}});
 const byId=new Map(media.map(m=>[m.id,adaptMedia(m,url)]));const resolve=id=>byId.get(id)?.src||null;
 const contact=settings.contact||{},identity=settings.identity||{};
 return {remote:true,revision:raw.revision,groups,settings,pages:raw.pages||[],home:raw.home||[],menus:raw.menus||[],uiTexts:raw.uiTexts||{},media:byId,
  company:{...contact,name:identity.name||'Rulman Teklif',phoneHref:'tel:'+String(contact.phone||'').replace(/[^+0-9]/g,'').replace(/^0(?=\d{10}$)/,'+90'),emailHref:'mailto:'+(contact.email||''),whatsapp:String(contact.whatsapp||'').replace(/\D/g,'')},
  identity:{...identity,logoUrl:resolve(identity.logo),faviconUrl:resolve(identity.favicon)},
  stats:{brands:(raw.brands||[]).map(b=>({...b,logoUrl:resolve(b.logo_id)})),categories:Object.fromEntries(records.map(c=>[c.name,Number(raw.categoryCounts?.[c.id]||0)]))},
  totalProducts:Number(raw.totalProducts||0),articles:(raw.articles||[]).map(a=>({id:a.id,slug:a.slug,title:a.title,category:a.topic,description:a.summary,minutes:a.reading_minutes,image:resolve(a.cover_id),alt:a.cover_alt,seo:a.seo})),
 };
}
function referencedMedia(raw){
 const ids=new Set();const add=id=>{if(typeof id==='string'&&id)ids.add(id)};
 for(const brand of raw.brands||[])add(brand.logo_id);for(const category of raw.categories||[])add(category.image_id);for(const a of raw.articles||[])add(a.cover_id);
 const walk=value=>{if(!value||typeof value!=='object')return;for(const [key,item] of Object.entries(value)){if(['image','media_id','mediaId','logo','favicon','cover_id','socialImage'].includes(key)&&typeof item==='string')add(item);else if(typeof item==='object')walk(item)}};
 walk(raw.settings);walk(raw.home);walk(raw.pages);return [...ids];
}
export function createRepository(client,projectUrl){
 async function rpc(name,args={}){const {data,error}=await client.rpc(name,args);if(error)throw Error('Veriler yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.');return data}
 return {
  async bootstrap(){const raw=await rpc('get_public_site');if(!raw||!Array.isArray(raw.categories)||!Array.isArray(raw.brands))throw Error('Site verisi beklenen biçimde değil.');const ids=referencedMedia(raw),media=[];for(let i=0;i<ids.length;i+=200)media.push(...await rpc('get_public_media',{media_ids:ids.slice(i,i+200)}));return adaptSite(raw,media,projectUrl)},
  async search(filters,site,page=1,pageSize=24){
   let category=null;if(filters.category?.startsWith('group:'))category=site.groups.find(g=>g.id===filters.category.slice(6))?.dbId;
   else if(filters.category?.startsWith('category:'))category=filters.category.slice(9);
   else if(filters.category&&filters.category!=='Tüm ürünler')category=site.groups.flatMap(g=>g.categoryRecords).find(c=>c.name===filters.category)?.id;
   const brand=filters.brand==='Tüm markalar'?null:site.stats.brands.find(b=>b.name===filters.brand||b.id===filters.brand)?.id;
   if((filters.category!=='Tüm ürünler'&&!category)||(filters.brand!=='Tüm markalar'&&!brand))return {products:[],totalCount:0,page,pageSize};
   const q=filters.technicalQuery||{};const result=await rpc('search_public_catalog',{p_query:filters.search||'',p_code:q.code||null,p_inner:q.inner??null,p_outer:q.outer??null,p_width:q.width??null,p_category:category,p_brand:brand,p_page:page,p_page_size:pageSize});
   return {products:result.items.map(row=>adaptProduct(row,projectUrl)),totalCount:Number(result.totalCount),page:result.page,pageSize:result.pageSize};
  },
  async products(ids,details=false){const unique=[...new Set(ids.filter(id=>typeof id==='string'||typeof id==='number').map(String))],legacy=[...new Set(ids.filter(id=>typeof id==='number'&&legacyCartCodes[id]))],result=[];for(let i=0;i<unique.length;i+=200)result.push(...await rpc('get_public_products',{product_ids:unique.slice(i,i+200),include_details:details}));for(const id of legacy){const [brand,code]=legacyCartCodes[id];const matches=await rpc('search_public_catalog',{p_code:brand+code,p_page_size:100});const match=matches.items.find(row=>row.brand===brand&&normalizeCode(row.sku)===normalizeCode(code));if(match&&!result.some(row=>row.id===match.id))result.push(match)}return result.map(row=>adaptProduct(row,projectUrl))},
  async article(slug,site){const row=await rpc('get_public_article',{article_slug:slug});if(!row)return null;const summary=site.articles.find(a=>a.slug===slug)||{};return {...summary,...row.body,title:row.title,slug:row.slug,category:row.topic,description:row.summary,minutes:row.reading_minutes,seo:row.seo}},
  subscribe(onChange){const channel=client.channel('public-content-version').on('postgres_changes',{event:'UPDATE',schema:'public',table:'content_version'},onChange).subscribe();return ()=>client.removeChannel(channel)},
 };
}
