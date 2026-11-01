import React, { useState } from 'react';
import { Package } from 'lucide-react';
import Bearing from './Bearing';

export default function ProductImage({product}){
 const [failed,setFailed]=useState(false);
 const label=product.imageKind==='series'?'Katalog seri görseli':product.imageKind==='category'?'Temsili kategori görseli':null;
 if(product.image&&!failed)return <div className="catalog-image-wrap"><img className="catalog-product-image" src={product.image} loading="lazy" alt={label?`${product.category} · ${label}`:product.name} onError={()=>setFailed(true)}/></div>;
 const isBearing=/rulman|yatak|burç/i.test(product.category);
 return <div className="catalog-placeholder" role="img" aria-label="Temsili ürün çizimi">{isBearing?<Bearing type={product.type}/>:<Package size={58} strokeWidth={1}/>}</div>;
}
