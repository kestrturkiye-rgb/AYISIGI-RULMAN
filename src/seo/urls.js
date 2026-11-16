import {localePath} from '../i18n/core.js';
export const SITE_ORIGIN='https://rulmanteklif.com';
export function cleanHost(location=globalThis.location){return ['rulmanteklif.com','www.rulmanteklif.com'].includes(location?.hostname);}
export function publicHref(path,location=globalThis.location){const target=localePath(path);return cleanHost(location)?target:'#'+target;}
export const productPath=slug=>'/urun/'+encodeURIComponent(slug);
export function canonicalPath(route){return route.path==='/'?'/':route.path.replace(/\/$/,'');}

export function decodePathSegment(value){try{return decodeURIComponent(value)}catch{return null}}

export function replaceProductAddress(slug,path=productPath(slug)){
 const search=cleanHost()?location.search:location.hash.includes('?')?'?'+location.hash.split('?').slice(1).join('?'):'';
 const target=publicHref(path+search);
 history.replaceState(history.state,'',cleanHost()?target:location.pathname+location.search+target);
 window.dispatchEvent(cleanHost()?new PopStateEvent('popstate'):new HashChangeEvent('hashchange'));
}

export const reservedProductSlugs=new Set(['en','admin','api','assets','fonts','brand','urun','urunler','akademi']);
export function bearingSlugFromPath(path){const match=path.match(/^\/([^/]+)\/rulman$/);return match&&!reservedProductSlugs.has(match[1])?match[1]:null;}
