import {translate as t,technicalText,getLanguage} from './i18n/core.js';
import {installLanguageNavigation} from './i18n/core.js';
import LanguageSwitch from './i18n/LanguageSwitch';
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
import {redirectToAuthHost} from './security/cookie-client.js';
import {decodePathSegment} from './seo/urls.js';
import Seo from './seo/Seo';
import GoogleTags from './seo/GoogleTags';
const PublicProduct=lazy(()=>import('./seo/PublicProduct'));
import ManagedTexts from './data/ManagedTexts';
import LegalPage,{LegalLinks} from './privacy/LegalPage';
import {legalSlug} from './privacy/policies';
import {isDiscoveryRoute} from './discovery';
import './members/members.css';
const AccountPage=lazy(()=>import('./members/AccountPage'));
const Campaigns=lazy(()=>import('./members/Campaigns'));


function App({products,manifest,productIndex,stats,catalogLoading,catalogError,retryCatalog,requestCatalog,remoteCatalog,cartLoading=false,cartError='',onCartChange}){
 const site=useSite();const company=site.company,productGroups=site.groups,articles=site.articles;
 const supportWhatsAppUrl=makeWhatsAppUrl(t('Merhaba, ürün seçimi ve fiyat teklifi konusunda bilgi almak istiyorum.'),company);
 const footer=site.settings.footer||{};
 const logo=site.remote?site.identity.logoUrl:import.meta.env.BASE_URL+'brand/rulman-teklif.webp';
 const [route,navigate]=usePageRoute();
 const customPage=site.pages.find(p=>'/'+p.slug===route.path);
 const isProduct=route.path.startsWith('/urun/');
 const isHome=route.path==='/';const legal=legalSlug(route.path);
 const isCatalog=route.path==='/urunler'||productGroups.some(g=>route.path===`/urunler/${g.id}`);
 const isTechnical=route.path==='/teknik-arama';
 const companyPage=companyPages.some(([path])=>path===route.path)?route.path.slice(1):null;
 if(site.remote&&location.hostname==='kestrturkiye-rgb.github.io'&&['/hesabim','/kampanyalar'].includes(route.path))redirectToAuthHost();
 const isCampaigns=route.path==='/kampanyalar';const isAccount=route.path==='/hesabim';
 const isAcademy=route.path==='/akademi'||route.path.startsWith('/akademi/');
 const known=isProduct||legal||isCampaigns||isAccount||customPage||isAcademy||isHome||isCatalog||isTechnical||companyPage||route.path==='/admin';
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
 function download(){const text=createQuoteText(quoteLines,quoteDetails,getLanguage())+'\n\n'+t('Teklif taslağıdır. Fiyat ve stok teyidi gerekir.');const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=getLanguage()==='en'?'rulman-teklif-quote-request.txt':'rulman-teklif-talebi.txt';a.click();URL.revokeObjectURL(url)}

 useEffect(()=>{
  const group=productGroups.find(g=>route.path===`/urunler/${g.id}`);
  setSearch(route.params.get('ara')||'');setMobile(false);setDetail(null);
  const title=isCampaigns?'Kampanyalı ürünler':isAccount?'Üye hesabı':companyPages.find(([path])=>path===route.path)?.[1]||group?.name||(isTechnical?'Teknik arama':isCatalog?'Ürünler':isAcademy?(articles.find(a=>route.path==='/akademi/'+a.slug)?.title||'Rulman Akademisi'):route.path==='/admin'?'Yönetim paneli':'Ana sayfa');
  window.scrollTo({top:0,behavior:'instant'});
 },[route]);



 if(site.remote&&site.settings.maintenance?.enabled&&route.path!=='/admin')return <main className="container catalog-status"><h1>{t(company.name)}</h1><p>{t(site.settings.maintenance.message)}</p><a href="#/admin">{t("Yönetici girişi")}</a></main>;
 const homeContent=kind=>site.home.find(section=>section.kind===kind)?.content;
 const renderHero=(content=homeContent('hero'))=>site.remote?<section className="hero"><div className="container hero-inner"><div className="hero-copy"><span className="eyebrow">{t(content?.eyebrow)}</span><h1>{t(content?.title)}<br/><em>{t(content?.highlight)}</em></h1><p>{t(content?.description)}</p><a className="primary" href={safeLink(content?.button?.href)}>{t(content?.button?.text)}<ArrowRight size={19}/></a><div className="hero-bottom">{t(content?.tags?.map(text=><span key={text}>{t(text)}</span>))}</div></div><div className="hero-photo">{t(site.media.get(content?.image)&&<img src={site.media.get(content.image).full} alt={t(content.imageAlt||'')} width="600" height="600"/>)}<span>{t(content?.caption)}</span></div></div></section>:null;
 const renderBenefits=(content=homeContent('benefits'))=> <div className="benefits container">{t((content?.cards||[]).map(([icon,title,text])=>{const Icon={ShieldCheck,Truck,Headphones,PackageCheck}[icon]||ShieldCheck;return <div key={title}><Icon size={29}/><span><b>{t(title)}</b><small>{t(text)}</small></span></div>}))}</div>;
 const renderCatalog=()=>!catalogLoading&&!catalogError?<CatalogGrid remote={remoteCatalog} stats={stats} standalone={isCatalog} products={products} manifest={manifest} category={category} setCategory={choose} search={appliedSearch} brand={brand} setBrand={changeBrand} technicalQuery={technicalQuery} filterError={filterError} onClearTechnical={clearTechnical} onReset={()=>navigate('/urunler')} source={source} discovery={isDiscoveryRoute(route,{category,brand,search:appliedSearch,technicalQuery,error:filterError})&&site.settings.search?.shuffleHome!==false&&(!remoteCatalog||remoteCatalog.discovery===true)} onSelect={choose} onDetail={setDetail} onAdd={add}/>:<CatalogStatus loading={catalogLoading} error={catalogError} retry={retryCatalog}/>;
 return <><Seo route={route} site={site}/>{t(site.remote&&site.settings.announcements?.enabled&&<div className="announcement-bar"><a href={safeLink(site.settings.announcements.href)}>{t(site.settings.announcements.text)}</a></div>)}<a className="skip-link" href="#main-content" onClick={event=>{event.preventDefault();document.getElementById("main-content").focus();document.getElementById("main-content").scrollIntoView()}}>{t("İçeriğe geç")}</a><div className="topbar" role="region" aria-label={t("İletişim bilgileri")}><div className="container"><span>{t(site.remote?site.identity.topbar:'Sanayinin gücü, doğru rulmanla başlar.')}</span><span><a href={company.phoneHref}><Phone size={12}/>{company.phone}</a><i/><a href={company.emailHref}>{company.email}</a></span></div></div>
 <header><div className="container head"><a className="logo" href="#/" ><img className="brand-symbol" src={logo} alt={t("")} width="56" height="56"/><div>{t(site.remote?company.name:<>{t("RULMAN ")}<b>{t("TEKLİF")}</b></>)}<small>{t(site.remote?site.identity.slogan:'ENDÜSTRİYEL ÇÖZÜM ORTAĞINIZ')}</small></div></a><form className="search" onSubmit={e=>{e.preventDefault();navigate('/urunler?ara='+encodeURIComponent(search))}}><Search size={20}/><input aria-label={t("Ürün ara")} placeholder={t("Ürün adı, marka veya ürün kodu arayın...")} value={search} onChange={e=>setSearch(e.target.value)}/><button aria-label={t("Ara")}><ArrowRight size={20}/></button></form><button className="cart-button" onClick={()=>{requestCatalog();setDrawer(true)}}><ShoppingBag size={23}/><span>{t("Teklif sepetim")}<small>{t(catalogLoading&&storedCart.length?'Kaydedilmiş liste':`${total} ürün`)}</small></span><b>{t(catalogLoading&&storedCart.length?'…':total)}</b></button><LanguageSwitch/><button className="mobile-menu" aria-label={t("Menüyü aç")} onClick={()=>setMobile(!mobile)}><Menu/></button></div></header>
 <ProductNavigation stats={stats} open={mobile} onToggle={setMobile} onSelect={choose} selected={category} products={products} productCount={manifest.totalProducts} path={route.path}/>
 <main id="main-content" tabIndex={-1}>{t(((isHome&&!site.remote)||isTechnical)&&<TechnicalSearch standalone={isTechnical} onSearch={runTechnicalSearch} productCount={manifest.totalProducts}/>)}
 {t(isHome&&!site.remote&&<><section className="hero"><div className="container hero-inner"><div className="hero-copy"><span className="eyebrow"><span/>{t(" HAREKETİN OLDUĞU HER YERDE")}</span><h1>{t("Güçlü hareket.")}<br/><em>{t("Kesintisiz üretim.")}</em></h1><p>{t("Rulmandan güç aktarımına, endüstrinizin ihtiyaç duyduğu çözümler tek bir adreste.")}</p><a className="primary" href="#/urunler">{t("Ürünleri keşfet ")}<ArrowRight size={19}/></a><div className="hero-bottom"><span>{t("Hassas mühendislik")}</span><i/><span>{t("Güvenilir çözümler")}</span></div></div><div className="hero-photo"><img src={import.meta.env.BASE_URL+'catalog/thumbnails/images_396aa49799f72e8af4aecb24.png-full.webp'} alt={t("Oynak makaralı rulmanın iç yapısı")} width="600" height="600"/><span>{t("Yüksek hassasiyet. Güvenilir hareket.")}</span></div></div></section>
 <div className="benefits container">{t([{icon:ShieldCheck,title:'Güvenilir ürünler',text:'Kalite odaklı ürün seçimi'},{icon:Truck,title:'Türkiye geneli teslimat',text:'İşinizin olduğu her yere'},{icon:Headphones,title:'Teknik destek',text:'Doğru ürün için yanınızdayız'},{icon:PackageCheck,title:'Geniş ürün seçeneği',text:'Endüstriye özel çözümler'}].map(b=><div key={b.title}><b.icon size={29}/><span><b>{t(b.title)}</b><small>{t(b.text)}</small></span></div>))}</div>
 </>)}
 {t((isCatalog||(isHome&&!site.remote))&&renderCatalog())}
 {t(isHome&&!site.remote&&<AcademyCards featured/>)}
 {t(isHome&&site.remote&&site.home.map(section=><React.Fragment key={section.id}>{t(section.kind==='technical_search'?<TechnicalSearch onSearch={runTechnicalSearch} productCount={manifest.totalProducts}/>:section.kind==='hero'?renderHero(section.content):section.kind==='benefits'?renderBenefits(section.content):section.kind==='catalog'?renderCatalog():section.kind==='academy'?<AcademyCards featured/>:section.kind==='campaigns'?<Suspense fallback={<p role="status">{t("Kampanyalar yükleniyor…")}</p>}><Campaigns featured onDetail={setDetail} onAdd={add}/></Suspense>:section.kind==='rich_text'?<section className="container managed-section"><h2>{t(section.content.title)}</h2><RichContent document={section.content.document}/></section>:section.kind==='statistics'?<section className="container managed-statistics">{t((section.content.items||[]).map((s,i)=><div key={i}><b>{t(s.value)}</b><span>{t(s.label)}</span></div>))}</section>:section.kind==='contact'?<section className="container managed-section"><h2>{t(section.content.title||'İletişim')}</h2><p>{company.address}</p><a href={company.phoneHref}>{company.phone}</a></section>:section.kind==='brands'?<section className="container managed-section"><h2>{t(section.content.title||'Markalar')}</h2><div className="managed-brands">{t((stats?.brands||[]).slice(0,24).map(b=><a key={b.id||b.name} href={'#/urunler?marka='+encodeURIComponent(b.name)}>{t(b.name)}</a>))}</div></section>:section.kind==='slider'?<section className="container managed-slider">{t((section.content.items||[]).map((s,i)=><article key={i}>{t(site.media.get(s.image)&&<img src={site.media.get(s.image).src} alt={t(s.imageAlt||'')}/>)}<h2>{t(s.title)}</h2><p>{t(s.description)}</p><a className="primary" href={safeLink(s.href)}>{t(s.text||'İncele')}</a></article>))}</section>:null)}</React.Fragment>))}
 {t(isCampaigns&&<Suspense fallback={<p role="status">{t("Kampanyalar yükleniyor…")}</p>}><Campaigns onDetail={setDetail} onAdd={add}/></Suspense>)}{t(isAccount&&<Suspense fallback={<p role="status">{t("Üyelik yükleniyor…")}</p>}><AccountPage/></Suspense>)}
 {t(isProduct&&<Suspense fallback={<p role="status">{t("Ürün yükleniyor…")}</p>}><PublicProduct slug={decodePathSegment(route.path.slice(6))} onAdd={add}/></Suspense>)}
 {t(isAcademy&&<Academy slug={route.path.split("/")[2]}/>)}
 {t(companyPage&&<div className="standalone-page"><div className="container page-breadcrumb"><a href="#/">{t("Ana sayfa")}</a><span>{t("/")}</span><span>{t(companyPages.find(([path])=>path===route.path)?.[1])}</span></div>{t(companyPage==='markalar'&&(catalogLoading||catalogError)?<CatalogStatus loading={catalogLoading} error={catalogError} retry={retryCatalog}/>:<CompanySections stats={stats} page={companyPage} products={products} onBrand={name=>navigate('/urunler?marka='+encodeURIComponent(name))} onQuote={()=>{requestCatalog();setDrawer(true)}} quoteBusy={site.remote&&(cartLoading||!!cartError)} quoteLines={quoteLines} quoteDetails={quoteDetails} onQuoteChange={setQuoteDetails} onDownload={download}/>)}</div>)}
 {t(legal&&<LegalPage slug={legal}/>)}
 {t(customPage&&!legal&&!companyPage&&!isCatalog&&!isAcademy&&!isTechnical&&route.path!=='/admin'&&<section className="container standalone-page"><h1>{t(customPage.title)}</h1><RichContent document={customPage.body}/></section>)}
 {t(route.path==='/admin'&&<Suspense fallback={<section className="container admin-page" role="status"><h1>{t("Yönetim paneli")}</h1><p>{t("Yönetim sayfası yükleniyor…")}</p></section>}><AdminPage/></Suspense>)}
 {t(!known&&<section className="container not-found"><h1>{t("Sayfa bulunamadı")}</h1><a href="#/">{t("Ana sayfaya dön")}</a></section>)}</main>
 <footer><div className="container footer-main"><div><a className="logo footer-logo" href="#/"><img className="brand-symbol" src={logo} alt={t("")} width="56" height="56"/><div>{t(site.remote?company.name:<>{t("RULMAN ")}<b>{t("TEKLİF")}</b></>)}<small>{t(site.remote?site.identity.slogan:'ENDÜSTRİYEL ÇÖZÜM ORTAĞINIZ')}</small></div></a><p>{t(site.remote?footer.description:<>{t("Dolapdere’den Türkiye’ye")}<br/>{t("endüstriyel tedarik ve teknik destek.")}</>)}</p><div className="footer-contact"><a href={company.phoneHref}><Phone size={14}/>{company.phone}</a><a href={company.emailHref}><Mail size={14}/>{company.email}</a><span>{company.address}</span>{t((company.social||[]).map((link,i)=><a key={i} href={safeLink(link.href)} target="_blank" rel="noopener noreferrer">{t(link.label)}</a>))}</div></div><div><h2 className="footer-heading">{t("Ürün grupları")}</h2>{t(site.remote?site.menus.filter(m=>m.menu_id==='footer'&&!m.parent_id&&m.href.startsWith('#/urunler/')).map(m=><a key={m.id} href={safeLink(m.href)}>{t(m.label)}</a>):productGroups.map(group=><button key={group.id} onClick={()=>choose(`group:${group.id}`)}>{t(group.name)}</button>))}</div><div><h2 className="footer-heading">{t("Keşfedin")}</h2>{t(site.remote?site.menus.filter(m=>m.menu_id==='footer'&&!m.parent_id&&!m.href.startsWith('#/urunler/')).map(m=><a key={m.id} href={safeLink(m.href)}>{t(m.label)}</a>):<><a href="#/hakkimizda">{t("Hakkımızda")}</a><a href="#/markalar">{t("Markalar")}</a><a href="#/iletisim">{t("İletişim")}</a><a href="#/teklif">{t("Teklif al")}</a><a href="#/akademi">{t("Rulman Akademisi")}</a></>)}</div><div><h2 className="footer-heading">{t(site.remote?(footer.ctaTitle||'Birlikte başlayalım.'):'Birlikte başlayalım.')}</h2><p>{t("Ürünlerinizi seçin, adetlerini belirleyin.")}<br/>{t("Formla veya WhatsApp ile teklif isteyin.")}</p><button className="footer-cta" onClick={()=>{requestCatalog();setDrawer(true)}}>{t(site.remote?(footer.cta||'Teklif sepetimi aç'):'Teklif sepetimi aç')} <ArrowRight size={18}/></button><a className="footer-whatsapp" href={supportWhatsAppUrl} target="_blank" rel="noopener noreferrer"><MessageCircle size={16}/>{t(" WhatsApp ile iletişim")}</a><small>{t(company.weekdayHours)}<br/>{t(company.saturdayHours)}</small></div></div><div className="container footer-bottom"><span>{t("© ")}{t(new Date().getFullYear())}{t(" Rulman Teklif · ")}<a href="#/admin">{t("Yönetici girişi")}</a></span><span>{t(site.remote?footer.disclaimer:'Fiyat, stok ve teslimat bilgileri teklif aşamasında teyit edilir.')}</span></div><LegalLinks/></footer><Analytics/><GoogleTags/><ManagedTexts/>
 <aside aria-label={t("WhatsApp destek")}><a className="whatsapp-float" href={supportWhatsAppUrl} target="_blank" rel="noopener noreferrer" aria-label={t("WhatsApp destek hattını aç")}><MessageCircle size={25}/><span>{t("WhatsApp destek")}</span></a></aside>
 {t(toast&&<div className="toast" role="status"><Check size={19}/>{t(toast)}<button aria-label={t("Bildirimi kapat")} onClick={()=>setToast('')}><X size={16}/></button></div>)}
 {t(drawer&&<div className="overlay" onClick={()=>setDrawer(false)}><section className="drawer" role="dialog" aria-modal="true" aria-label={t("Teklif sepetim")} onClick={e=>e.stopPropagation()}><div className="dialog-head"><div><small>{t("RULMAN TEKLİF")}</small><h2>{t("Teklif sepetim ")}<span>{t("(")}{t(total)}{t(")")}</span></h2></div><button aria-label={t("Sepeti kapat")} onClick={()=>setDrawer(false)}><X/></button></div>{t((site.remote?cartLoading:catalogLoading)||(site.remote?cartError:catalogError)?<CatalogStatus loading={site.remote?cartLoading:catalogLoading} error={site.remote?cartError:catalogError} retry={retryCatalog}/>:cart.length?<><div className="cart-items">{t(missing.length>0&&<p role="status">{t(missing.length)}{t(" kayıtlı ürün şu anda yayında değil. Diğer ürünleriniz korunuyor. ")}<button className="spec-retry" onClick={()=>update(cartRecords.filter(item=>byId.has(item.id)))}>{t("Yayında olmayan kayıtları kaldır")}</button></p>)}{t(cart.map(x=>{const p=byId.get(x.id);return <div className="cart-item" key={x.id}><div className="cart-image"><ProductImage product={p}/></div><div><small>{p.brand}</small><h3>{p.code}</h3><p>{technicalText(p.name)}</p><div className="quantity"><button aria-label={t(`${p.code} azalt`)} onClick={()=>qty(x.id,-1)}><Minus size={14}/></button><span>{t(x.qty)}</span><button aria-label={t(`${p.code} artır`)} onClick={()=>qty(x.id,1)}><Plus size={14}/></button></div></div><button className="remove" aria-label={t(`${p.code} kaldır`)} onClick={()=>update(cartRecords.filter(x=>x.id!==p.id))}><X size={17}/></button></div>}))}</div><div className="cart-summary"><QuoteRequest compact lines={quoteLines} details={quoteDetails} onChange={setQuoteDetails} onDownload={download}/></div></>:<div className="cart-empty-state">{t(missing.length>0&&<p role="status">{t(missing.length)}{t(" kayıtlı ürün şu anda yayında değil. Kayıtlı listeniz korunuyor. ")}<button className="spec-retry" onClick={()=>update(cartRecords.filter(item=>byId.has(item.id)))}>{t("Yayında olmayan kayıtları kaldır")}</button></p>)}<div className="empty"><ShoppingBag size={40}/><h3>{t("Teklifinizi birlikte hazırlayalım.")}</h3><p>{t("Ürünleri sepetinize ekleyin veya aradığınız kodu aşağıya yazın.")}</p><button className="primary" onClick={()=>{setDrawer(false);choose('Tüm ürünler')}}>{t("Ürünleri keşfet ")}<ArrowRight size={17}/></button></div><div className="cart-summary"><QuoteRequest compact lines={quoteLines} details={quoteDetails} onChange={setQuoteDetails} onDownload={download}/></div></div>)}</section></div>)}
 {t(detail&&<div className="overlay modal-overlay" onClick={()=>setDetail(null)}><section className={'detail-modal'+(detail.imageStatus==='pending'?' detail-modal-text':'')} role="dialog" aria-modal="true" aria-label={t(`${detail.code} ürün bilgileri`)} onClick={e=>e.stopPropagation()}><button className="modal-close" aria-label={t("Ürün detayını kapat")} onClick={()=>setDetail(null)}><X/></button>{t(detail.imageStatus!=='pending'&&<div className="detail-image"><ProductImage product={detail} detail/></div>)}<div className="detail-copy"><span className="section-tag">{detail.brand}{t(" · ")}{t(detail.category)}</span><h2>{detail.code}</h2><p>{technicalText(detail.name)}</p>{t(detail.imageStatus==='pending'&&<p className="photo-pending-note">{t("Ürüne özel fotoğraf henüz eklenmedi.")}</p>)}<ProductSpecs product={detail} key={site.revision+detail.id}/><dl><dt>{t("Ölçüler")}</dt><dd>{t(detail.size)}</dd><dt>{t(detail.referenceCode?'Referans kodu':'Ürün kodu')}</dt><dd>{detail.code}</dd>{t(detail.manufacturerCode&&detail.manufacturerCode!==detail.code&&<><dt>{t("Üretici kodu")}</dt><dd>{detail.manufacturerCode}</dd></>)}<dt>{t("Fiyat / stok")}</dt><dd>{t("Teklif aşamasında doğrulanır")}</dd></dl><button className="primary" onClick={()=>add(detail)}><Plus size={18}/>{t(" Teklif sepetine ekle")}</button><small>{t("Sipariş öncesinde teknik uygunluk doğrulanmalıdır.")}</small></div></section></div>)}
 </>;
}
const emptyCatalog={products:[],manifest:catalogSummary};
function CatalogStatus({loading,error,retry}){
 return <section className="container catalog-status" role={error?'alert':'status'} aria-live="polite"><h2>{t(error?'Katalog yüklenemedi':'Ürün kataloğu hazırlanıyor')}</h2><p>{t(error||'Arama ve ürünler kısa süre içinde hazır olacak. Diğer sayfaları incelemeye devam edebilirsiniz.')}</p>{t(loading&&<span className="loading-ring"/>)}{t(error&&<button className="primary" onClick={retry}>{t("Tekrar dene")}</button>)}</section>;
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
installLanguageNavigation();
const applicationRoot=createRoot(document.getElementById('root'));
if(hasAuthCallback(window.location))applicationRoot.render(<main className="catalog-loading" role="status"><h1>{t("Giriş bağlantısı doğrulanıyor")}</h1><p>{t("Lütfen bekleyin…")}</p></main>);
function SiteEntry(){const [route]=usePageRoute();return dataMode(import.meta.env)==='supabase'&&route.path!=='/admin'?<Suspense fallback={<p role="status">{t("Site yükleniyor…")}</p>}><CloudApp App={App}/></Suspense>:<SiteProvider value={staticSite}><CatalogApp/></SiteProvider>}
if(!(location.hostname==='kestrturkiye-rgb.github.io'&&(['/hesabim','/kampanyalar'].some(p=>location.hash.startsWith('#'+p))||/[?&](auth_action|code|token_hash)=/.test(location.search)||/access_token=/.test(location.hash))&&redirectToAuthHost()))initializeAuthCallback().finally(()=>applicationRoot.render(<MemberProvider><SiteEntry/></MemberProvider>));
