import React, {useState, useEffect, useRef} from 'react';
import {Menu, ChevronDown, ArrowRight, X, CircleDot, MoveHorizontal, Wrench, Cog, Layers} from 'lucide-react';
import {productGroups} from './catalog-groups';
import './product-navigation.css';
import {formatCount} from './catalog-data';

const icons={bearings:CircleDot,housings:Cog,linear:MoveHorizontal,maintenance:Wrench,transmission:Layers};

export default function ProductNavigation({open,onToggle,onSelect,selected,products}) {
 const [active,setActive]=useState(null);
 const root=useRef(null);
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
   <button ref={el=>buttons.current.all=el} className={'all-categories '+(allOpen?'is-open':'')} onClick={()=>{setActive(null);onToggle(!allOpen)}} aria-expanded={Boolean(allOpen)} aria-controls="product-navigation-panel"><Menu size={18}/> TÜM ÜRÜNLER <ChevronDown size={14}/></button>
   <div className="desktop-product-links">{productGroups.slice(0,4).map(group=><button key={group.id} ref={el=>buttons.current[group.id]=el} className={active===group.id||selected===`group:${group.id}`?'is-open':''} onClick={()=>{onToggle(false);setActive(active===group.id?null:group.id)}} aria-expanded={active===group.id} aria-controls="product-navigation-panel">{group.name}<ChevronDown size={12}/></button>)}</div>
   <div className="company-nav-links"><a href="#markalar" onClick={()=>{setActive(null);onToggle(false)}}>Markalar</a><a href="#hakkimizda" onClick={()=>{setActive(null);onToggle(false)}}>Hakkımızda</a><a href="#teklif" onClick={()=>{setActive(null);onToggle(false)}}>Teklif al</a></div>
   <a href="#technical-title" className="technical-nav-link" onClick={()=>{setActive(null);onToggle(false)}}>Teknik arama</a>
   <a href="#iletisim" className="product-nav-contact">İletişim</a>
  </div></nav>
  {hasPanel&&<div className="container product-megamenu" id="product-navigation-panel">
   <div className="mega-heading"><div><span>ÜRÜN KATALOĞU</span><h2>{allOpen?'Ürün gruplarını keşfedin':groups[0]?.name}</h2></div><button aria-label="Ürün menüsünü kapat" onClick={()=>{setActive(null);onToggle(false)}}><X size={20}/></button></div>
   <div className="mega-company-links">{[['#hakkimizda','Hakkımızda'],['#markalar','Markalar'],['#iletisim','İletişim'],['#teklif','Teklif al']].map(([href,label])=><a href={href} key={href} onClick={()=>{setActive(null);onToggle(false)}}>{label}</a>)}</div>
   {allOpen&&<button className="mega-all" onClick={()=>select('Tüm ürünler')}>Tüm ürünleri görüntüle <span>{formatCount(products.length)} ürün</span><ArrowRight size={16}/></button>}
   <div className={'mega-groups '+(!allOpen?'single-group':'')}>{groups.map(group=>{const Icon=icons[group.id]||Layers;const count=products.filter(p=>group.categories.includes(p.category)).length;return <section key={group.id}>
    <div className="mega-group-title"><Icon size={21}/><h3>{group.name}</h3></div><p>{group.description}</p>
    <button className="mega-group-all" onClick={()=>select(`group:${group.id}`)}>Grubun tüm ürünleri <ArrowRight size={14}/></button>
    <div className="mega-category-links">{group.categories.map(category=><button key={category} onClick={()=>select(category)}>{category}<ArrowRight size={13}/></button>)}</div>
    <small>{count?`${formatCount(count)} ürün`:'Ürün verileri henüz eklenmedi'}</small>
   </section>})}</div>
  </div>}
 </div>;
}
