import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowRight, Search, ShoppingBag, MessageCircle, Phone, Mail, X, Plus, Minus, Menu, Truck, ShieldCheck, Headphones, PackageCheck, Check } from 'lucide-react';
import './style.css';
import Academy, {AcademyCards} from './Academy';
import {articles} from './academy-data';
import ProductImage from './ProductImage';
import CatalogGrid from './CatalogGrid';
import ProductSpecs from './ProductSpecs';
import { loadCatalog } from './catalog-loader';
import './catalog.css';
import CompanySections from './CompanySections';
import QuoteRequest from './QuoteRequest';
import { company } from './company';
import { createQuoteText, supportWhatsAppUrl } from './quote';
import TechnicalSearch from './TechnicalSearch';
import ProductNavigation from './ProductNavigation';
import { productGroups } from './catalog-groups';
import { usePageRoute, selectionPath, companyPages } from './routes';
const AdminPage=lazy(()=>import('./AdminPage'));
import catalogSummary from './catalog-summary.json';
import {readCart,resolveCart,saveCart,hydrateCart} from './cart';
import {readCatalogFilters,updateCatalogParams} from './catalog-filters';
import './pages.css';
import './theme.css';
import {SiteProvider,staticSite,useSite} from './data/SiteContext';
import {dataMode,safeLink} from './data/repository';
import RichContent from './data/RichContent';
import {makeWhatsAppUrl} from './quote';
const CloudApp=lazy(()=>import('./data/CloudApp'));
import {MemberProvider} from './members/MemberContext';
import Analytics,{trackEvent} from './members/Analytics';
import ManagedTexts from './data/ManagedTexts';
import './members/members.css';
const AccountPage=lazy(()=>import('./members/AccountPage'));
const Campaigns=lazy(()=>import('./members/Campaigns'));


