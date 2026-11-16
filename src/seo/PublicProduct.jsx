import React,{useEffect,useState} from 'react';
import {Copy,Plus} from 'lucide-react';
import {translate as t,technicalText} from '../i18n/core.js';
import {useSite} from '../data/SiteContext';
import ProductImage from '../ProductImage';
import ProductSpecs from '../ProductSpecs';
import {trackEvent} from '../members/Analytics';
import {setSeo} from './Seo';
import {productPath,publicHref,SITE_ORIGIN,replaceProductAddress} from './urls.js';
import './product-page.css';
import {getLanguage} from '../i18n/core.js';
import {cleanHost} from './urls.js';
import {productContent,productStructuredData,productCategoryPath,canonicalProductPath} from './content.js';
import {RelatedResources} from './CatalogGuide';

export default function PublicProduct({slug,onAdd,routeKey}){
 const site=useSite();
 const [product,setProduct]=useState(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 const [selectedImage,setSelectedImage]=useState(null),[copyStatus,setCopyStatus]=useState('');
 useEffect(()=>{
  let active=true;setProduct(null);setError('');setSelectedImage(null);setCopyStatus('');
  if(!slug){setError('Ürün adresi geçersiz.');return;}
  setSeo({title:t('Ürün bilgileri')+' | '+site.company.name,description:'',path:productPath(slug),noindex:!cleanHost()||Boolean(routeKey?.includes('?'))});
  site.repository.productBySlug(slug).then(p=>{
   if(!active)return;
   if(!p){setError('Ürün bulunamadı veya yayında değil.');setSeo({title:t('Ürün bulunamadı veya yayında değil.'),description:'',path:productPath(slug),noindex:true});return;}
   const canonical=canonicalProductPath(p,site);
   if(p.slug!==slug){replaceProductAddress(p.slug,canonical);return;}
   const current=cleanHost()?location.pathname:location.hash.slice(1).split('?')[0];
   const target=publicHref(canonical).replace(/^#/, '');
   if(current!==target){replaceProductAddress(p.slug,canonical);return;}
   setProduct(p);trackEvent('product_view',p);
   const language=getLanguage(),copy=productContent(p,{language,siteName:site.company.name,entries:site.settings.localization?.entries});
   setSeo({title:copy.title,description:copy.description,path:canonical,image:p.image,noindex:!cleanHost()||Boolean(routeKey?.includes('?')),structuredData:productStructuredData(p,site,language)});
  }).catch(()=>{if(active){setError('Ürün bilgileri yüklenemedi. Lütfen sayfayı yeniden deneyin.');setSeo({title:t('Ürün bilgileri')+' | '+site.company.name,description:'',path:productPath(slug),noindex:true});}});
  return()=>{active=false;};
 },[slug,site.revision,site.language,attempt,site.repository,routeKey]);

 if(error)return <section className="container standalone-page product-page"><div role="alert"><h1>{t(error)}</h1><button className="outline" onClick={()=>setAttempt(n=>n+1)}>{t('Tekrar dene')}</button> <a href={publicHref('/urunler')}>{t('Ürünlere dön')}</a></div></section>;
 if(!product)return <section className="container standalone-page product-page"><p role="status">{t('Ürün bilgileri yükleniyor…')}</p></section>;

 const images=[product.remoteImage,...(product.gallery||[])].filter((image,index,all)=>image&&all.findIndex(other=>other?.src===image.src)===index);
 const displayProduct=selectedImage?{...product,image:selectedImage.src,remoteImage:selectedImage}:product;
 const href=publicHref(canonicalProductPath(product,site));
 const shareUrl=SITE_ORIGIN+(href.startsWith('#')?href.slice(1):href);
 const categoryHref=publicHref(productCategoryPath(product,site));
 const copy=productContent(product,{language:site.language,siteName:site.company.name,entries:site.settings.localization?.entries});
 async function copyLink(){
  try{await navigator.clipboard.writeText(shareUrl);setCopyStatus('Bağlantı kopyalandı.');}
  catch{setCopyStatus('Bağlantıyı aşağıdaki alandan kopyalayabilirsiniz.');}
 }
 return <section className="container standalone-page product-page">
  <nav className="page-breadcrumb" aria-label={t('Sayfa yolu')}>
   <a href={publicHref('/urunler')}>{t('Ürünler')}</a><span aria-hidden="true">/</span>
   {product.category&&<><a href={categoryHref}>{t(product.category)}</a><span aria-hidden="true">/</span></>}
   <span aria-current="page">{product.code}</span>
  </nav>
  <div className="product-page-layout">
   <div className="product-page-media">
    <div className="detail-image"><ProductImage product={displayProduct} detail/></div>
    {images.length>1&&<div className="product-page-gallery" role="group" aria-label={t('Ürün görselleri')}>
     {images.map((image,index)=><button key={image.src} aria-label={t('Ürün görseli')+' '+(index+1)} aria-pressed={(selectedImage||images[0]).src===image.src} onClick={()=>setSelectedImage(image)}><img src={image.small} alt={t(image.alt||product.name)} width="80" height="80" loading="lazy"/></button>)}
    </div>}
   </div>
   <div className="detail-copy product-page-summary">
    <span className="section-tag">{product.brand!=='Belirtilmemiş'?product.brand:t(product.category)}</span>
    <h1>{product.code}</h1><p className="product-page-name">{technicalText(product.name)}</p>
    <p className="product-page-intro">{copy.summary}</p>
    <dl className="product-page-facts">
     <dt>{t('Ürün kodu')}</dt><dd>{product.code}</dd>
     {product.manufacturerCode&&product.manufacturerCode!==product.code&&<><dt>{t('Üretici kodu')}</dt><dd>{product.manufacturerCode}</dd></>}
     {product.brand!=='Belirtilmemiş'&&<><dt>{t('Marka')}</dt><dd><a href={publicHref('/urunler?marka='+encodeURIComponent(product.brand))}>{product.brand}</a></dd></>}
     {product.category&&<><dt>{t('Kategori')}</dt><dd><a href={categoryHref}>{t(product.category)}</a></dd></>}
     {Object.keys(product.dimensions).length>0&&<><dt>{t('Ölçüler')}</dt><dd>{t(product.size)}</dd></>}
     <dt>{t('Fiyat / stok')}</dt><dd>{t('Teklif aşamasında doğrulanır')}</dd>
    </dl>
    <div className="product-page-actions"><button className="primary" onClick={()=>onAdd(product)}><Plus size={18}/>{t('Teklif sepetine ekle')}</button><button className="outline" onClick={copyLink}><Copy size={16}/>{t('Bağlantıyı kopyala')}</button></div>
    <p className="product-page-note">{t('Sipariş öncesinde fiyat, stok ve teknik uygunluk doğrulanır.')}</p>
    {copyStatus&&<div className="product-page-share"><p role="status">{t(copyStatus)}</p><input aria-label={t('Ürün sayfası bağlantısı')} readOnly value={shareUrl} onFocus={event=>event.target.select()}/></div>}
   </div>
  </div>
  <section className="product-page-technical" aria-labelledby="product-technical-title"><h2 id="product-technical-title">{t('Ürün bilgileri')}</h2><ProductSpecs product={product} preloaded expanded showGallery={false}/></section>
  <RelatedResources product={product}/>
 </section>;
}
