import React, { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { loadProductDetails } from './catalog-data';

export default function ProductSpecs({product}){
 const [specs,setSpecs]=useState([]);const [error,setError]=useState('');const [warning,setWarning]=useState('');const [loading,setLoading]=useState(false);
 useEffect(()=>{let active=true;setSpecs([]);setWarning('');setError('');setLoading(product.detailChunk!=null);loadProductDetails(product).then(data=>{if(active){setSpecs(data.specs||[]);setWarning(data.warning||'')}}).catch(()=>{if(active)setError('Teknik bilgiler yüklenemedi. Kaynak sayfadan kontrol edebilirsiniz.')}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[product]);
 return <div className="product-specifications">
  <div className="product-sources"><b>Ürün kaynakları</b>{product.sources.map((source,i)=><a key={source.key+source.url} href={source.url} target="_blank" rel="noopener noreferrer">{source.name}{i>0&&product.sources[i-1].key===source.key?' · Katalog':''}<ExternalLink size={12}/></a>)}</div>
  {product.imageKind==='category'&&<p className="image-disclosure">Gösterilen görsel ürün kategorisini temsil eder. Bu kod için ürüne özel fotoğraf kaynakta bulunamadı.{product.imageReferenceUrl&&<> <a href={product.imageReferenceUrl} target="_blank" rel="noopener noreferrer">Görselin örnek ürünü</a></>}</p>}
  {loading&&<p role="status">Teknik bilgiler yükleniyor…</p>}
  {error&&<p role="alert">{error}</p>}
  {warning&&<p className="source-warning" role="note">{warning}</p>}
  {!loading&&!specs.length&&!error&&<p className="missing-specs">{Object.keys(product.dimensions).length?'Katalogdaki ana ölçüler aşağıda yer alıyor. Ek teknik bilgiler için kaynak ürün sayfasını kontrol edin.':'Bu kayıt ürün kodu ve kategori bilgisini içeriyor. Ayrıntılı ölçü ve teknik özellikler için kaynak ürün sayfasını kontrol edin.'}</p>}
  {specs.length>0&&<details><summary>Teknik özellikler ({specs.length})</summary><div className="spec-table-scroll"><table><tbody>{specs.map(([label,value],i)=><tr key={i}><th scope="row">{label}</th><td>{value}</td></tr>)}</tbody></table></div></details>}
 </div>;
}
