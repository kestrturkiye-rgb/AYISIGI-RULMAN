// A fresh, in-memory seed per document load; no cookie, visitor ID or browsing history.
export const discoverySeed=globalThis.crypto.randomUUID();
export function isDiscoveryRoute(route,filters){return route.path==='/'&&!filters.error&&!filters.search?.trim()&&!filters.technicalQuery&&filters.category==='Tüm ürünler'&&filters.brand==='Tüm markalar'&&!route.params.has('sayfa');}
export function selectDiscovery(products,seed=discoverySeed,size=24){
 let state=2166136261;for(const c of seed)state=Math.imul(state^c.charCodeAt(0),16777619)>>>0;
 const random=()=>{state=(state+0x6D2B79F5)>>>0;let x=Math.imul(state^(state>>>15),state|1);x^=x+Math.imul(x^(x>>>7),x|61);return ((x^(x>>>14))>>>0)/4294967296;};
 const chosen=new Set(),count=Math.min(size,products.length);for(let i=products.length-count;i<products.length;i++){const j=Math.floor(random()*(i+1));chosen.add(chosen.has(j)?i:j);}const result=[...chosen].map(i=>products[i]);for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;
}
