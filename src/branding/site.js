import {domainBrand,DEFAULT_PROFILES} from './domains.js';
import {translate} from '../i18n/core.js';
const localText=(value,language)=>typeof value==='string'?value:typeof value?.[language]==='string'?value[language]:'';
const text=(value,max=4000)=>typeof value==='string'?value.trim().slice(0,max):'';
// A fresh view for every host; never modify the shared RPC/cache payload.
export function brandSite(site,location=globalThis.location,language='tr'){
 const brand=domainBrand(location),settings=site.settings||{},profile={...DEFAULT_PROFILES[brand.key],...settings.identity?.domainBrands?.[brand.key]};
 const secondary=brand.key!=='teklif',name=text(profile.name,100)||(secondary?brand.name:site.company?.name||settings.identity?.name||brand.name);
 const entries=settings.localization?.entries;
 const replace=value=>{
  if(typeof value==='string')return translate(value,language,entries).replace(/Rulman Teklif/g,()=>name).replace(/RULMAN TEKLİF/g,()=>name.toLocaleUpperCase(language==='en'?'en-US':'tr-TR'));
  if(Array.isArray(value))return value.map(replace);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,['href','url','email','phone','whatsapp','controllerName','controllerAddress','id','slug','key','type','media_id','mediaId','image','logo','favicon','socialImage'].includes(key)?item:replace(item)]));
  return value;
 };
 const slogan=text(localText(profile.slogan,language),240),description=text(localText(profile.description,language));
 const identity={...(site.identity||settings.identity),name,...(slogan?{slogan}:{})};
 for(const field of ['logo','favicon'])if(typeof profile[field]==='string'&&site.media?.get(profile[field])?.src)identity[field+'Url']=site.media.get(profile[field]).src;
 const seo=secondary?replace(settings.seo||{}):{...settings.seo};
 if(secondary)seo.title=text(localText(profile.seoTitle,language),240)||name+' | '+(language==='en'?'Bearings and Industrial Products':'Rulman ve Endüstriyel Ürünler');
 if(description)seo.description=description;
 const pages=secondary?(site.pages||[]).map(page=>['hakkimizda','iletisim'].includes(page.slug)?{...page,title:replace(page.title),body:replace(page.body),seo:replace(page.seo)}:page):site.pages;
 const aboutTitle=text(localText(profile.aboutTitle,language),240),aboutDescription=text(localText(profile.aboutDescription,language));
 const editedPages=(aboutTitle||aboutDescription)?(pages||[]).map(page=>page.slug==='hakkimizda'&&page.body?.type!=='doc'?{...page,body:{...page.body,...(aboutTitle?{title:aboutTitle}:{}),...(aboutDescription?{paragraphs:[aboutDescription,...(page.body?.paragraphs||[]).slice(1)]}:{})}}:page):pages;
 return {...site,brand:{...brand,name},settings:{...settings,identity:{...settings.identity,name,...(slogan?{slogan}:{})},seo,footer:secondary?replace(settings.footer||{}):settings.footer},identity,company:{...site.company,name},pages:editedPages,home:secondary?replace(site.home||[]):site.home,menus:secondary?replace(site.menus||[]):site.menus};
}
