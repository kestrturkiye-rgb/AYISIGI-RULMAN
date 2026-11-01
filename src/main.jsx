import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowRight, Search, ShoppingBag, X, Plus, Minus, Menu, Truck, ShieldCheck, Headphones, PackageCheck, ChevronDown, ArrowUpRight, Check, Download, Settings, CircleDot, Cog, Layers } from 'lucide-react';
import './style.css';
import Bearing from './Bearing';
import ProductImage from './ProductImage';
import CatalogGrid from './CatalogGrid';
import ProductSpecs from './ProductSpecs';
import { loadCatalog, formatCount } from './catalog-data';
import './catalog.css';
import TechnicalSearch from './TechnicalSearch';
import { matchesTechnicalQuery } from './technical-search';
import ProductNavigation from './ProductNavigation';
import { productGroups, matchesCategory, selectionName } from './catalog-groups';

const categories = [{name:'Tüm ürünler',icon:Layers},...productGroups.flatMap(group=>group.categories.map(name=>({name,icon:group.id==='bearings'?CircleDot:group.id==='housings'?Cog:group.id==='linear'?ArrowRight:Settings})))];



function App({products,manifest}){
 const [source,setSource]=useState('all');
 const byId=useMemo(()=>new Map(products.map(p=>[p.id,p])),[products]);
 const [technicalQuery,setTechnicalQuery]=useState(null);
 function runTechnicalSearch(query){setTechnicalQuery(query);setSource('all');setSearch('');setCategory('Tüm ürünler');setBrand('Tüm markalar');document.getElementById('urunler').scrollIntoView({behavior:'smooth'})}
 const [category,setCategory]=useState('Tüm ürünler');const [search,setSearch]=useState('');const [cart,setCart]=useState(()=>{try{const legacy={1:['SKF','6204 2RS'],2:['FAG','6205 ZZ'],3:['TIMKEN','30206'],4:['NSK','UCP 205'],5:['NSK','6306 2RS'],6:['SKF','22210 E'],7:['ENDÜSTRİYEL','08B-1'],8:['FAG','6001 ZZ']};const data=JSON.parse(localStorage.getItem('rulman-teklif-cart')||localStorage.getItem('ayisigi-cart')||'[]');const entries=Array.isArray(data)?data.map(item=>{if(typeof item.id==='number'&&legacy[item.id]){const [brand,code]=legacy[item.id];const match=products.find(p=>p.brand===brand&&p.code.replace(/[\s-]/g,'')===code.replace(/[\s-]/g,''));return match?{id:match.id,qty:item.qty}:item}return item}):[];return entries.filter(x=>products.some(p=>p.id===x.id)&&Number.isInteger(x.qty)&&x.qty>0)}catch{return []}});
 const [drawer,setDrawer]=useState(false);const [detail,setDetail]=useState(null);const [mobile,setMobile]=useState(false);const [toast,setToast]=useState('');const [brand,setBrand]=useState('Tüm markalar');
 useEffect(()=>{
  if(!drawer&&!detail)return;
  const previous=document.activeElement;
  const original=document.body.style.overflow;
  document.body.style.overflow='hidden';
  const dialog=document.querySelector('[role="dialog"]');
  dialog?.querySelector('button')?.focus();
  function keyboard(e){
   if(e.key==='Escape'){setDrawer(false);setDetail(null)}
   if(e.key==='Tab'){
    const controls=dialog?.querySelectorAll('button,a[href],input,select,textarea');
    if(!controls?.length)return;
    const first=controls[0],last=controls[controls.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
   }
  }
  document.addEventListener('keydown',keyboard);
  return ()=>{document.body.style.overflow=original;document.removeEventListener('keydown',keyboard);previous?.focus()};
 },[drawer,detail]);
 const total=cart.reduce((s,p)=>s+p.qty,0);
 function update(next){setCart(next);localStorage.setItem('rulman-teklif-cart',JSON.stringify(next))}
 function add(p){update(cart.some(x=>x.id===p.id)?cart.map(x=>x.id===p.id?{...x,qty:x.qty+1}:x):[...cart,{id:p.id,qty:1}]);setToast(`${p.code} teklif listenize eklendi`);setTimeout(()=>setToast(''),2800)}
 function qty(id,delta){update(cart.map(x=>x.id===id?{...x,qty:x.qty+delta}:x).filter(x=>x.qty>0))}
 function choose(name){setCategory(name);setSearch('');setTechnicalQuery(null);setBrand('Tüm markalar');setSource('all');setMobile(false);document.getElementById('urunler').scrollIntoView({behavior:'smooth'})}
 function download(){const text='RULMAN TEKLİF — TEKLİF TALEBİ\n\n'+cart.map(x=>{const p=byId.get(x.id);return `${p.brand} ${p.code} — ${p.name} — ${x.qty} adet`}).join('\n')+'\n\nAd / Firma:\nTelefon:\nE-posta:\nNot:\n\nBu dosya bir taslaktır. Talep henüz gönderilmemiştir.';const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='rulman-teklif-talebi.txt';a.click();URL.revokeObjectURL(url)}
 return <><div className="topbar"><div className="container"><span>Sanayinin gücü, doğru rulmanla başlar.</span><span>Teknik bilgi <i/> Güvenilir tedarik <i/> Türkiye geneli teslimat</span></div></div>
 <header><div className="container head"><a className="logo" href="#" aria-label="Rulman Teklif ana sayfa"><div className="logo-symbol"><Settings size={35}/><span/></div><div>RULMAN <b>TEKLİF</b><small>ENDÜSTRİYEL ÇÖZÜM ORTAĞINIZ</small></div></a><form className="search" onSubmit={e=>{e.preventDefault();setTechnicalQuery(null);setBrand('Tüm markalar');setCategory('Tüm ürünler');setSource('all');document.getElementById('urunler').scrollIntoView({behavior:'smooth'})}}><Search size={20}/><input aria-label="Ürün ara" placeholder="Ürün adı, marka veya rulman kodu arayın..." value={search} onChange={e=>{setSearch(e.target.value);setTechnicalQuery(null);setCategory('Tüm ürünler');setBrand('Tüm markalar');setSource('all')}}/><button aria-label="Ara"><ArrowRight size={20}/></button></form><button className="cart-button" onClick={()=>setDrawer(true)}><ShoppingBag size={23}/><span>Teklif sepetim<small>{total} ürün</small></span><b>{total}</b></button><button className="mobile-menu" aria-label="Menüyü aç" onClick={()=>setMobile(!mobile)}><Menu/></button></div></header>
 <ProductNavigation open={mobile} onToggle={setMobile} onSelect={choose} selected={category} products={products}/>
 <main><TechnicalSearch onSearch={runTechnicalSearch} productCount={products.length}/><section className="hero"><div className="container hero-inner"><div className="hero-copy"><span className="eyebrow"><span/> HAREKETİN OLDUĞU HER YERDE</span><h1>Güçlü hareket.<br/><em>Kesintisiz üretim.</em></h1><p>Rulmandan güç aktarımına, endüstrinizin ihtiyaç duyduğu çözümler tek bir adreste.</p><a className="primary" href="#urunler">Ürünleri keşfet <ArrowRight size={19}/></a><div className="hero-bottom"><span>Hassas mühendislik</span><i/><span>Güvenilir çözümler</span></div></div><div className="hero-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><span className="art-word">PRECISION</span><Bearing hero/><div className="art-label"><span className="label-line"/><span>HER DETAYDA<br/><b>YÜKSEK PERFORMANS</b></span></div><span className="hero-number">01 <small>/ 01</small></span></div></div></section>
 <div className="benefits container">{[{icon:ShieldCheck,title:'Güvenilir ürünler',text:'Kalite odaklı ürün seçimi'},{icon:Truck,title:'Türkiye geneli teslimat',text:'İşinizin olduğu her yere'},{icon:Headphones,title:'Teknik destek',text:'Doğru ürün için yanınızdayız'},{icon:PackageCheck,title:'Geniş ürün seçeneği',text:'Endüstriye özel çözümler'}].map(b=><div key={b.title}><b.icon size={29}/><span><b>{b.title}</b><small>{b.text}</small></span></div>)}</div>
 <CatalogGrid products={products} manifest={manifest} category={category} setCategory={setCategory} search={search} setSearch={setSearch} brand={brand} setBrand={setBrand} technicalQuery={technicalQuery} setTechnicalQuery={setTechnicalQuery} source={source} setSource={setSource} onSelect={choose} onDetail={setDetail} onAdd={add}/>
 <section className="container solution" id="hakkimizda"><div className="solution-icon"><Settings size={66}/></div><div><span className="section-tag">RULMAN TEKLİF</span><h2>Her sektör için doğru hareket.</h2><p>Bakım, onarım ve üretim ihtiyaçlarınız için rulman ve güç aktarım ürünlerini keşfedin.</p></div><a href="#urunler" className="outline">Ürünleri inceleyin <ArrowUpRight size={20}/></a></section>
 <section className="container brands" id="markalar"><span>KATALOĞUMUZDAKİ MARKALAR</span><div>{['SKF','FAG','NSK','TIMKEN'].map(b=><button key={b} onClick={()=>{choose('Tüm ürünler');setBrand(b)}}>{b}</button>)}</div><small>Marka adları, katalog ürünlerini tanımlamak amacıyla gösterilmiştir.</small></section></main>
 <footer id="iletisim"><div className="container footer-main"><div><a className="logo footer-logo" href="#"><Settings size={34}/><div>RULMAN <b>TEKLİF</b><small>ENDÜSTRİYEL ÇÖZÜM ORTAĞINIZ</small></div></a><p>Hareketin devamı için<br/>güvenilir çözüm ortağınız.</p></div><div><h4>Ürün grupları</h4>{productGroups.map(group=><button key={group.id} onClick={()=>choose(`group:${group.id}`)}>{group.name}</button>)}</div><div><h4>Keşfedin</h4><a href="#hakkimizda">Hakkımızda</a><a href="#markalar">Markalar</a><button onClick={()=>setDrawer(true)}>Teklif listem</button></div><div><h4>Birlikte başlayalım.</h4><p>İhtiyacınız olan ürünleri seçin,<br/>teklif listenizi kolayca hazırlayın.</p><button className="footer-cta" onClick={()=>setDrawer(true)}>Teklif listesi oluştur <ArrowRight size={18}/></button><small>İletişim bilgileri yakında eklenecek.</small></div></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} Rulman Teklif</span><span>Katalog verileri · Fiyat ve stok için teklif alın</span></div></footer>
 {toast&&<div className="toast" role="status"><Check size={19}/>{toast}<button aria-label="Bildirimi kapat" onClick={()=>setToast('')}><X size={16}/></button></div>}
 {drawer&&<div className="overlay" onClick={()=>setDrawer(false)}><section className="drawer" role="dialog" aria-modal="true" aria-label="Teklif sepetim" onClick={e=>e.stopPropagation()}><div className="dialog-head"><div><small>RULMAN TEKLİF</small><h2>Teklif sepetim <span>({total})</span></h2></div><button aria-label="Sepeti kapat" onClick={()=>setDrawer(false)}><X/></button></div>{cart.length?<><div className="cart-items">{cart.map(x=>{const p=byId.get(x.id);return <div className="cart-item" key={x.id}><div className="cart-image"><ProductImage product={p}/></div><div><small>{p.brand}</small><h3>{p.code}</h3><p>{p.name}</p><div className="quantity"><button aria-label={`${p.code} azalt`} onClick={()=>qty(x.id,-1)}><Minus size={14}/></button><span>{x.qty}</span><button aria-label={`${p.code} artır`} onClick={()=>qty(x.id,1)}><Plus size={14}/></button></div></div><button className="remove" aria-label={`${p.code} kaldır`} onClick={()=>update(cart.filter(x=>x.id!==p.id))}><X size={17}/></button></div>})}</div><div className="cart-summary"><p>Listenizde <b>{total} adet ürün</b> bulunuyor.</p><button className="primary" onClick={download}><Download size={18}/> Teklif listesini indir</button><small>Liste taslak olarak indirilir. Henüz firmaya talep gönderilmez; iletişim ve sipariş bağlantısı sonraki aşamada eklenecektir.</small></div></>:<div className="empty"><ShoppingBag size={44}/><h3>İlk ürününüzü ekleyin.</h3><p>İhtiyacınız olan ürünleri bir araya getirin.</p><button className="primary" onClick={()=>{setDrawer(false);choose('Tüm ürünler')}}>Ürünleri keşfet <ArrowRight size={17}/></button></div>}</section></div>}
 {detail&&<div className="overlay modal-overlay" onClick={()=>setDetail(null)}><section className="detail-modal" role="dialog" aria-modal="true" aria-label={`${detail.code} ürün bilgileri`} onClick={e=>e.stopPropagation()}><button className="modal-close" aria-label="Ürün detayını kapat" onClick={()=>setDetail(null)}><X/></button><div className="detail-image"><ProductImage product={detail}/></div><div className="detail-copy"><span className="section-tag">{detail.brand} · {detail.category}</span><h2>{detail.code}</h2><p>{detail.name}</p><ProductSpecs product={detail}/><dl><dt>Ölçüler</dt><dd>{detail.size}</dd><dt>Ürün kodu</dt><dd>{detail.code}</dd>{detail.manufacturerCode&&detail.manufacturerCode!==detail.code&&<><dt>Üretici kodu</dt><dd>{detail.manufacturerCode}</dd></>}<dt>Fiyat / stok</dt><dd>Teklif aşamasında doğrulanır</dd></dl><button className="primary" onClick={()=>add(detail)}><Plus size={18}/> Teklif sepetine ekle</button><small>Kaynak katalog bilgileri sunulmaktadır. Sipariş öncesinde teknik uygunluk doğrulanmalıdır.</small></div></section></div>}
 </>;
}
function CatalogApp(){
 const [catalog,setCatalog]=useState(null);const [error,setError]=useState('');const [attempt,setAttempt]=useState(0);
 useEffect(()=>{let active=true;setError('');loadCatalog().then(data=>{if(active)setCatalog(data)}).catch(()=>{if(active)setError('Ürün kataloğu yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.')});return()=>{active=false}},[attempt]);
 if(error)return <main className="catalog-loading" role="alert"><h1>Rulman Teklif</h1><p>{error}</p><button className="primary" onClick={()=>setAttempt(attempt+1)}>Tekrar dene</button></main>;
 if(!catalog)return <main className="catalog-loading" role="status"><h1>RULMAN <em>TEKLİF</em></h1><span className="loading-ring"/><p>Ürün kataloğu yükleniyor…</p></main>;
 return <App {...catalog}/>;
}
createRoot(document.getElementById('root')).render(<CatalogApp/>);
