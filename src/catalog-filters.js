import {productGroups} from './catalog-groups.js';
import {parseTechnicalQuery} from './technical-search.js';

export function readCatalogFilters(route, groups=productGroups){
 const group=groups.find(g=>route.path===`/urunler/${g.id}`);
 const requested=route.params.get('kategori');
 const category=requested&&(group?.categories.includes(requested)||groups.some(g=>g.categoryRecords?.some(c=>requested===`category:${c.id}`)))?requested:group?`group:${group.id}`:'Tüm ürünler';
 const fields={code:route.params.get('kod')||'',inner:route.params.get('inner')||'',outer:route.params.get('outer')||'',width:route.params.get('width')||''};
 const technical=['kod','inner','outer','width'].some(key=>route.params.has(key))?parseTechnicalQuery(fields):{};
 return {category,brand:route.params.get('marka')||'Tüm markalar',search:route.params.get('ara')||'',technicalQuery:technical.query||null,error:technical.error||''};
}
export function updateCatalogParams(route,changes,path=route.path){
 const params=new URLSearchParams(route.params);
 if(!Object.hasOwn(changes,'sayfa'))params.delete('sayfa');
 for(const [key,value] of Object.entries(changes)){if(value===null||value==='')params.delete(key);else params.set(key,value)}
 return path+(params.size?'?'+params.toString():'');
}
