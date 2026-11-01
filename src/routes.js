import { useEffect, useState } from 'react';
import { productGroups } from './catalog-groups';

export const companyPages = [
 ['/markalar', 'Markalar'], ['/hakkimizda', 'Hakkımızda'], ['/iletisim', 'İletişim'], ['/teklif', 'Teklif al'],
];
export const groupPath = id => `/urunler/${id}`;
export const pageHref = path => `#${path}`;
export function selectionPath(selection) {
 if (selection === 'Tüm ürünler') return '/urunler';
 if (selection.startsWith('group:')) return groupPath(selection.slice(6));
 const group = productGroups.find(group => group.categories.includes(selection));
 return `${group ? groupPath(group.id) : '/urunler'}?kategori=${encodeURIComponent(selection)}`;
}
export function readRoute() {
 const hash = window.location.hash.slice(1);
 // Existing bookmarks keep working after the section-to-page migration.
 const legacy = {hakkimizda:'/hakkimizda',markalar:'/markalar',iletisim:'/iletisim',teklif:'/teklif',urunler:'/urunler','technical-title':'/teknik-arama'};
 const url = new URL(hash.startsWith('/') ? hash : legacy[hash] || '/', 'https://local.invalid');
 return {path:url.pathname.replace(/\/$/,'') || '/', params:url.searchParams, key:url.pathname+url.search};
}
export function usePageRoute() {
 const [route,setRoute] = useState(readRoute);
 useEffect(()=>{const change=()=>setRoute(readRoute());window.addEventListener('hashchange',change);window.addEventListener('popstate',change);return()=>{window.removeEventListener('hashchange',change);window.removeEventListener('popstate',change)}},[]);
 function navigate(path) { if (window.location.hash === pageHref(path)) {setRoute(readRoute());return} window.location.hash=path; }
 return [route,navigate];
}
