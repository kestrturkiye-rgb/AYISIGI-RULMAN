import {localePath} from '../i18n/core.js';
export const SITE_ORIGIN='https://rulmanteklif.com';
export function cleanHost(location=globalThis.location){return ['rulmanteklif.com','www.rulmanteklif.com'].includes(location?.hostname);}
export function publicHref(path,location=globalThis.location){const target=localePath(path);return cleanHost(location)?target:'#'+target;}
export const productPath=slug=>'/urun/'+encodeURIComponent(slug);
export function canonicalPath(route){return route.path==='/'?'/':route.path.replace(/\/$/,'');}

export function decodePathSegment(value){try{return decodeURIComponent(value)}catch{return null}}

export function replaceProductAddress(slug){
 const target=publicHref(productPath(slug));
 history.replaceState(history.state,'',cleanHost()?target:location.pathname+location.search+target);
 window.dispatchEvent(cleanHost()?new PopStateEvent('popstate'):new HashChangeEvent('hashchange'));
}
