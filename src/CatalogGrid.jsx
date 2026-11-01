import React, {useMemo, useEffect, useState} from 'react';
import {ArrowUpRight, Plus, Search, X, ChevronLeft, ChevronRight, CircleDot} from 'lucide-react';
import { productGroups, matchesCategory, selectionName } from './catalog-groups';
import { matchesTechnicalQuery, matchesTextQuery, normalizeCode } from './technical-search';
import {formatCount} from './catalog-data';
import ProductImage from './ProductImage';

const pageSize=24;
export default function CatalogGrid({products,manifest,category,setCategory,search,setSearch,brand,setBrand,technicalQuery,setTechnicalQuery,source,setSource,onSelect,onDetail,onAdd}){
 const [page,setPage]=useState(1);
 const brands=useMemo(()=>[...new Set(products.map(p=>p.brand))].sort((a,b)=>a.localeCompare(b,'tr')),[products]);
 const counts=useMemo(()=>{const c={};for(const p of products)c[p.category]=(c[p.category]||0)+1;return c},[products]);
 const currentGroup=productGroups.find(group=>category===`group:${group.id}`||group.categories.includes(category));
 const categories=currentGroup?currentGroup.categories:productGroups.flatMap(group=>group.categories);
 const visible=useMemo(()=>{
  const query=search.trim().toLocaleLowerCase('tr');const normalizedQuery=normalizeCode(query);
  return products.filter(p=>matchesTechnicalQuery(p,technicalQuery)&&matchesCategory(p,category)&&(brand==='Tüm markalar'||p.brand===brand)&&(source==='all'||p.sources.some(s=>s.key===source))&&matchesTextQuery(p,query,normalizedQuery));
 },[products,category,search,brand,technicalQuery,source]);
 useEffect(()=>{setPage(1)},[category,search,brand,technicalQuery,source]);
 const pages=Math.max(1,Math.ceil(visible.length/pageSize));const currentPage=Math.min(page,pages);const shown=visible.slice((currentPage-1)*pageSize,currentPage*pageSize);
 function changePage(next){setPage(next);document.getElementById('urunler').scrollIntoView({behavior:'smooth'})}
 function reset(){setSearch('');setTechnicalQuery(null);setCategory('Tüm ürünler');setBrand('Tüm markalar');setSource('all')}
 const emptyGroup=!search&&!technicalQuery&&brand==='Tüm markalar'&&category!=='Tüm ürünler'&&source==='all';
 return <section className="container catalog" id="urunler">
  <div className="section-head"><div><span className="section-tag">İŞİNİZE GÜÇ KATAN ÜRÜNLER</span><h2>{category==='Tüm ürünler'?'Doğru ürün, güçlü çözüm.':selectionName(category)}</h2><div className="catalog-count" role="status">{formatCount(visible.length)} ürün bulundu</div></div>
   <div className="catalog-selects"><select aria-label="Markaya göre filtrele" value={brand} onChange={e=>setBrand(e.target.value)}><option>Tüm markalar</option>{brands.map(b=><option key={b}>{b}</option>)}</select></div>
  </div>
  <div className="family-tabs" role="group" aria-label="Ürün aileleri"><button className={category==='Tüm ürünler'?'selected':''} onClick={()=>onSelect('Tüm ürünler')}>Tüm ürünler <small>{formatCount(products.length)}</small></button>{productGroups.map(group=><button key={group.id} className={currentGroup?.id===group.id?'selected':''} onClick={()=>onSelect(`group:${group.id}`)}>{group.name}<small>{formatCount(group.categories.reduce((n,c)=>n+(counts[c]||0),0))}</small></button>)}</div>
  <div className="tabs" role="group" aria-label="Ürün kategorileri"><button className={category==='Tüm ürünler'?'active':''} onClick={()=>setCategory('Tüm ürünler')}>Tüm ürünler</button>{categories.map(c=><button key={c} className={category===c?'active':''} onClick={()=>setCategory(c)}><CircleDot size={16}/>{c}</button>)}</div>
  {technicalQuery&&<div className="technical-result" role="status"><div><b>{formatCount(visible.length)} ürün bulundu</b><span>{[technicalQuery.code&&`Kod: ${technicalQuery.code}`,technicalQuery.inner!==undefined&&`İç: ${technicalQuery.inner} mm`,technicalQuery.outer!==undefined&&`Dış: ${technicalQuery.outer} mm`,technicalQuery.width!==undefined&&`En: ${technicalQuery.width} mm`].filter(Boolean).join(' · ')}</span></div><button onClick={()=>setTechnicalQuery(null)}><X size={16}/> Teknik aramayı temizle</button></div>}
  {category!=='Tüm ürünler'&&<div className="catalog-breadcrumb"><button onClick={()=>onSelect('Tüm ürünler')}>Tüm ürünler</button><span>/</span>{currentGroup&&category!==`group:${currentGroup.id}`&&<><button onClick={()=>onSelect(`group:${currentGroup.id}`)}>{currentGroup.name}</button><span>/</span></>}<span>{selectionName(category)}</span></div>}
  <div className="catalog-information"><span>Fiyat ve stok bilgisi için teklif alın.</span><span>Ölçü bilgisi bulunmayan ürünler ölçü aramasında eşleşmez.</span></div>
  <div className="product-grid">{shown.map(p=><article className="product" key={p.id}>
   <button className="product-visual" onClick={()=>onDetail(p)} aria-label={`${p.brand} ${p.code} detayını görüntüle`}><ProductImage product={p}/><span className="view-product"><ArrowUpRight size={18}/></span></button>
   <div className="product-info"><small>{p.brand!=='Belirtilmemiş'&&`${p.brand} · `}{p.category}</small><button className="product-title" onClick={()=>onDetail(p)}>{p.code}</button><p>{p.name}</p><span className="size">{p.size}</span><div className="product-action"><span>Fiyat için teklif alın</span><button aria-label={`${p.brand} ${p.code} teklif sepetine ekle`} onClick={()=>onAdd(p)}><Plus size={18}/></button></div></div>
  </article>)}</div>
  {visible.length===0&&<div className="empty"><Search size={32}/><h3>{emptyGroup?'Bu gruba ait ürünler henüz eklenmedi':'Aradığınız ürün bulunamadı'}</h3><p className="category-empty-note">{emptyGroup?'Diğer ürün gruplarını inceleyebilir veya teknik aramayı kullanabilirsiniz.':'Farklı bir kod veya ölçü deneyin ya da filtreleri temizleyin.'}</p><button className="primary" onClick={reset}>Filtreleri temizle</button></div>}
  {visible.length>0&&<div className="catalog-pagination"><span>{formatCount((currentPage-1)*pageSize+1)}–{formatCount(Math.min(currentPage*pageSize,visible.length))} / {formatCount(visible.length)} ürün</span><div><button aria-label="Önceki sayfa" disabled={currentPage===1} onClick={()=>changePage(currentPage-1)}><ChevronLeft size={17}/></button><span>Sayfa {formatCount(currentPage)} / {formatCount(pages)}</span><button aria-label="Sonraki sayfa" disabled={currentPage===pages} onClick={()=>changePage(currentPage+1)}><ChevronRight size={17}/></button></div></div>}
 </section>;
}
