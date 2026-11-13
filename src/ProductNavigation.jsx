import React, {useState, useEffect, useRef, useMemo} from 'react';
import {Menu, ChevronDown, ArrowRight, X, CircleDot, MoveHorizontal, Wrench, Cog, Layers} from 'lucide-react';
import {productGroups} from './catalog-groups';
import './product-navigation.css';
import {useSite} from './data/SiteContext';
import {safeLink} from './data/repository';
import {formatCount} from './catalog-utils';
import {companyPages, pageHref, groupPath} from './routes';

const icons={bearings:CircleDot,housings:Cog,linear:MoveHorizontal,maintenance:Wrench,transmission:Layers};

export default function ProductNavigation({stats,open,onToggle,onSelect,selected,products,path,productCount=products.length}) {
 const site=useSite();const productGroups=site.groups;
 const links=site.remote?site.menus.filter(m=>m.menu_id==='header'&&!m.parent_id&&!m.href.startsWith('#/urunler/')).map(m=>[safeLink(m.href),m.label]):[...companyPages,['/akademi','Akademi']].map(([path,label])=>[pageHref(path),label]);
 const headerGroups=site.remote?site.menus.filter(m=>m.menu_id==='header'&&!m.parent_id).map(m=>{const group=productGroups.find(g=>m.href===pageHref(groupPath(g.id)));return group?{...group,name:m.label}:null}).filter(Boolean):productGroups.slice(0,4);
 const secondaryGroups=productGroups.filter(group=>!headerGroups.some(primary=>primary.id===group.id));
 const [active,setActive]=useState(null);
 const counts=useMemo(()=>{if(stats)return stats.categories;const result={};for(const p of products)result[p.category]=(result[p.category]||0)+1;return result},[products,stats]);
 useEffect(()=>{setActive(null);onToggle(false)},[path,onToggle]);
 const root=useRef(null);const secondaryRef=useRef(null);
 useEffect(()=>{secondaryRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({block:'nearest',inline:'center'})},[path]);
 const buttons=useRef({});
 useEffect(()=>{
  function outside(event){if(!root.current?.contains(event.target)){setActive(null);if(open)onToggle(false)}}
  function escape(event){if(event.key==='Escape'){setActive(null);onToggle(false);buttons.current[active||'all']?.focus()}}
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape)};
 },[active,open,onToggle]);
 function select(value){setActive(null);onToggle(false);onSelect(value)}
 const allOpen=open||active==='all';
 const groups=allOpen?productGroups:productGroups.filter(g=>g.id===active);
 const hasPanel=allOpen||active;
 return <div className="product-navigation" ref={root}>
  <nav aria-label="Ürün gezinme"><div className="container product-nav-bar">
   <div className="nav-all"><a href="#/urunler" aria-current={path==='/urunler'?'page':undefined}>TÜM ÜRÜNLER</a><button ref={el=>buttons.current.all=el} className={'all-categories '+(allOpen?'is-open':'')} onClick={()=>{setActive(null);onToggle(!allOpen)}} aria-label="Ürün kategorilerini aç" aria-expanded={Boolean(allOpen)} aria-controls="product-navigation-panel"><ChevronDown size={14}/></button></div>
   <div className="desktop-product-links">{headerGroups.map(group=><div className="nav-product-group" key={group.id}><a href={pageHref(groupPath(group.id))} aria-current={path===groupPath(group.id)?'page':undefined}>{group.name}</a><button ref={el=>buttons.current[group.id]=el} onClick={()=>{onToggle(false);setActive(active===group.id?null:group.id)}} aria-label={`${group.name} alt kategorileri`} aria-expanded={active===group.id} aria-controls="product-navigation-panel"><ChevronDown size={12}/></button></div>)}</div>
   <div className="company-nav-links">{links.map(([target,label])=><a key={target} href={target} aria-current={'#'+path===target?'page':undefined} onClick={()=>{setActive(null);onToggle(false)}}>{label}</a>)}</div>
   <a href="#/teknik-arama" className="technical-nav-link" aria-current={path==='/teknik-arama'?'page':undefined} onClick={()=>{setActive(null);onToggle(false)}}>Teknik arama</a>
  </div></nav>
  {secondaryGroups.length>0&&<nav className="secondary-product-navigation" aria-label="Diğer ürün grupları"><div className="container secondary-product-links" ref={secondaryRef}>{secondaryGroups.map(group=><a key={group.id} href={pageHref(groupPath(group.id))} aria-current={path===groupPath(group.id)?'page':undefined} onClick={()=>{setActive(null);onToggle(false)}}>{group.name}<ArrowRight size={13}/></a>)}</div></nav>}
  {hasPanel&&<div className="container product-megamenu" id="product-navigation-panel">
   <div className="mega-heading"><div><span>ÜRÜN KATALOĞU</span><h2>{allOpen?'Ürün gruplarını keşfedin':groups[0]?.name}</h2></div><button aria-label="Ürün menüsünü kapat" onClick={()=>{setActive(null);onToggle(false)}}><X size={20}/></button></div>
   <div className="mega-company-links">{links.map(([target,label])=><a href={target} key={target} onClick={()=>{setActive(null);onToggle(false)}}>{label}</a>)}</div>
   {allOpen&&<button className="mega-all" onClick={()=>select('Tüm ürünler')}>Tüm ürünleri görüntüle <span>{formatCount(productCount)} ürün</span><ArrowRight size={16}/></button>}
   <div className={'mega-groups '+(!allOpen?'single-group':'')}>{groups.map(group=>{const Icon=icons[group.id]||Layers;const count=group.categories.reduce((sum,category)=>sum+(counts[category]||0),0);return <section key={group.id}>
    <div className="mega-group-title"><Icon size={21}/><h3>{group.name}</h3></div><p>{group.description}</p>
    <button className="mega-group-all" onClick={()=>select(`group:${group.id}`)}>Grubun tüm ürünleri <ArrowRight size={14}/></button>
    <div className="mega-category-links">{group.categories.map(category=><button key={category} onClick={()=>select(site.remote?`category:${group.categoryRecords.find(c=>c.name===category)?.id}`:category)}>{category}<ArrowRight size={13}/></button>)}</div>
    <small>{count?`${formatCount(count)} ürün`:'Ürün verileri henüz eklenmedi'}</small>
   </section>})}</div>
  </div>}
 </div>;
}