function App({products,manifest,productIndex,stats,catalogLoading,catalogError,retryCatalog,requestCatalog,remoteCatalog,cartLoading=false,cartError='',onCartChange}){
 const site=useSite();const company=site.company,productGroups=site.groups,articles=site.articles;
 const supportWhatsAppUrl=makeWhatsAppUrl('Merhaba, ürün seçimi ve fiyat teklifi konusunda bilgi almak istiyorum.',company);
 const footer=site.settings.footer||{};const customPage=site.pages.find(p=>'/'+p.slug===window.location.hash.slice(1).split('?')[0]);
 const logo=site.remote?site.identity.logoUrl:import.meta.env.BASE_URL+'brand/rulman-teklif.webp';
 const [route,navigate]=usePageRoute();
 const isHome=route.path==='/';
 const isCatalog=route.path==='/urunler'||productGroups.some(g=>route.path===`/urunler/${g.id}`);
 const isTechnical=route.path==='/teknik-arama';
 const companyPage=companyPages.some(([path])=>path===route.path)?route.path.slice(1):null;
 const isCampaigns=route.path==='/kampanyalar';const isAccount=route.path==='/hesabim';
 const isAcademy=route.path==='/akademi'||route.path.startsWith('/akademi/');
 const known=isCampaigns||isAccount||customPage||isAcademy||isHome||isCatalog||isTechnical||companyPage||route.path==='/admin';
 const source='all';
 const {category,brand,search:appliedSearch,technicalQuery,error:filterError}=useMemo(()=>readCatalogFilters(route,productGroups),[route,productGroups]);
 function changeBrand(value){navigate(updateCatalogParams(route,{marka:value==='Tüm markalar'?null:value}))}
 function clearTechnical(){navigate(updateCatalogParams(route,{kod:null,inner:null,outer:null,width:null}))}
 const [quoteDetails,setQuoteDetails]=useState({customer:'',email:'',note:''});
 const byId=useMemo(()=>productIndex||new Map(products.map(p=>[p.id,p])),[products,productIndex]);

 function runTechnicalSearch(query){const params=new URLSearchParams();if(query.code)params.set('kod',query.code);for(const key of ['inner','outer','width'])if(query[key]!==undefined)params.set(key,query[key]);navigate('/urunler?'+params.toString())}
 const [search,setSearch]=useState('');const [storedCart,setStoredCart]=useState(()=>readCart().map(p=>site.remote?{...p,id:String(p.id)}:p));
 useEffect(()=>{onCartChange?.(storedCart)},[storedCart]);
 const cartRecords=useMemo(()=>hydrateCart(storedCart,byId),[storedCart,byId]);
 const cart=useMemo(()=>resolveCart(cartRecords,byId),[cartRecords,byId]);
 const [drawer,setDrawer]=useState(false);const [detail,setDetail]=useState(null);const [mobile,setMobile]=useState(false);const [toast,setToast]=useState('');
 useEffect(()=>{if(detail)trackEvent('product_view',detail);},[detail?.id]);
 useEffect(()=>{if(!detail?.remote)return;let active=true;site.repository.products([detail.id]).then(rows=>{if(active){setDetail(rows[0]||null);if(!rows.length)setToast('Bu ürün şu anda yayında değil.')}}).catch(()=>{if(active)setToast('Ürün bilgileri yenilenemedi. Lütfen tekrar deneyin.')});return()=>{active=false}},[site.revision]);
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
    const controls=dialog&&[...dialog.querySelectorAll('button,a[href],input,select,textarea,[tabindex]')].filter(el=>el.tabIndex>=0&&!el.matches(':disabled')&&el.getClientRects().length);
    if(!controls?.length)return;
    const first=controls[0],last=controls[controls.length-1];
    if(!dialog.contains(document.activeElement)){e.preventDefault();first.focus()}
    else if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
   }
  }
  document.addEventListener('keydown',keyboard);
  return ()=>{document.body.style.overflow=original;document.removeEventListener('keydown',keyboard);previous?.focus()};
 },[drawer,detail]);
 useEffect(()=>{const sync=event=>{if(event.key===null||event.key==='rulman-teklif-cart')setStoredCart(readCart().map(p=>site.remote?{...p,id:String(p.id)}:p))};window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync)},[]);
 const quoteLines=useMemo(()=>cart.map(item=>({...byId.get(item.id),qty:item.qty})),[cart,byId]);
 const missing=cartRecords.filter(x=>!byId.has(x.id));
 const total=cartRecords.reduce((s,p)=>s+p.qty,0);
 function update(next){setStoredCart(next);const saved=saveCart(next);if(!saved)setToast('Sepet bu oturumda kullanılabilir; tarayıcı kalıcı kayda izin vermedi.');return saved}
 function add(p){const saved=update(cartRecords.some(x=>x.id===p.id)?cartRecords.map(x=>x.id===p.id?{...x,qty:Math.min(1000000,x.qty+1)}:x):[...cartRecords,{id:p.id,qty:1}]);setToast(saved?`${p.code} teklif listenize eklendi`:`${p.code} eklendi. Sepet yalnızca bu oturumda saklanabiliyor.`);setTimeout(()=>setToast(''),3500)}
 function qty(id,delta){update(cartRecords.map(x=>x.id===id?{...x,qty:Math.min(1000000,x.qty+delta)}:x).filter(x=>x.qty>0))}
 function choose(name){setMobile(false);const selected=new URL(selectionPath(name,productGroups),'https://local.invalid');const params=new URLSearchParams(route.params);params.delete('kategori');params.delete('sayfa');if(selected.searchParams.has('kategori'))params.set('kategori',selected.searchParams.get('kategori'));navigate(selected.pathname+(params.size?'?'+params.toString():''))}
 function download(){const text=createQuoteText(quoteLines,quoteDetails)+'\n\nTeklif taslağıdır. Fiyat ve stok teyidi gerekir.';const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='rulman-teklif-talebi.txt';a.click();URL.revokeObjectURL(url)}

 useEffect(()=>{
  const group=productGroups.find(g=>route.path===`/urunler/${g.id}`);
  setSearch(route.params.get('ara')||'');setMobile(false);setDetail(null);
  const title=isCampaigns?'Kampanyalı ürünler':isAccount?'Üye hesabı':companyPages.find(([path])=>path===route.path)?.[1]||group?.name||(isTechnical?'Teknik arama':isCatalog?'Ürünler':isAcademy?(articles.find(a=>route.path==='/akademi/'+a.slug)?.title||'Rulman Akademisi'):route.path==='/admin'?'Yönetim paneli':'Ana sayfa');
  document.title=title+' | '+company.name;window.scrollTo({top:0,behavior:'instant'});
 },[route]);

 useEffect(()=>{if(!site.remote)return;const article=site.articles.find(a=>route.path==='/akademi/'+a.slug);const seo=article?.seo||customPage?.seo||site.settings.seo||{};const title=seo.metaTitle||seo.title||article?.title||customPage?.title;document.title=title?title+' | '+company.name:company.name;const description=document.querySelector('meta[name="description"]');if(description)description.content=seo.metaDescription||seo.description||site.settings.seo?.description||''},[route,site]);

 if(site.remote&&site.settings.maintenance?.enabled&&route.path!=='/admin')return <main className="container catalog-status"><h1>{company.name}</h1><p>{site.settings.maintenance.message}</p><a href="#/admin">Yönetici girişi</a></main>;
 const homeContent=kind=>site.home.find(section=>section.kind===kind)?.content;
 const renderHero=(content=homeContent('hero'))=>site.remote?<section className="hero"><div className="container hero-inner"><div className="hero-copy"><span className="eyebrow">{content?.eyebrow}</span><h1>{content?.title}<br/><em>{content?.highlight}</em></h1><p>{content?.description}</p><a className="primary" href={safeLink(content?.button?.href)}>{content?.button?.text}<ArrowRight size={19}/></a><div className="hero-bottom">{content?.tags?.map(text=><span key={text}>{text}</span>)}</div></div><div className="hero-photo">{site.media.get(content?.image)&&<img src={site.media.get(content.image).full} alt={content.imageAlt||''} width="600" height="600"/>}<span>{content?.caption}</span></div></div></section>:null;
 const renderBenefits=(content=homeContent('benefits'))=> <div className="benefits container">{(content?.cards||[]).map(([icon,title,text])=>{const Icon={ShieldCheck,Truck,Headphones,PackageCheck}[icon]||ShieldCheck;return <div key={title}><Icon size={29}/><span><b>{title}</b><small>{text}</small></span></div>})}</div>;
 const renderCatalog=()=>!catalogLoading&&!catalogError?<CatalogGrid remote={remoteCatalog} stats={stats} standalone={isCatalog} products={products} manifest={manifest} category={category} setCategory={choose} search={appliedSearch} brand={brand} setBrand={changeBrand} technicalQuery={technicalQuery} filterError={filterError} onClearTechnical={clearTechnical} onReset={()=>navigate('/urunler')} source={source} onSelect={choose} onDetail={setDetail} onAdd={add}/>:<CatalogStatus loading={catalogLoading} error={catalogError} retry={retryCatalog}/>;
 return <>{site.remote&&site.settings.announcements?.enabled&&<div className="announcement-bar"><a href={safeLink(site.settings.announcements.href)}>{site.settings.announcements.text}</a></div>}<a className="skip-link" href="#main-content" onClick={event=>{event.preventDefault();document.getElementById("main-content").focus();document.getElementById("main-content").scrollIntoView()}}>İçeriğe geç</a><div className="topbar" role="region" aria-label="İletişim bilgileri"><div className="container"><span>{site.remote?site.identity.topbar:'Sanayinin gücü, doğru rulmanla başlar.'}</span><span><a href={company.phoneHref}><Phone size={12}/>{company.phone}</a><i/><a href={company.emailHref}>{company.email}</a></span></div></div>
 <header><div className="container head"><a className="logo" href="#/" ><img className="brand-symbol" src={logo} alt="" width="56" height="56"/><div>{site.remote?company.name:<>RULMAN <b>TEKLİF</b></>}<small>{site.remote?site.identity.slogan:'ENDÜSTRİYEL ÇÖZÜM ORTAĞINIZ'}</small></div></a><form className="search" onSubmit={e=>{e.preventDefault();navigate('/urunler?ara='+encodeURIComponent(search))}}><Search size={20}/><input aria-label="Ürün ara" placeholder="Ürün adı, marka veya ürün kodu arayın..." value={search} onChange={e=>setSearch(e.target.value)}/><button aria-label="Ara"><ArrowRight size={20}/></button></form><button className="cart-button" onClick={()=>{requestCatalog();setDrawer(true)}}><ShoppingBag size={23}/><span>Teklif sepetim<small>{catalogLoading&&storedCart.length?'Kaydedilmiş liste':`${total} ürün`}</small></span><b>{catalogLoading&&storedCart.length?'…':total}</b></button><button className="mobile-menu" aria-label="Menüyü aç" onClick={()=>setMobile(!mobile)}><Menu/></button></div></header>
 <ProductNavigation stats={stats} open={mobile} onToggle={setMobile} onSelect={choose} selected={category} products={products} productCount={manifest.totalProducts} path={route.path}/>
 <main id="main-content" tabIndex={-1}>{((isHome&&!site.remote)||isTechnical)&&<TechnicalSearch standalone={isTechnical} onSearch={runTechnicalSearch} productCount={manifest.totalProducts}/>}
 {isHome&&!site.remote&&<><section className="hero"><div className="container hero-inner"><div className="hero-copy"><span className="eyebrow"><span/> HAREKETİN OLDUĞU HER YERDE</span><h1>Güçlü hareket.<br/><em>Kesintisiz üretim.</em></h1><p>Rulmandan güç aktarımına, endüstrinizin ihtiyaç duyduğu çözümler tek bir adreste.</p><a className="primary" href="#/urunler">Ürünleri keşfet <ArrowRight size={19}/></a><div className="hero-bottom"><span>Hassas mühendislik</span><i/><span>Güvenilir çözümler</span></div></div><div className="hero-photo"><img src={import.meta.env.BASE_URL+'catalog/thumbnails/images_396aa49799f72e8af4aecb24.png-full.webp'} alt="Oynak makaralı rulmanın iç yapısı" width="600" height="600"/><span>Yüksek hassasiyet. Güvenilir hareket.</span></div></div></section>
 <div className="benefits container">{[{icon:ShieldCheck,title:'Güvenilir ürünler',text:'Kalite odaklı ürün seçimi'},{icon:Truck,title:'Türkiye geneli teslimat',text:'İşinizin olduğu her yere'},{icon:Headphones,title:'Teknik destek',text:'Doğru ürün için yanınızdayız'},{icon:PackageCheck,title:'Geniş ürün seçeneği',text:'Endüstriye özel çözümler'}].map(b=><div key={b.title}><b.icon size={29}/><span><b>{b.title}</b><small>{b.text}</small></span></div>)}</div>
 </>}
 {(isCatalog||(isHome&&!site.remote))&&renderCatalog()}
 {isHome&&!site.remote&&<AcademyCards featured/>}
 {isHome&&site.remote&&site.home.map(section=><React.Fragment key={section.id}>{section.kind==='technical_search'?<TechnicalSearch onSearch={runTechnicalSearch} productCount={manifest.totalProducts}/>:section.kind==='hero'?renderHero(section.content):section.kind==='benefits'?renderBenefits(section.content):section.kind==='catalog'?renderCatalog():section.kind==='academy'?<AcademyCards featured/>:section.kind==='campaigns'?<Suspense fallback={<p role="status">Kampanyalar yükleniyor…</p>}><Campaigns featured onDetail={setDetail} onAdd={add}/></Suspense>:section.kind==='rich_text'?<section className="container managed-section"><h2>{section.content.title}</h2><RichContent document={section.content.document}/></section>:section.kind==='statistics'?<section className="container managed-statistics">{(section.content.items||[]).map((s,i)=><div key={i}><b>{s.value}</b><span>{s.label}</span></div>)}</section>:section.kind==='contact'?<section className="container managed-section"><h2>{section.content.title||'İletişim'}</h2><p>{company.address}</p><a href={company.phoneHref}>{company.phone}</a></section>:section.kind==='brands'?<section className="container managed-section"><h2>{section.content.title||'Markalar'}</h2><div className="managed-brands">{(stats?.brands||[]).slice(0,24).map(b=><a key={b.id||b.name} href={'#/urunler?marka='+encodeURIComponent(b.name)}>{b.name}</a>)}</div></section>:section.kind==='slider'?<section className="container managed-slider">{(section.content.items||[]).map((s,i)=><article key={i}>{site.media.get(s.image)&&<img src={site.media.get(s.image).src} alt={s.imageAlt||''}/>}<h2>{s.title}</h2><p>{s.description}</p><a className="primary" href={safeLink(s.href)}>{s.text||'İncele'}</a></article>)}</section>:null}</React.Fragment>)}
 {isCampaigns&&<Suspense fallback={<p role="status">Kampanyalar yükleniyor…</p>}><Campaigns onDetail={setDetail} onAdd={add}/></Suspense>}{isAccount&&<Suspense fallback={<p role="status">Üyelik yükleniyor…</p>}><AccountPage/></Suspense>}
 {isAcademy&&<Academy slug={route.path.split("/")[2]}/>}
 {companyPage&&<div className="standalone-page"><div className="container page-breadcrumb"><a href="#/">Ana sayfa</a><span>/</span><span>{companyPages.find(([path])=>path===route.path)?.[1]}</span></div>{companyPage==='markalar'&&(catalogLoading||catalogError)?<CatalogStatus loading={catalogLoading} error={catalogError} retry={retryCatalog}/>:<CompanySections stats={stats} page={companyPage} products={products} onBrand={name=>navigate('/urunler?marka='+encodeURIComponent(name))} onQuote={()=>{requestCatalog();setDrawer(true)}} quoteBusy={site.remote&&(cartLoading||!!cartError)} quoteLines={quoteLines} quoteDetails={quoteDetails} onQuoteChange={setQuoteDetails} onDownload={download}/>}</div>}
 {customPage&&!companyPage&&!isCatalog&&!isAcademy&&!isTechnical&&route.path!=='/admin'&&<section className="container standalone-page"><h1>{customPage.title}</h1><RichContent document={customPage.body}/></section>}
 {route.path==='/admin'&&<Suspense fallback={<section className="container admin-page" role="status"><h1>Yönetim paneli</h1><p>Yönetim sayfası yükleniyor…</p></section>}><AdminPage/></Suspense>}
 {!known&&<section className="container not-found"><h1>Sayfa bulunamadı</h1><a href="#/">Ana sayfaya dön</a></section>}</main>
 <footer><div className="container footer-main"><div><a className="logo footer-logo" href="#/"><img className="brand-symbol" src={logo} alt="" width="56" height="56"/><div>{site.remote?company.name:<>RULMAN <b>TEKLİF</b></>}<small>{site.remote?site.identity.slogan:'ENDÜSTRİYEL ÇÖZÜM ORTAĞINIZ'}</small></div></a><p>{site.remote?footer.description:<>Dolapdere’den Türkiye’ye<br/>endüstriyel tedarik ve teknik destek.</>}</p><div className="footer-contact"><a href={company.phoneHref}><Phone size={14}/>{company.phone}</a><a href={company.emailHref}><Mail size={14}/>{company.email}</a><span>{company.address}</span>{(company.social||[]).map((link,i)=><a key={i} href={safeLink(link.href)} target="_blank" rel="noopener noreferrer">{link.label}</a>)}</div></div><div><h2 className="footer-heading">Ürün grupları</h2>{site.remote?site.menus.filter(m=>m.menu_id==='footer'&&!m.parent_id&&m.href.startsWith('#/urunler/')).map(m=><a key={m.id} href={safeLink(m.href)}>{m.label}</a>):productGroups.map(group=><button key={group.id} onClick={()=>choose(`group:${group.id}`)}>{group.name}</button>)}</div><div><h2 className="footer-heading">Keşfedin</h2>{site.remote?site.menus.filter(m=>m.menu_id==='footer'&&!m.parent_id&&!m.href.startsWith('#/urunler/')).map(m=><a key={m.id} href={safeLink(m.href)}>{m.label}</a>):<><a href="#/hakkimizda">Hakkımızda</a><a href="#/markalar">Markalar</a><a href="#/iletisim">İletişim</a><a href="#/teklif">Teklif al</a><a href="#/akademi">Rulman Akademisi</a></>}</div><div><h2 className="footer-heading">{site.remote?(footer.ctaTitle||'Birlikte başlayalım.'):'Birlikte başlayalım.'}</h2><p>Ürünlerinizi seçin, adetlerini belirleyin.<br/>Formla veya WhatsApp ile teklif isteyin.</p><button className="footer-cta" onClick={()=>{requestCatalog();setDrawer(true)}}>{site.remote?(footer.cta||'Teklif sepetimi aç'):'Teklif sepetimi aç'} <ArrowRight size={18}/></button><a className="footer-whatsapp" href={supportWhatsAppUrl} target="_blank" rel="noopener noreferrer"><MessageCircle size={16}/> WhatsApp ile iletişim</a><small>{company.weekdayHours}<br/>{company.saturdayHours}</small></div></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} Rulman Teklif · <a href="#/admin">Yönetici girişi</a></span><span>{site.remote?footer.disclaimer:'Fiyat, stok ve teslimat bilgileri teklif aşamasında teyit edilir.'}</span></div><div className="container"><button className="privacy-settings" onClick={()=>window.dispatchEvent(new Event('rt-analysis-preferences'))}>Analiz tercihleri</button><a href="#/hesabim">Üye hesabım</a></div></footer><Analytics/><ManagedTexts/>
 <aside aria-label="WhatsApp destek"><a className="whatsapp-float" href={supportWhatsAppUrl} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp destek hattını aç"><MessageCircle size={25}/><span>WhatsApp destek</span></a></aside>
 {toast&&<div className="toast" role="status"><Check size={19}/>{toast}<button aria-label="Bildirimi kapat" onClick={()=>setToast('')}><X size={16}/></button></div>}
 {drawer&&<div className="overlay" onClick={()=>setDrawer(false)}><section className="drawer" role="dialog" aria-modal="true" aria-label="Teklif sepetim" onClick={e=>e.stopPropagation()}><div className="dialog-head"><div><small>RULMAN TEKLİF</small><h2>Teklif sepetim <span>({total})</span></h2></div><button aria-label="Sepeti kapat" onClick={()=>setDrawer(false)}><X/></button></div>{(site.remote?cartLoading:catalogLoading)||(site.remote?cartError:catalogError)?<CatalogStatus loading={site.remote?cartLoading:catalogLoading} error={site.remote?cartError:catalogError} retry={retryCatalog}/>:cart.length?<><div className="cart-items">{missing.length>0&&<p role="status">{missing.length} kayıtlı ürün şu anda yayında değil. Diğer ürünleriniz korunuyor. <button className="spec-retry" onClick={()=>update(cartRecords.filter(item=>byId.has(item.id)))}>Yayında olmayan kayıtları kaldır</button></p>}{cart.map(x=>{const p=byId.get(x.id);return <div className="cart-item" key={x.id}><div className="cart-image"><ProductImage product={p}/></div><div><small>{p.brand}</small><h3>{p.code}</h3><p>{p.name}</p><div className="quantity"><button aria-label={`${p.code} azalt`} onClick={()=>qty(x.id,-1)}><Minus size={14}/></button><span>{x.qty}</span><button aria-label={`${p.code} artır`} onClick={()=>qty(x.id,1)}><Plus size={14}/></button></div></div><button className="remove" aria-label={`${p.code} kaldır`} onClick={()=>update(cartRecords.filter(x=>x.id!==p.id))}><X size={17}/></button></div>})}</div><div className="cart-summary"><QuoteRequest compact lines={quoteLines} details={quoteDetails} onChange={setQuoteDetails} onDownload={download}/></div></>:<div className="cart-empty-state">{missing.length>0&&<p role="status">{missing.length} kayıtlı ürün şu anda yayında değil. Kayıtlı listeniz korunuyor. <button className="spec-retry" onClick={()=>update(cartRecords.filter(item=>byId.has(item.id)))}>Yayında olmayan kayıtları kaldır</button></p>}<div className="empty"><ShoppingBag size={40}/><h3>Teklifinizi birlikte hazırlayalım.</h3><p>Ürünleri sepetinize ekleyin veya aradığınız kodu aşağıya yazın.</p><button className="primary" onClick={()=>{setDrawer(false);choose('Tüm ürünler')}}>Ürünleri keşfet <ArrowRight size={17}/></button></div><div className="cart-summary"><QuoteRequest compact lines={quoteLines} details={quoteDetails} onChange={setQuoteDetails} onDownload={download}/></div></div>}</section></div>}
 {detail&&<div className="overlay modal-overlay" onClick={()=>setDetail(null)}><section className={'detail-modal'+(detail.imageStatus==='pending'?' detail-modal-text':'')} role="dialog" aria-modal="true" aria-label={`${detail.code} ürün bilgileri`} onClick={e=>e.stopPropagation()}><button className="modal-close" aria-label="Ürün detayını kapat" onClick={()=>setDetail(null)}><X/></button>{detail.imageStatus!=='pending'&&<div className="detail-image"><ProductImage product={detail} detail/></div>}<div className="detail-copy"><span className="section-tag">{detail.brand} · {detail.category}</span><h2>{detail.code}</h2><p>{detail.name}</p>{detail.imageStatus==='pending'&&<p className="photo-pending-note">Ürüne özel fotoğraf henüz eklenmedi.</p>}<ProductSpecs product={detail} key={site.revision+detail.id}/><dl><dt>Ölçüler</dt><dd>{detail.size}</dd><dt>{detail.referenceCode?'Referans kodu':'Ürün kodu'}</dt><dd>{detail.code}</dd>{detail.manufacturerCode&&detail.manufacturerCode!==detail.code&&<><dt>Üretici kodu</dt><dd>{detail.manufacturerCode}</dd></>}<dt>Fiyat / stok</dt><dd>Teklif aşamasında doğrulanır</dd></dl><button className="primary" onClick={()=>add(detail)}><Plus size={18}/> Teklif sepetine ekle</button><small>Sipariş öncesinde teknik uygunluk doğrulanmalıdır.</small></div></section></div>}
 </>;
}
const emptyCatalog={products:[],manifest:catalogSummary};
function CatalogStatus({loading,error,retry}){
 return <section className="container catalog-status" role={error?'alert':'status'} aria-live="polite"><h2>{error?'Katalog yüklenemedi':'Ürün kataloğu hazırlanıyor'}</h2><p>{error||'Arama ve ürünler kısa süre içinde hazır olacak. Diğer sayfaları incelemeye devam edebilirsiniz.'}</p>{loading&&<span className="loading-ring"/>}{error&&<button className="primary" onClick={retry}>Tekrar dene</button>}</section>;
}
function CatalogApp(){
 const [route]=usePageRoute();
 const [catalog,setCatalog]=useState(null);const [error,setError]=useState('');const [attempt,setAttempt]=useState(0);const [requested,setRequested]=useState(false);
 const needed=requested||['/','/markalar','/teklif','/teknik-arama'].includes(route.path)||route.path.startsWith('/urunler');
 useEffect(()=>{if(!needed||catalog)return;let active=true;setError('');loadCatalog().then(data=>{if(active)setCatalog(data)}).catch(()=>{if(active)setError('Ürün kataloğu yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.')});return()=>{active=false}},[needed,attempt,catalog]);
 return <App {...(catalog||emptyCatalog)} catalogLoading={!catalog&&!error} catalogError={error} retryCatalog={()=>setAttempt(a=>a+1)} requestCatalog={()=>setRequested(true)}/>;
}
import {initializeAuthCallback} from './supabase/callback';
import {hasAuthCallback} from './supabase/config';
const applicationRoot=createRoot(document.getElementById('root'));
if(hasAuthCallback(window.location))applicationRoot.render(<main className="catalog-loading" role="status"><h1>Giriş bağlantısı doğrulanıyor</h1><p>Lütfen bekleyin…</p></main>);
function SiteEntry(){const [route]=usePageRoute();return dataMode(import.meta.env)==='supabase'&&route.path!=='/admin'?<Suspense fallback={<p role="status">Site yükleniyor…</p>}><CloudApp App={App}/></Suspense>:<SiteProvider value={staticSite}><CatalogApp/></SiteProvider>}
initializeAuthCallback().finally(()=>applicationRoot.render(<MemberProvider><SiteEntry/></MemberProvider>));
