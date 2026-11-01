import React, { useEffect, useState } from 'react';
import { loadProductDetails } from './catalog-data';

export default function ProductSpecs({product}){
 const [specs,setSpecs]=useState([]);const [error,setError]=useState('');const [warning,setWarning]=useState('');const [loading,setLoading]=useState(false);
 useEffect(()=>{let active=true;setSpecs([]);setWarning('');setError('');setLoading(product.detailChunk!=null);loadProductDetails(product).then(data=>{if(active){setSpecs(data.specs||[]);setWarning((data.warning||'').replace(/Kaynak kayıttaki/g,'Kayıttaki').replace(/Kaynak kayıtlarında/g,'Teknik kayıtlarda').replace(/kaynak sayfadan doğrulayın/g,'sipariş öncesi doğrulayın'))}}).catch(()=>{if(active)setError('Teknik bilgiler yüklenemedi. Lütfen tekrar deneyin.')}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[product]);
 return <div className="product-specifications">
  {['category','series'].includes(product.imageKind)&&<p className="image-disclosure">{product.imageKind==='category'?'Görsel ürün kategorisini temsil eder; bu ürüne özel fotoğraf değildir.':'Görsel ürün serisini temsil eder; modelin ayrıntıları farklılık gösterebilir.'}</p>}
  {loading&&<p role="status">Teknik bilgiler yükleniyor…</p>}
  {error&&<p role="alert">{error}</p>}
  {warning&&<p className="source-warning" role="note">{warning}</p>}
  {!loading&&!specs.length&&!error&&<p className="missing-specs">{Object.keys(product.dimensions).length?'Ana ölçüler aşağıda yer alıyor. Ek teknik bilgiler için bize ulaşabilirsiniz.':'Ayrıntılı ölçü ve teknik özellikler için bize ulaşabilirsiniz.'}</p>}
  {specs.length>0&&<details><summary>Teknik özellikler ({specs.length})</summary><div className="spec-table-scroll"><table><tbody>{specs.map(([label,value],i)=><tr key={i}><th scope="row">{label}</th><td>{value}</td></tr>)}</tbody></table></div></details>}
 </div>;
}
