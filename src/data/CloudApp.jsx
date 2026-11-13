import React,{useEffect,useMemo,useState,useCallback} from 'react';
import {getPublicRepository} from './client';
import {SiteProvider} from './SiteContext';
import {usePageRoute} from '../routes';
import {readCatalogFilters,updateCatalogParams} from '../catalog-filters';
import {readCart} from '../cart';
export default function CloudApp({App}){
 const [route,navigate]=usePageRoute();
 const [site,setSite]=useState(null),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 const [result,setResult]=useState(null),[searchError,setSearchError]=useState('');
 const [cartIds,setCartIds]=useState(()=>readCart().map(p=>p.id)),[saved,setSaved]=useState([]),[cartLoading,setCartLoading]=useState(true),[cartError,setCartError]=useState('');
 const refresh=useCallback(()=>setRevision(n=>n+1),[]);
 const repository=useMemo(()=>{try{return getPublicRepository()}catch{return null}},[]);
 useEffect(()=>{let active=true;setError('');if(!repository){setError('Supabase bağlantısı yapılandırılmamış. Kurulum adımlarını kontrol edin.');return}repository.bootstrap().then(data=>{if(active)setSite({...data,repository})}).catch(e=>{if(active){setSite(null);setError(e.message)}});return()=>{active=false}},[repository,revision]);
 useEffect(()=>{if(!repository)return;const stop=repository.subscribe(refresh);const timer=setInterval(refresh,60000);const focus=()=>{if(document.visibilityState==='visible')refresh()};window.addEventListener('focus',focus);document.addEventListener('visibilitychange',focus);return()=>{stop();clearInterval(timer);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus)}},[repository,refresh]);
 const filters=useMemo(()=>site?readCatalogFilters(route,site.groups):null,[route,site]);
 const needed=route.path==='/'||route.path.startsWith('/urunler');
 const page=Math.max(1,Math.min(1000000,Number.parseInt(route.params.get('sayfa'),10)||1));
 const queryKey=site?`${site.revision}:${revision}:${route.key}`:'';
 useEffect(()=>{if(!site||!needed)return;let active=true;setSearchError('');setResult(null);if(filters.error){setResult({key:queryKey,products:[],totalCount:0,page:1,pageSize:24});return}repository.search(filters,site,page).then(data=>{if(active){if(page>1&&page>Math.max(1,Math.ceil(data.totalCount/24))){navigate(updateCatalogParams(route,{sayfa:null}));return}setResult({...data,key:queryKey})}}).catch(e=>{if(active)setSearchError(e.message)});return()=>{active=false}},[site,needed,queryKey,repository]);
 const idsKey=cartIds.join('|');
 useEffect(()=>{if(!repository)return;let active=true;setCartLoading(true);setCartError('');repository.products(cartIds).then(rows=>{if(active)setSaved(rows)}).catch(e=>{if(active){setSaved([]);setCartError(e.message)}}).finally(()=>{if(active)setCartLoading(false)});return()=>{active=false}},[repository,idsKey,revision]);
 const index=useMemo(()=>new Map([...(result?.key===queryKey?result.products:[]),...saved].map(p=>[p.id,p])),[saved,result,queryKey]);
 if(!site)return <main className="container catalog-status" role={error?'alert':'status'}><h1>Rulman Teklif</h1><p>{error||'Site bilgileri yükleniyor…'}</p>{error&&<button className="primary" onClick={refresh}>Tekrar dene</button>}<a href="#/admin">Yönetim paneli</a></main>;
 const current=result?.key===queryKey?result:null;
 return <SiteProvider value={site}><App products={current?.products||[]} manifest={{totalProducts:site.totalProducts}} productIndex={index} stats={site.stats} catalogLoading={needed&&!current&&!searchError} catalogError={needed?searchError:''} retryCatalog={refresh} requestCatalog={()=>{}} remoteCatalog={{...current,page,onPage:next=>navigate(updateCatalogParams(route,{sayfa:next===1?null:next}))}} cartLoading={cartLoading} cartError={cartError} onCartChange={items=>setCartIds(items.map(p=>p.id))}/></SiteProvider>;
}
