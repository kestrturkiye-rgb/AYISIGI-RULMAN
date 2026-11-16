import {translate as t} from './i18n/core.js';
import React, { useEffect, useState } from 'react';
import {useSite} from './data/SiteContext';
import RichContent from './data/RichContent';
import { loadProductDetails } from './catalog-loader';

export default function ProductSpecs({product}){
 const site=useSite();
 const [details,setDetails]=useState(null);
 const [attempt,setAttempt]=useState(0);
 const [specs,setSpecs]=useState([]);const [error,setError]=useState('');const [warning,setWarning]=useState('');const [loading,setLoading]=useState(false);
 useEffect(()=>{let active=true;setDetails(null);setSpecs([]);setWarning('');setError('');setLoading(product.remote||product.detailChunk!=null);(product.remote?site.repository.products([product.id],true).then(rows=>{if(!rows.length)throw Error();return rows[0]}):loadProductDetails(product)).then(data=>{if(active){setDetails(data);setSpecs(data.specs||[]);setWarning((data.warning||'').replace(/Kaynak kayıttaki/g,'Kayıttaki').replace(/Kaynak kayıtlarında/g,'Teknik kayıtlarda').replace(/kaynak sayfadan doğrulayın/g,'sipariş öncesi doğrulayın'))}}).catch(()=>{if(active)setError('Teknik bilgiler yüklenemedi. Lütfen tekrar deneyin.')}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[product,attempt,site.repository]);
 return <div className="product-specifications">
  {t(['category','series'].includes(product.imageKind)&&<p className="image-disclosure">{t(product.imageKind==='category'?'Görsel ürün kategorisini temsil eder; bu ürüne özel fotoğraf değildir.':'Görsel ürün serisini temsil eder; modelin ayrıntıları farklılık gösterebilir.')}</p>)}
  {t(loading&&<p role="status">{t("Teknik bilgiler yükleniyor…")}</p>)}
  {t(error&&<div role="alert"><p>{t(error)}</p><button className="spec-retry" onClick={()=>setAttempt(a=>a+1)}>{t("Teknik bilgileri yeniden yükle")}</button></div>)}
  {t(warning&&<p className="source-warning" role="note">{t(warning)}</p>)}
  {t(!loading&&!specs.length&&!error&&<p className="missing-specs">{t(Object.keys(product.dimensions).length?'Ana ölçüler aşağıda yer alıyor. Ek teknik bilgiler için bize ulaşabilirsiniz.':'Ayrıntılı ölçü ve teknik özellikler için bize ulaşabilirsiniz.')}</p>)}
  {t(details?.origin&&<p>{t("Menşei: ")}{t(details.origin)}</p>)}
  {t(details?.longDescription?.type==='doc'&&<RichContent document={details.longDescription}/>)}
  {t(details?.gallery?.length>1&&<div className="detail-gallery">{t(details.gallery.map(image=><img key={image.src} src={image.small} alt={t(image.alt||product.name)} width="120" height="120" loading="lazy"/>))}</div>)}
  {t(specs.length>0&&<details><summary>{t("Teknik özellikler (")}{t(specs.length)}{t(")")}</summary><div className="spec-table-scroll"><table><tbody>{t(specs.map(([label,value],i)=><tr key={i}><th scope="row">{t(label)}</th><td>{t(value)}</td></tr>))}</tbody></table></div></details>)}
 </div>;
}
