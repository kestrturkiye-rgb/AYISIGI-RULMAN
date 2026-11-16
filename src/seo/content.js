import project from '../../apps/admin/src/project-config.json' with {type:'json'};
import {translate,technicalText,localePath} from '../i18n/core.js';
import {guides,articleGroups} from './category-guides.js';
const ROOT='https://rulmanteklif.com';
const text=value=>typeof value==='string'?value.trim():'';
const brandName=value=>value&&!['Belirtilmemiş','Not specified'].includes(value)?value:'';
const sentence=value=>value?value.replace(/[.\s]+$/,'')+'.':'';
export function groupsFor(site){
 if(site.groups)return site.groups;
 const records=site.categories||[];
 return records.filter(c=>!c.parent_id).map(root=>({id:root.id.startsWith('group-')?root.id.slice(6):root.slug,dbId:root.id,name:root.name,description:root.description,categoryRecords:records.filter(c=>{const visited=new Set();let next=c;while(next?.parent_id&&!visited.has(next.id)){visited.add(next.id);if(next.parent_id===root.id)return true;next=records.find(p=>p.id===next.parent_id);}return false;})}));
}
export function productGroup(product,site){return groupsFor(site).find(g=>g.dbId===(product.categoryId||product.category_id)||g.categoryRecords?.some(c=>c.id===(product.categoryId||product.category_id))||g.categories?.includes(product.category));}
export function productContent(product,{language='tr',siteName='Rulman Teklif',entries}={}){
 const tx=value=>technicalText(translate(value,language,entries),language),code=text(product.code||product.sku),brand=brandName(product.brand),category=tx(product.category||''),name=tx(product.name||code),seo=product.seo||{};
 const dimensions=product.dimensions||{inner:product.inner_mm,outer:product.outer_mm,width:product.width_mm};
 const measurements=[['inner',language==='en'?'Bore':'İç çap'],['outer',language==='en'?'Outside diameter':'Dış çap'],['width',language==='en'?'Width':'Genişlik']].filter(([key])=>dimensions[key]!==null&&dimensions[key]!==undefined&&Number.isFinite(Number(dimensions[key]))&&Number(dimensions[key])>0).map(([key,label])=>`${label}: ${Number(dimensions[key])} mm`);
 const label=[brand,code,name&&code&&!name.includes(code)?name:category].filter(Boolean).join(' ');
 const short=tx(text(product.shortDescription||product.short_description));
 const summary=[sentence(short&&short!==name?short:label||name),measurements.length?measurements.join('; ')+'.':'',language==='en'?'Add this product to your quote list to request price and stock confirmation.':'Fiyat ve stok teyidi için ürünü teklif listenize ekleyin.'].filter(Boolean).join(' ');
 const description=text(seo.metaDescription||seo.description)||[label,measurements.length?measurements.map(s=>s.replace(/: /,':')).join(', '):'',language==='en'?'Request a price and availability quotation.':'Fiyat ve stok için teklif isteyin.'].filter(Boolean).join(' · ');
 return {name:label||name,title:text(seo.metaTitle||seo.title)||[label||name,siteName].join(' | '),description,summary,measurements};
}
export function categoryContent(group,{language='tr',siteName='Rulman Teklif',entries}={}){
 const en=language==='en',name=translate(group?.name||(en?'Products':'Ürünler'),language,entries),children=(group?.categoryRecords||[]).map(c=>translate(c.name,language,entries));
 const paragraphs=guides[group?.id]?.[language]||[en?'Search the catalog by complete product code or known dimensions. Compare the available technical information and add the required products and quantities to your quote list.':'Katalogda tam ürün kodu veya bilinen ölçülerle arama yapın. Mevcut teknik bilgileri karşılaştırarak ihtiyaç duyduğunuz ürünleri teklif listenize ekleyin.'];
 return {heading:en?`${name}: selection and quotation guide`:`${name}: seçim ve teklif rehberi`,title:`${name} | ${en?'Product Codes and Quotation':'Ürün Kodları ve Teklif'} | ${siteName}`,description:[name,children.slice(0,3).join(', '),en?'Compare product codes and technical information; request a quotation.':'Ürün kodlarını ve teknik bilgileri inceleyin, teklif isteyin.'].filter(Boolean).join(' · '),intro:translate(group?.description||'',language,entries),paragraphs};
}
export function relatedResources({site,group,product,article,language='tr'}){
 const entries=site.settings?.localization?.entries;
 const groups=groupsFor(site),selected=group||product&&productGroup(product,site),ids=article?articleGroups[article.slug]||[]:selected?[selected.id]:[];
 const categories=groups.filter(g=>ids.includes(g.id)).map(g=>({href:'/urunler/'+g.id,label:translate(g.name,language,entries)}));
 const articles=(site.articles||[]).filter(a=>a.slug!==article?.slug&&(articleGroups[a.slug]||[]).some(id=>ids.includes(id))).slice(0,3).map(a=>({href:'/akademi/'+a.slug,label:translate(a.title,language,entries)}));
 return [...categories,...articles];
}
export function productStructuredData(product,site,language='tr'){
 const entries=site.settings?.localization?.entries;
 const content=productContent(product,{language,entries,siteName:site.company?.name||site.settings?.identity?.name||'Rulman Teklif'}),url=ROOT+localePath('/urun/'+encodeURIComponent(product.slug),language),brand=brandName(product.brand);
 const group=productGroup(product,site),crumbs=[{name:language==='en'?'Home':'Ana sayfa',url:ROOT+localePath('/',language)},{name:language==='en'?'Products':'Ürünler',url:ROOT+localePath('/urunler',language)},...(group?[{name:translate(group.name,language,entries),url:ROOT+localePath('/urunler/'+group.id,language)}]:[]),{name:product.code||product.sku,url}];
 const image=product.image||(product.media?.url?.startsWith('https://kestrturkiye-rgb.github.io/AYISIGI-RULMAN/')?product.media.url:null)|| (product.media?.bucket==='media-published'&&product.media.path&&!product.media.path.split('/').includes('..')?project.url+'/storage/v1/object/public/media-published/'+product.media.path.split('/').map(encodeURIComponent).join('/'):null);
 return {'@context':'https://schema.org','@graph':[{'@type':'Product','@id':url+'#product',name:content.name,sku:product.code||product.sku,...((product.manufacturerCode||product.manufacturer_code)?{mpn:product.manufacturerCode||product.manufacturer_code}:{}),url,description:content.description,...(brand?{brand:{'@type':'Brand',name:brand}}:{}),...(image?{image:[image]}:{}),...(product.category?{category:translate(product.category,language,entries)}:{}),additionalProperty:content.measurements.map(value=>({'@type':'PropertyValue',name:value.split(': ')[0],value:value.split(': ')[1]}))},{'@type':'BreadcrumbList',itemListElement:crumbs.map((c,index)=>({'@type':'ListItem',position:index+1,name:c.name,item:c.url}))}]};
}
export function serializeStructuredData(value){return JSON.stringify(value).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');}
