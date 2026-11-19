import {reservedProductSlugs} from './urls.js';
import project from '../../apps/admin/src/project-config.json' with {type:'json'};
import {translate,technicalText,localePath} from '../i18n/core.js';
import {guides,articleGroups} from './category-guides.js';
import {SEO_ORIGIN} from '../branding/domains.js';
const text=value=>typeof value==='string'?value.trim():'';
const brandName=value=>value&&!['Belirtilmemiş','Not specified'].includes(value)?value:'';
const sentence=value=>value?value.replace(/[.\s]+$/,'')+'.':'';
export function groupsFor(site){
 if(site.groups)return site.groups;
 const records=site.categories||[];
 return records.filter(c=>!c.parent_id).map(root=>({id:root.id.startsWith('group-')?root.id.slice(6):root.slug,dbId:root.id,name:root.name,description:root.description,categoryRecords:records.filter(c=>{const visited=new Set();let next=c;while(next?.parent_id&&!visited.has(next.id)){visited.add(next.id);if(next.parent_id===root.id)return true;next=records.find(p=>p.id===next.parent_id);}return false;})}));
}
export function productGroup(product,site){return groupsFor(site).find(g=>Boolean(product.categoryId||product.category_id)&&(g.dbId===(product.categoryId||product.category_id)||g.categoryRecords?.some(c=>c.id===(product.categoryId||product.category_id)))||g.categories?.includes(product.category));}
export function productContent(product,{language='tr',siteName='Rulman Teklif',entries}={}){
 const tx=value=>technicalText(translate(value,language,entries),language),code=text(product.code||product.sku),brand=brandName(product.brand),category=tx(product.category||''),name=tx(product.name||code),seo=product.seo||{};
 const dimensions=product.dimensions||{inner:product.inner_mm,outer:product.outer_mm,width:product.width_mm};
 const measurements=[['inner',language==='en'?'Bore':'İç çap'],['outer',language==='en'?'Outside diameter':'Dış çap'],['width',language==='en'?'Width':'Genişlik']].filter(([key])=>dimensions[key]!==null&&dimensions[key]!==undefined&&Number.isFinite(Number(dimensions[key]))&&Number(dimensions[key])>0).map(([key,label])=>`${label}: ${Number(dimensions[key])} mm`);
 const label=[brand,code,name&&code&&!name.includes(code)?name:category].filter(Boolean).join(' ');
 const short=tx(text(product.shortDescription||product.short_description));
 const en=language==='en',features=bearingFeatures(code,product.category,language);
 const closing=en?'Add this product to your quote list to request price and stock confirmation'+(brand?'.':'; you can note a brand preference or accept an equivalent.'):(brand?`${brand} markalı ürünün fiyat ve stok teyidi için ürünü teklif listenize ekleyin.`:'Fiyat ve stok teyidi için ürünü teklif listenize ekleyin; marka tercihinizi veya muadil kabulünüzü not olarak yazabilirsiniz.');
 const summary=[sentence(short&&short!==name?short:label||name),measurements.length?measurements.join('; ')+'.':'',...features.map(f=>f.sentence),features.standard?(en?'Standard bearings with the same basic designation share the same boundary dimensions across manufacturers; compare the suffixes when choosing an equivalent.':'Standart rulmanlarda aynı temel numara farklı markalarda aynı ana ölçüleri ifade eder; muadil seçerken son ekleri de karşılaştırın.'):'',closing].filter(Boolean).join(' ');
 const description=text(seo.metaDescription||seo.description)||[label,features.map(f=>f.short).join(', '),measurements.length?measurements.map(s=>s.replace(/: /,':')).join(', '):'',en?'Request a price and availability quotation.':'Fiyat ve stok için teklif isteyin.'].filter(Boolean).join(' · ');
 return {name:label||name,title:text(seo.metaTitle||seo.title)||[label||name,siteName].join(' | '),description,summary,measurements,features:features.map(f=>f.short)};
}
// Rulman kodundaki yaygın son ekleri okunur açıklamaya çevirir. Yalnızca rulman kategorilerinde ve
// standart bir temel numara (ör. 6205, 22210, NU205, 30208) bulunduğunda uygulanır.
const BEARING_SUFFIXES=[
 {test:r=>/(?:^|[^A-Z0-9])(?:2RS[H1R]?|2HRS|2BRS|2RSL)(?![A-Z])|(?:^|[^A-Z])(?:2RU|DDU|LLU)(?![A-Z])/.test(r),tr:['iki tarafı kauçuk contalı','İki tarafı kauçuk contalıdır; toz ve neme karşı koruma sağlar ve genellikle fabrikadan greslenmiş olarak gelir.'],en:['sealed on both sides','Both sides are fitted with rubber seals that protect against dust and moisture; such bearings are usually supplied pre-greased.']},
 {test:r=>/(?:^|[^A-Z0-9])(?:2Z|2ZR)(?![A-Z])|(?:^|[^A-Z])ZZ(?![A-Z])/.test(r),tr:['iki tarafı metal kapaklı','İki tarafı metal kapaklıdır; gresin içeride kalmasına yardımcı olur ve kaba kir girişini sınırlar.'],en:['shielded on both sides','Both sides are fitted with metal shields that help retain grease and limit coarse contamination.']},
 {test:r=>/(?:^|[^A-Z])(?:RS[H1R]?|DU|LU)(?![A-Z0-9])/.test(r),tr:['tek tarafı contalı','Tek tarafı kauçuk contalıdır; contasız taraf montaj yönüne göre konumlandırılmalıdır.'],en:['sealed on one side','One side is fitted with a rubber seal; position the open side according to the mounting arrangement.']},
 {test:r=>/(?:^|[^A-Z])Z(?![A-Z0-9])/.test(r),tr:['tek tarafı metal kapaklı','Tek tarafı metal kapaklıdır.'],en:['shielded on one side','One side is fitted with a metal shield.']},
 {test:r=>/C3(?![0-9])/.test(r),tr:['C3 iç boşluk','C3 son eki normalden büyük radyal iç boşluğu belirtir; sıcak çalışan uygulamalarda ve sıkı geçmelerde tercih edilir.'],en:['C3 clearance','The C3 suffix indicates radial internal clearance greater than normal, often chosen for warm-running applications and tight fits.']},
 {test:r=>/C4(?![0-9])/.test(r),tr:['C4 iç boşluk','C4 son eki C3’ten de büyük radyal iç boşluğu belirtir.'],en:['C4 clearance','The C4 suffix indicates radial internal clearance greater than C3.']},
 {test:r=>/^(?:[-\s/]?E1?)?[-\s/]?K(?![ABD-LN-SU-Z])/.test(r),tr:['konik delikli','K son eki konik deliği belirtir; rulman mile adaptör veya çekme kovanıyla bağlanabilir.'],en:['tapered bore','The K suffix indicates a tapered bore for mounting with an adapter or withdrawal sleeve.']},
 {test:r=>/(?:^|[^A-Z0-9]|E)(?:M|MA|MB)(?![A-Z])/.test(r),tr:['pirinç kafesli','M tipi son ek işlenmiş pirinç kafesi belirtir; titreşimli ve ağır yüklü uygulamalarda tercih edilir.'],en:['brass cage','An M-type suffix indicates a machined brass cage, often preferred for vibration and heavy loads.']},
 {test:r=>/TN9|TNG|TVH|TVP/.test(r),tr:['poliamid kafesli','Poliamid (cam elyaf takviyeli plastik) kafeslidir; hafif ve sessiz çalışmaya uygundur.'],en:['polyamide cage','It has a glass-fibre reinforced polyamide cage, suited to light and quiet running.']},
 {test:r=>/(?:^|[^A-Z0-9])NR(?![A-Z])/.test(r),tr:['segman kanallı ve segmanlı','NR son eki dış bilezikte segman kanalı ve takılı segman bulunduğunu belirtir.'],en:['snap ring groove with ring','The NR suffix indicates a snap ring groove in the outer ring with the snap ring fitted.']},
 {test:r=>/^[-\s/]?N(?![A-Z])/.test(r),tr:['segman kanallı','N son eki dış bilezikte segman kanalı bulunduğunu belirtir.'],en:['snap ring groove','The N suffix indicates a snap ring groove in the outer ring.']},
 {test:r=>/(?:^|[^A-Z0-9])P[456](?![0-9])/.test(r),tr:['yüksek hassasiyet sınıfı','P sınıfı son ek normalden yüksek boyut ve dönme hassasiyetini belirtir.'],en:['higher precision class','A P-class suffix indicates tighter dimensional and running accuracy than normal.']},
];
export function bearingFeatures(code,category,language='tr'){
 const value=String(code||'').toUpperCase(),list=[];
 if(!/rulman|bearing/i.test(String(category||'')))return Object.assign(list,{standard:false});
 const base=value.match(/^(?:[A-Z]{1,4})?\d{3,6}/);
 if(!base)return Object.assign(list,{standard:false});
 const rest=value.slice(base[0].length),lang=language==='en'?'en':'tr';
 const matched=BEARING_SUFFIXES.map(item=>item.test(rest));
 // Çift taraflı conta/kapak varken tek taraflı ifadeler, NR varken N tekrar yazılmaz.
 if(matched[0]||matched[1]){matched[2]=false;matched[3]=false;}
 if(matched[9])matched[10]=false;
 BEARING_SUFFIXES.forEach((item,index)=>{if(matched[index])list.push({short:item[lang][0],sentence:item[lang][1]});});
 return Object.assign(list,{standard:/^\d{3,6}$/.test(base[0])||/^(?:NU|NJ|NUP|N|NN|NNU|NA)\d{3,6}$/.test(base[0])});
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
export function productCategoryPath(product,site){
 const group=productGroup(product,site),id=product.categoryId||product.category_id;
 if(group&&id===group.dbId)return '/urunler/'+group.id;
 return (group?'/urunler/'+group.id:'/urunler')+'?kategori='+encodeURIComponent(id?'category:'+id:product.category||'');
}
export function canonicalProductPath(product,site){
 const slug=product.slug||product.id;
 const bearing=productGroup(product,site)?.id==='bearings'&&!reservedProductSlugs.has(slug);
 return bearing?'/'+encodeURIComponent(slug)+'/rulman':'/urun/'+encodeURIComponent(slug);
}
export function productStructuredData(product,site,language='tr'){
 const ROOT=SEO_ORIGIN;
 const entries=site.settings?.localization?.entries;
 const content=productContent(product,{language,entries,siteName:site.company?.name||site.settings?.identity?.name||'Rulman Teklif'}),url=ROOT+localePath(canonicalProductPath(product,site),language),brand=brandName(product.brand);
 const crumbs=[{name:language==='en'?'Products':'Ürünler',url:ROOT+localePath('/urunler',language)},...(product.category?[{name:translate(product.category,language,entries),url:ROOT+localePath(productCategoryPath(product,site),language)}]:[]),{name:product.code||product.sku,url}];
 const image=product.image||(product.media?.url?.startsWith('https://kestrturkiye-rgb.github.io/AYISIGI-RULMAN/')?product.media.url:null)|| (product.media?.bucket==='media-published'&&product.media.path&&!product.media.path.split('/').includes('..')?project.url+'/storage/v1/object/public/media-published/'+product.media.path.split('/').map(encodeURIComponent).join('/'):null);
 return {'@context':'https://schema.org','@graph':[{'@type':'Product','@id':url+'#product',name:content.name,sku:product.code||product.sku,...((product.manufacturerCode||product.manufacturer_code)?{mpn:product.manufacturerCode||product.manufacturer_code}:{}),url,description:content.description,...(brand?{brand:{'@type':'Brand',name:brand}}:{}),...(image?{image:[image]}:{}),...(product.category?{category:translate(product.category,language,entries)}:{}),additionalProperty:content.measurements.map(value=>({'@type':'PropertyValue',name:value.split(': ')[0],value:value.split(': ')[1]}))},{'@type':'BreadcrumbList',itemListElement:crumbs.map((c,index)=>({'@type':'ListItem',position:index+1,name:c.name,item:c.url}))}]};
}
export function serializeStructuredData(value){return JSON.stringify(value).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');}
