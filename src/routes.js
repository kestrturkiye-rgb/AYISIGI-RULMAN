import {stripLanguage,localePath} from './i18n/core.js';
import {cleanHost,publicHref,bearingSlugFromPath} from './seo/urls.js';
import { useEffect, useState } from 'react';
import { productGroups } from './catalog-groups';

export const companyPages = [
 ['/markalar', 'Markalar'], ['/hakkimizda', 'Hakkımızda'], ['/iletisim', 'İletişim'], ['/teklif', 'Teklif al'],
];
export const groupPath = id => `/urunler/${id}`;
export const pageHref = path => publicHref(path);
export function selectionPath(selection, groups=productGroups) {
 if (selection === 'Tüm ürünler') return '/urunler';
 if (selection.startsWith('group:')) return groupPath(selection.slice(6));
 const group = groups.find(group => group.categories.includes(selection)||group.categoryRecords?.some(c=>selection===`category:${c.id}`));
 return `${group ? groupPath(group.id) : '/urunler'}?kategori=${encodeURIComponent(selection)}`;
}
export function readRoute() {
 const hash = window.location.hash.slice(1);
 const clean=cleanHost(window.location)&&!hash?window.location.pathname+window.location.search:null;
 // Existing bookmarks keep working after the section-to-page migration.
 const legacy = {hakkimizda:'/hakkimizda',markalar:'/markalar',iletisim:'/iletisim',teklif:'/teklif',urunler:'/urunler','technical-title':'/teknik-arama'};
 const url = new URL(clean||(hash.startsWith('/') ? hash : legacy[hash] || '/'), 'https://local.invalid');
 const publicPath=stripLanguage(url.pathname.replace(/\/$/,'') || '/'),bearing=bearingSlugFromPath(publicPath);
 return {path:bearing?'/urun/'+bearing:publicPath,publicPath,params:url.searchParams,key:url.pathname+url.search};
}
export function usePageRoute() {
 const [route,setRoute] = useState(readRoute);
 useEffect(()=>{const change=()=>setRoute(readRoute());window.addEventListener('hashchange',change);window.addEventListener('popstate',change);return()=>{window.removeEventListener('hashchange',change);window.removeEventListener('popstate',change)}},[]);
 function navigate(path) { path=localePath(path);if(cleanHost()){window.history.pushState(null,'',path);window.dispatchEvent(new PopStateEvent('popstate'));return;} if (window.location.hash === pageHref(path)) {setRoute(readRoute());return} window.location.hash=path; }
 return [route,navigate];
}
