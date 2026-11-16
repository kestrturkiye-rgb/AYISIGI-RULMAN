import {translate as t} from './i18n/core.js';
import React, { useState } from 'react';
import { Package } from 'lucide-react';

export default function ProductImage({product,detail=false}){
 const [failed,setFailed]=useState(null);
 const remote=product.remoteImage;
 const stem=product.image?.split('/catalog/')[1]?.replaceAll('/','_');
 const thumbBase=stem?`${import.meta.env.BASE_URL}catalog/thumbnails/${stem}`:null;
 if(product.imageStatus==='pending'&&!product.image)return <div className="catalog-photo-pending" role="note">{t("Fotoğraf yok")}</div>;
 const label=product.imageKind==='series'?'Katalog seri görseli':product.imageKind==='category'?'Temsili kategori görseli':null;
 if(product.image&&failed!==product.image)return <div className="catalog-image-wrap"><img className="catalog-product-image" src={remote?(detail?remote.full:remote.small):product.image} srcSet={remote?(!detail?`${remote.small} 1x, ${remote.full} 2x`:undefined):thumbBase?(detail?`${thumbBase}-full.webp`:`${thumbBase}-320.webp 1x, ${thumbBase}-full.webp 2x`):undefined} loading={detail?'eager':'lazy'} decoding="async" width="600" height="600" alt={t(remote?.alt|| (label?`${product.category} · ${label}`:product.name))} onError={()=>setFailed(product.image)}/></div>;
 return <div className="catalog-placeholder" role="img" aria-label={t("Ürün görseli yüklenemedi")}><Package size={48} strokeWidth={1}/><span>{t("Görsel yüklenemedi")}</span></div>;
}
