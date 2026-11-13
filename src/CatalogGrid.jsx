import React, {useMemo, useEffect, useState} from 'react';
import {ArrowUpRight, Plus, Search, X, ChevronLeft, ChevronRight, CircleDot} from 'lucide-react';
import { productGroups, selectionName } from './catalog-groups';
import { compileTechnicalQuery, compileTextQuery } from './technical-search';
import {formatCount} from './catalog-utils';
import ProductImage from './ProductImage';
import {useSite} from './data/SiteContext';

const pageSize=24;
export default function CatalogGrid({products,manifest,stats,category,setCategory,search,brand,setBrand,technicalQuery,filterError,onClearTechnical,onReset,source,onSelect,onDetail,onAdd,standalone=false,remote}){
 const site=useSite();const productGroups=site.groups;
 const [page,setPage]=useState(1);
 const brands=useMemo(()=>stats?.brands.map(b=>b.name)||[...new Set(products.map(p=>p.brand))].sort((a,b)=>a.localeCompare(b,'tr')),[products,stats]);
 const counts=useMemo(()=>{if(stats)return stats.categories;const c={};for(const p of products)c[p.category]=(c[p.category]||0)+1;return c},[products,stats]);
 const currentGroup=productGroups.find(group=>category===`group:${group.id}`||group.categories.includes(category)||group.categoryRecords?.some(c=>category===`category:${c.id}`));
 const categoryRecords=currentGroup?currentGroup.categoryRecords:productGroups.flatMap(g=>g.categoryRecords||[]);
 const categories=currentGroup?currentGroup.categories:productGroups.flatMap(group=>group.categories);
 const visible=useMemo(()=>{
  if(remote)return filterError?[]:products;
  const query=search.trim();const technicalMatch=compileTechnicalQuery(technicalQuery);const textMatch=compileTextQuery(search);
  const group=productGroups.find(g=>category===`group:${g.id}`);const categorySet=group?new Set(group.categories):null;
  if(filterError)return [];
  if(!query&&!technicalQuery&&category==='Tüm ürünler'&&brand==='Tüm markalar'&&source==='all')return products;
  return products.filter(p=>technicalMatch(p)&&(category==='Tüm ürünler'||(categorySet?categorySet.has(p.category):p.category===category))&&(brand==='Tüm markalar'||p.brand===brand)&&(source==='all'||p.sources.some(s=>s.key===source))&&textMatch(p));
 },[products,category,search,brand,technicalQuery,source,filterError,remote]);
 useEffect(()=>{setPage(1)},[category,search,brand,technicalQuery,source,filterError]);
 const count=remote?(filterError?0:remote.totalCount):visible.length;
 const pages=Math.max(1,Math.ceil(count/pageSize));const currentPage=Math.min(remote?.page||page,pages);const shown=remote?visible:visible.slice((currentPage-1)*pageSize,currentPage*pageSize);
 const selectedName=productGroups.find(g=>category===`group:${g.id}`)?.name||productGroups.flatMap(g=>g.categoryRecords||[]).find(c=>category===`category:${c.id}`)?.name||selectionName(category);
 function changePage(next){if(remote)remote.onPage(next);else setPage(next);document.getElementById('urunler').scrollIntoView({behavior:'smooth'})}
 const reset=onReset;
 const Heading=standalone?'h1':'h2';
 const emptyGroup=!search&&!technicalQuery&&brand==='Tüm markalar'&&category!=='Tüm ürünler'&&source==='all';
 return <section className="container catalog" id="urunler">
  <div className="section-head"><div><span className="section-tag">İŞİNİZE GÜÇ KATAN ÜRÜNLER</span><Heading>{category==='Tüm ürünler'?(site.remote?site.home.find(s=>s.kind==='catalog')?.content?.title||'Ürünler':'Doğru ürün, güçlü çözüm.'):selectedName}</Heading><div className="catalog-count" role="status">{formatCount(count)} ürün bulundu</div></div>
   <div className="catalog-selects"><select aria-label="Markaya göre filtrele" value={brand} onChange={e=>setBrand(e.target.value)}><option>Tüm markalar</option>{brands.map(b=><option key={b}>{b}</option>)}</select></div>
  </div>
  <div className="family-tabs" role="group" aria-label="Ürün aileleri"><button className={category==='Tüm ürünler'?'selected':''} onClick={()=>onSelect('Tüm ürünler')}>Tüm ürünler <small>{formatCount(manifest.totalProducts)}</small></button>{productGroups.map(group=><button key={group.id} className={currentGroup?.id===group.id?'selected':''} onClick={()=>onSelect(`group:${group.id}`)}>{group.name}<small>{formatCount(group.categories.reduce((n,c)=>n+(counts[c]||0),0))}</small></button>)}</div>
  <div className="tabs" role="group" aria-label="Ürün kategorileri"><button className={category==='Tüm ürünler'?'active':''} onClick={()=>setCategory('Tüm ürünler')}>Tüm ürünler</button>{(site.remote?categoryRecords.map(c=>({value:`category:${c.id}`,label:c.name})):categories.map(c=>({value:c,label:c}))).map(c=><button key={c.value} className={category===c.value?'active':''} onClick={()=>setCategory(c.value)}><CircleDot size={16}/>{c.label}</button>)}</div>
  {technicalQuery&&<div className="technical-result" role="status"><div><b>{formatCount(count)} ürün bulundu</b><span>{[technicalQuery.code&&`Kod: ${technicalQuery.code}`,technicalQuery.inner!==undefined&&`İç: ${technicalQuery.inner} mm`,technicalQuery.outer!==undefined&&`Dış: ${technicalQuery.outer} mm`,technicalQuery.width!==undefined&&`En: ${technicalQuery.width} mm`].filter(Boolean).join(' · ')}</span></div><button onClick={onClearTechnical}><X size={16}/> Teknik aramayı temizle</button></div>}
  {category!=='Tüm ürünler'&&<div className="catalog-breadcrumb"><button onClick={()=>onSelect('Tüm ürünler')}>Tüm ürünler</button><span>/</span>{currentGroup&&category!==`group:${currentGroup.id}`&&<><button onClick={()=>onSelect(`group:${currentGroup.id}`)}>{currentGroup.name}</button><span>/</span></>}<span>{selectedName}</span></div>}
  <div className="catalog-information"><span>Fiyat ve stok bilgisi için teklif alın.</span><span>Ölçü bilgisi bulunmayan ürünler ölçü aramasında eşleşmez.</span></div>
  {filterError&&<p role="alert" className="quote-error">{filterError}</p>}
  <div className={'product-grid'+(shown.length>0&&shown.every(p=>p.imageStatus==='pending')?' product-grid-text':'')}>{shown.map(p=><article className={'product'+(p.imageStatus==='pending'?' product-text':'')} key={p.id}>
   {p.imageStatus==='pending'?<div className="product-text-head"><span>Ürün bilgisi</span><button onClick={()=>onDetail(p)} aria-label={`Özellikleri incele: ${p.brand} ${p.code}`}>Özellikleri incele <ArrowUpRight size={16}/></button></div>:<button className="product-visual" onClick={()=>onDetail(p)} aria-label={`${p.brand} ${p.code} detayını görüntüle`}><ProductImage product={p}/><span className="view-product"><ArrowUpRight size={18}/></span></button>}
   <div className="product-info"><small>{p.brand!=='Belirtilmemiş'&&`${p.brand} · `}{p.category}</small><button className="product-title" onClick={()=>onDetail(p)}>{p.referenceCode&&p.code.startsWith('RT-')?p.name:p.code}</button><p>{p.referenceCode&&p.code.startsWith('RT-')?'Referans kodu: '+p.code:p.name}</p><span className="size">{p.referenceCode?'Model uygunluğu teklif aşamasında doğrulanır.':p.size}</span><div className="product-action"><span>Fiyat için teklif alın</span><button aria-label={`${p.brand} ${p.code} teklif sepetine ekle`} onClick={()=>onAdd(p)}><Plus size={18}/></button></div></div>
  </article>)}</div>
  {count===0&&<div className="empty"><Search size={32}/><h3>{emptyGroup?'Bu gruba ait ürünler henüz eklenmedi':'Aradığınız ürün bulunamadı'}</h3><p className="category-empty-note">{emptyGroup?'Diğer ürün gruplarını inceleyebilir veya teknik aramayı kullanabilirsiniz.':'Farklı bir kod veya ölçü deneyin ya da filtreleri temizleyin.'}</p><button className="primary" onClick={reset}>Filtreleri temizle</button></div>}
  {count>0&&<div className="catalog-pagination"><span>{formatCount((currentPage-1)*pageSize+1)}–{formatCount(Math.min(currentPage*pageSize,count))} / {formatCount(count)} ürün</span><div><button aria-label="Önceki sayfa" disabled={currentPage===1} onClick={()=>changePage(currentPage-1)}><ChevronLeft size={17}/></button><span>Sayfa {formatCount(currentPage)} / {formatCount(pages)}</span><button aria-label="Sonraki sayfa" disabled={currentPage===pages} onClick={()=>changePage(currentPage+1)}><ChevronRight size={17}/></button></div></div>}
 </section>;
}
