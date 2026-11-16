import {useEffect} from 'react';import {SITE_ORIGIN,canonicalPath,cleanHost} from './urls.js';
export function setSeo({title,description,path='/',image,noindex=false,verification}){
 document.title=title;const meta=(name,content,property=false)=>{const key=property?'property':'name';let el=document.head.querySelector(`meta[${key}="${name}"]`);if(!el){el=document.createElement('meta');el.setAttribute(key,name);document.head.append(el);}el.content=content||'';};
 meta('description',description);meta('robots',noindex?'noindex,follow':'index,follow');meta('og:title',title,true);meta('og:description',description,true);meta('og:url',SITE_ORIGIN+path,true);meta('og:type','website',true);meta('og:image',image||SITE_ORIGIN+'/brand/rulman-teklif.webp',true);meta('twitter:card','summary_large_image');
 if(verification&&/^[A-Za-z0-9_-]{10,200}$/.test(verification))meta('google-site-verification',verification);
 let link=document.querySelector('link[rel="canonical"]');if(!link){link=document.createElement('link');link.rel='canonical';document.head.append(link);}link.href=SITE_ORIGIN+path;
}
export default function Seo({route,site}){useEffect(()=>{
 const group=site.groups.find(g=>route.path==='/urunler/'+g.id),article=site.articles.find(a=>route.path==='/akademi/'+a.slug),page=site.pages.find(p=>route.path==='/'+p.slug),global=site.settings.seo||{},specific=article?.seo||page?.seo||{};
 const names={'/':'','/urunler':'Ürünler','/akademi':'Rulman Akademisi','/markalar':'Markalar','/hakkimizda':'Hakkımızda','/iletisim':'İletişim','/teklif':'Teklif al','/teknik-arama':'Teknik arama','/kampanyalar':'Kampanyalı ürünler','/hesabim':'Üye hesabı','/kvkk':'KVKK Aydınlatma Metni','/gizlilik':'Gizlilik Politikası','/cerez-politikasi':'Çerez Politikası'};
 const heading=specific.metaTitle||specific.title||article?.title||page?.title||group?.name||names[route.path];
 const title=heading?heading+' | '+site.company.name:global.title||site.company.name;
 setSeo({title,description:specific.metaDescription||specific.description||article?.description||group?.description||global.description,path:canonicalPath(route),noindex:!cleanHost()||['/hesabim','/teklif','/admin'].includes(route.path)||route.params.size>0,verification:global.searchConsoleVerification});
},[route,site]);return null;}
