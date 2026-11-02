import React, { useState } from 'react';
import { Package } from 'lucide-react';

export default function ProductImage({product,detail=false}){
 const [failed,setFailed]=useState(null);
 const stem=product.image?.split('/catalog/')[1]?.replaceAll('/','_');
 const thumbBase=stem?`${import.meta.env.BASE_URL}catalog/thumbnails/${stem}`:null;
 const label=product.imageKind==='series'?'Katalog seri görseli':product.imageKind==='category'?'Temsili kategori görseli':null;
 if(product.image&&failed!==product.image)return <div className="catalog-image-wrap"><img className="catalog-product-image" src={product.image} srcSet={thumbBase?(detail?`${thumbBase}-full.webp`:`${thumbBase}-320.webp 1x, ${thumbBase}-full.webp 2x`):undefined} loading={detail?'eager':'lazy'} decoding="async" width="600" height="600" alt={label?`${product.category} · ${label}`:product.name} onError={()=>setFailed(product.image)}/></div>;
 return <div className="catalog-placeholder" role="img" aria-label="Ürün görseli yüklenemedi"><Package size={48} strokeWidth={1}/><span>Görsel yüklenemedi</span></div>;
}
