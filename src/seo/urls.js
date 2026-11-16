export const SITE_ORIGIN='https://rulmanteklif.com';
export function cleanHost(location=globalThis.location){return ['rulmanteklif.com','www.rulmanteklif.com'].includes(location?.hostname);}
export function publicHref(path,location=globalThis.location){return cleanHost(location)?path:'#'+path;}
export const productPath=slug=>'/urun/'+encodeURIComponent(slug);
export function canonicalPath(route){return route.path==='/'?'/':route.path.replace(/\/$/,'');}

export function decodePathSegment(value){try{return decodeURIComponent(value)}catch{return null}}
