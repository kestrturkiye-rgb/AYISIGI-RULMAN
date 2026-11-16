import {translate as t} from '../i18n/core.js';
import React,{useEffect,useMemo,useState,useCallback,useRef} from 'react';
import {getPublicRepository} from './client';
import {SiteProvider} from './SiteContext';
import {usePageRoute} from '../routes';
import {readCatalogFilters,updateCatalogParams} from '../catalog-filters';
import {readCart} from '../cart';
import {discoverySeed,isDiscoveryRoute} from '../discovery';
export default function CloudApp({App}){
 const [route,navigate]=usePageRoute();
 const [site,setSite]=useState(null),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 const [result,setResult]=useState(null),[searchError,setSearchError]=useState(''),[queryRetry,setQueryRetry]=useState(0);
 const siteRef=useRef(null),lastCheck=useRef(0),checking=useRef(false);
 const [cartIds,setCartIds]=useState(()=>readCart().map(p=>p.id)),[saved,setSaved]=useState([]),[cartLoading,setCartLoading]=useState(true),[cartError,setCartError]=useState('');

 const repository=useMemo(()=>{try{return getPublicRepository()}catch{return null}},[]);
 const refreshSite=useCallback(()=>{repository?.invalidate();setRevision(n=>n+1)},[repository]);
 const refresh=useCallback(()=>{refreshSite();setQueryRetry(n=>n+1)},[refreshSite]);
 siteRef.current=site;
 useEffect(()=>{let active=true;setError('');if(!repository){setError('Supabase bağlantısı yapılandırılmamış. Kurulum adımlarını kontrol edin.');return}repository.bootstrap().then(data=>{if(active)setSite(previous=>previous?.revision===data.revision?previous:{...data,repository})}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[repository,revision]);
 useEffect(()=>{if(!repository)return;
  const check=async()=>{if(document.visibilityState==='hidden'||checking.current||Date.now()-lastCheck.current<10000)return;lastCheck.current=Date.now();checking.current=true;try{const next=await repository.revision();if(!siteRef.current||next!==siteRef.current.revision)refreshSite();}catch{}finally{checking.current=false}};
  const stop=repository.subscribe(refreshSite),timer=setInterval(check,60000);
  window.addEventListener('focus',check);document.addEventListener('visibilitychange',check);
  return()=>{stop();clearInterval(timer);window.removeEventListener('focus',check);document.removeEventListener('visibilitychange',check)};
 },[repository,refreshSite]);
 const filters=useMemo(()=>site?readCatalogFilters(route,site.groups):null,[route,site]);
 const needed=route.path==='/'||route.path.startsWith('/urunler');
 const page=Math.max(1,Math.min(1000000,Number.parseInt(route.params.get('sayfa'),10)||1));
 const queryKey=site?`${site.revision}:${queryRetry}:${route.key}`:'';
 useEffect(()=>{if(!site||!needed)return;let active=true;setSearchError('');setResult(null);if(filters.error){setResult({key:queryKey,products:[],totalCount:0,page:1,pageSize:24});return}(async()=>{if(site.settings.search?.shuffleHome!==false&&isDiscoveryRoute(route,filters)){const chosen=await repository.discovery(discoverySeed);if(chosen)return chosen;}return repository.search(filters,site,page);})().then(data=>{if(active){if(page>1&&page>Math.max(1,Math.ceil(data.totalCount/24))){navigate(updateCatalogParams(route,{sayfa:null}));return}setResult({...data,key:queryKey})}}).catch(e=>{if(active)setSearchError(e.message)});return()=>{active=false}},[site,needed,queryKey,repository]);
 const idsKey=cartIds.join('|');
 useEffect(()=>{if(!repository)return;let active=true;setCartLoading(true);setCartError('');repository.products(cartIds).then(rows=>{if(active)setSaved(rows)}).catch(e=>{if(active){setSaved([]);setCartError(e.message)}}).finally(()=>{if(active)setCartLoading(false)});return()=>{active=false}},[repository,idsKey,site?.revision]);
 const index=useMemo(()=>new Map([...(result?.key===queryKey?result.products:[]),...saved].map(p=>[p.id,p])),[saved,result,queryKey]);
 if(!site)return <main className="container catalog-status" role={error?'alert':'status'}><h1>{t("Rulman Teklif")}</h1><p>{t(error||'Site bilgileri yükleniyor…')}</p>{t(error&&<button className="primary" onClick={refresh}>{t("Tekrar dene")}</button>)}<a href="#/admin">{t("Yönetim paneli")}</a></main>;
 const current=result?.key===queryKey?result:null;
 return <SiteProvider value={site}><App products={current?.products||[]} manifest={{totalProducts:site.totalProducts}} productIndex={index} stats={site.stats} catalogLoading={needed&&!current&&!searchError} catalogError={needed?searchError:''} retryCatalog={refresh} requestCatalog={()=>{}} remoteCatalog={{products:[],totalCount:0,pageSize:24,...current,page,onPage:next=>navigate(updateCatalogParams(route,{sayfa:next===1?null:next}))}} cartLoading={cartLoading} cartError={cartError} onCartChange={items=>setCartIds(items.map(p=>p.id))}/></SiteProvider>;
}
