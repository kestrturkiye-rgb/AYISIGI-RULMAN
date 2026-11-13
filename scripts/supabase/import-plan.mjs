import {readFileSync,statSync} from 'node:fs';
import {readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {articles} from '../../src/academy-data.js';
import {productGroups} from '../../src/catalog-groups.js';
import {mergeCatalog} from '../../src/catalog-merge.js';
import {legacyContent,legacyTexts,sourceFiles} from './legacy-content.mjs';
export const root=fileURLToPath(new URL('../../',import.meta.url));
const read=relative=>readFileSync(path.join(root,relative));
const json=relative=>JSON.parse(read(relative));
export const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export const slugify=value=>value.normalize('NFKD').replace(/[ıİ]/g,'i').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,150).replace(/-$/,'')||'urun';
export async function createImportPlan(){
 const raw=mergeCatalog(json('public/catalog/index.json'),json('public/catalog/additions.json')),mapping=json('src/product-image-map.json'),thumbs=json('docs/product-image-thumbnails.json');
 const specs=new Map(),fingerprint=createHash('sha256');fingerprint.update('rulman-phase1-import-v1');
 for(const filename of ['public/catalog/index.json','public/catalog/additions.json','src/catalog-addition-groups.json','src/product-image-map.json',...sourceFiles])fingerprint.update(filename).update(read(filename));
 for(const filename of (await readdir(path.join(root,'public/catalog'))).filter(p=>/^details-.*\.json$/.test(p)).sort()){
  const bytes=read('public/catalog/'+filename);fingerprint.update(filename).update(bytes);for(const [id,value] of Object.entries(JSON.parse(bytes)))specs.set(id,value);
 }
 const mediaByPath=new Map(),assets=new Map(),variants=new Map(),uploadObjects=new Map();
 function register(relative,withVariants=false){
  relative=relative.replace(/^\//,'');if(mediaByPath.has(relative))return mediaByPath.get(relative);
  const absolute=path.resolve(root,'public',relative);if(!absolute.startsWith(path.join(root,'public')+path.sep))throw Error('Görsel yolu public dizininden çıkamaz.');
  const bytes=readFileSync(absolute),hash=sha(bytes),extension=path.extname(relative).slice(1).toLowerCase();
  const mime={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',avif:'image/avif',pdf:'application/pdf'}[extension];
  if(!mime||bytes.length>26214400)throw Error('Desteklenmeyen dosya: '+relative);
  const id='asset-'+hash;mediaByPath.set(relative,id);
  if(!assets.has(id)){
   const objectPath=`published/${hash}.${extension}`;
   assets.set(id,{id,bucket_id:'media-published',object_path:objectPath,mime_type:mime,size_bytes:bytes.length,sha256:hash,status:'published'});
   uploadObjects.set(objectPath,{bucket:'media-published',path:objectPath,local:relative,sha256:hash,mime,size:bytes.length});
  }
  if(withVariants){
   const report=thumbs.files[relative];if(!report||report.sourceSha256!==hash)throw Error('Görsel türevi güncel değil: '+relative);
   for(const [label,output] of Object.entries(report.outputs)){
    const content=read('public/'+output.path),outputHash=sha(content);if(outputHash!==output.sha256)throw Error('Görsel türevi hash uyuşmazlığı.');
    const objectPath=`derived/${outputHash}.webp`;
    variants.set(id+':'+label,{id:id+':'+label,media_id:id,label,object_path:objectPath,mime_type:'image/webp',width:output.width,height:output.height,size_bytes:content.length,sha256:outputHash});
    uploadObjects.set(objectPath,{bucket:'media-published',path:objectPath,local:output.path,sha256:outputHash,mime:'image/webp',size:content.length});
   }
  }
  return id;
 }
 for(const row of raw.rows){if(row[6])register(mapping[path.basename(row[6])]||row[6].replace(/^\//,''),true)}
 for(const article of articles)register(article.image);
 const content=legacyContent(relative=>register(relative));
 const brands=raw.brands.map((name,index)=>({id:'brand-'+index,name,slug:slugify(name)+'-'+index,sort_order:index,status:'published'}));
 const categories=productGroups.map((group,index)=>({id:'group-'+group.id,parent_id:null,name:group.name,slug:group.id,description:group.description,sort_order:index,status:'published'}));
 for(const [index,name] of raw.categories.entries()){
  const group=productGroups.find(g=>g.categories.includes(name));if(!group)throw Error('Kategori eşlemesi eksik: '+name);
  categories.push({id:'category-'+index,parent_id:'group-'+group.id,name,description:'',slug:slugify(name),sort_order:group.categories.indexOf(name),status:'published'});
 }
 const categoryIds=new Set(categories.map(c=>c.id)),ids=new Set(),codeCounts=new Map();
 let specCount=0;
 function product(row,index){
  const [id,code,brand,category,measurements,title,,refs,baseCode,detailChunk,imageKind,manufacturerCode]=row;
  const detail=specs.get(id)||{specs:[]};if(!categoryIds.has('category-'+category))throw Error('Kategori bulunamadı.');
  if(!code||code.length>240||(title||raw.categories[category]).length>500)throw Error('Ürün metin sınırları geçersiz: '+id);
  if((measurements||[]).some(n=>n!=null&&(!Number.isFinite(n)||n<=0))||(measurements?.[0]!=null&&measurements?.[1]!=null&&measurements[0]>=measurements[1]))throw Error('Geçersiz ürün ölçüleri: '+id);
  if(imageKind&&!['product','series','category'].includes(imageKind))throw Error('Görsel sınıfı geçersiz: '+id);
  return {id,sku:code,name:title||raw.categories[category],slug:slugify(raw.brands[brand]+'-'+code)+'-'+id,brand_id:'brand-'+brand,category_id:'category-'+category,short_description:title||raw.categories[category],origin:null,stock_status:'on_order',featured:false,is_new:!!row[13],sort_order:index,inner_mm:measurements?.[0]??null,outer_mm:measurements?.[1]??null,width_mm:measurements?.[2]??null,specifications:(detail.specs||[]).map(([name,value])=>({name,value,unit:null})),base_code:baseCode||null,manufacturer_code:manufacturerCode||null,image_kind:imageKind||'product',technical_warning:detail.warning||null,price_mode:'quote',status:'published'};
 }
 for(const row of raw.rows){
  if(ids.has(row[0]))throw Error('Tekrarlanan ürün kimliği.');ids.add(row[0]);const key=row[2]+'|'+row[1];codeCounts.set(key,(codeCounts.get(key)||0)+1);specCount+=(specs.get(row[0])?.specs||[]).length;
 }
 const tableRows={
  'public.media_assets':[...assets.values()], 'public.media_variants':[...variants.values()],
  'public.brands':brands,'public.categories':categories,
  'public.products':function*(){for(let i=0;i<raw.rows.length;i++)yield product(raw.rows[i],i)},
  'public.product_aliases':function*(){for(const row of raw.rows){for(const [kind,code] of [['base',row[8]],['manufacturer',row[11]]])if(code&&code!==row[1])yield {id:row[0]+':'+kind,product_id:row[0],code,brand_id:'brand-'+row[2],kind};for(const [i,code]of (row[13]?.additionalAliases||[]).entries())if(code&&code!==row[1])yield {id:row[0]+':reference:'+i,product_id:row[0],code,brand_id:'brand-'+row[2],kind:'reference'}}},
  'public.product_media':function*(){for(const row of raw.rows){if(!row[6])continue;const relative=mapping[path.basename(row[6])]||row[6].replace(/^\//,'');yield {id:row[0]+':primary',product_id:row[0],media_id:mediaByPath.get(relative),alt_text:row[5]||row[1],sort_order:0,is_primary:true}}},
  'private.product_import_metadata':function*(){for(const row of raw.rows)yield {product_id:row[0],source_refs:row[7].map(([key,index])=>({key,url:raw.urls[index]})),raw_image_path:row[6],legacy_detail_chunk:row[9]??null,data_quality:{stock_verified:false,brand_needs_review:row[2]===0||/[\u200e\u200f]|400 ML/i.test(raw.brands[row[2]])}}},
  'public.articles':articles.map((a,index)=>({id:'article-'+a.slug,slug:a.slug,title:a.title,topic:a.category,summary:a.description,body:{intro:a.intro,sections:a.sections,takeaway:a.takeaway,references:a.references},cover_id:mediaByPath.get(a.image),cover_alt:a.alt,reading_minutes:a.minutes,sort_order:index,status:'published'})),
  'public.pages':content.pages,'public.home_sections':content.home,'public.menus':content.menus,'public.menu_items':content.menuItems,'public.site_settings':content.settings,'public.ui_texts':legacyTexts(),
  'public.spec_templates':[{id:'bearing',name:'Rulman temel şablonu',category_id:'group-bearings',status:'published',fields:[['inner_mm','İç çap (d)','number','mm'],['outer_mm','Dış çap (D)','number','mm'],['width_mm','Genişlik (B)','number','mm'],['type','Tip','text',null],['seal','Kapak / sızdırmazlık','text',null],['cage','Kafes','text',null],['weight','Ağırlık','number','kg'],['dynamic_load','Dinamik yük','number','kN'],['static_load','Statik yük','number','kN'],['limiting_speed','Limit devir','number','dev/dk'],['standard','Standart','text',null]].map(([key,name,type,unit])=>({key,name,type,unit}))}],
 };
 for(const item of uploadObjects.values())fingerprint.update(item.path).update(item.sha256);
 const counts={};for(const [table,values] of Object.entries(tableRows)){let n=0;for(const _ of typeof values==='function'?values():values)n++;counts[table]=n}
 const report={sourceSha256:fingerprint.digest('hex'),counts,products:raw.rows.length,originalIdsPreserved:true,specifications:specCount,mediaObjects:uploadObjects.size,mediaBytes:[...uploadObjects.values()].reduce((n,f)=>n+f.size,0),warnings:{unknownBrandProducts:raw.rows.filter(r=>r[2]===0).length,brandValuesToReview:raw.brands.filter(n=>/[\u200e\u200f]|400 ML/i.test(n)),repeatedBrandCodeRows:[...codeCounts.values()].reduce((n,v)=>n+Math.max(0,v-1),0),note:'Kodlar birleştirilmez; belirsiz özellik birimleri tahmin edilmez. Stok/fiyat doğrulanmış sayılmaz.'}};
 return {report,tableRows,uploads:[...uploadObjects.values()]};
}
