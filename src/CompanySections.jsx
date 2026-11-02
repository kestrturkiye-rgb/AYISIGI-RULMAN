import React, { useMemo, useState } from 'react';
import { ArrowRight, ArrowUpRight, CircleCheck, Layers, Search, MapPin, Phone, Mail, Clock, MessageCircle, Headphones, PackageCheck } from 'lucide-react';
import { company } from './company';
import { supportWhatsAppUrl } from './quote';
import { formatCount } from './catalog-utils';
import QuoteRequest from './QuoteRequest';
import './company.css';

export default function CompanySections({ products, stats, onBrand, onQuote, quoteLines, quoteDetails, onQuoteChange, onDownload, page }) {
 const [search, setSearch] = useState('');
 const [all, setAll] = useState(false);
 const brands = useMemo(() => {
  const counts = new Map();
  if(stats){for(const brand of stats.brands)if(brand.name!=='Belirtilmemiş')counts.set(brand.name,brand.count)}
  else for (const product of products) if (product.brand && product.brand !== 'Belirtilmemiş') counts.set(product.brand, (counts.get(product.brand) || 0) + 1);
  const order = ['SKF','FAG','INA','NSK','NTN','TIMKEN','KOYO','SNR','NACHI','URB','ZKL','THK'];
  return [...counts].map(([name,count]) => ({ name,count })).sort((a,b) => {
   const first = order.indexOf(a.name), second = order.indexOf(b.name);
   return (first < 0 ? 999 : first) - (second < 0 ? 999 : second) || a.name.localeCompare(b.name,'tr');
  });
 }, [products,stats]);
 const matching = brands.filter(b => b.name.toLocaleLowerCase('tr').includes(search.trim().toLocaleLowerCase('tr')));
 const visible = all || search.trim() ? matching : matching.slice(0,12);
 return <>
  {page === 'hakkimizda' && <section className="about-company container" id="hakkimizda" aria-labelledby="about-title">
   <div className="about-panel"><span className="section-tag">DOLAPDERE’DEN TÜM TÜRKİYE’YE</span><div className="about-monogram">RT<span>RULMAN TEKLİF</span></div><div className="about-location"><MapPin size={18}/><span>Dolapdere Sanayi Sitesi<br/><b>İstanbul</b></span></div></div>
   <div className="about-content"><span className="section-tag">HAKKIMIZDA</span><h1 id="about-title">Hareketin arkasındaki<br/>güvenilir çözüm ortağınız.</h1><p>Rulman Teklif olarak İstanbul Dolapdere Sanayi Sitesi’nden Türkiye’nin dört bir yanına rulman ve endüstriyel güç aktarım ürünleri tedarik ediyoruz. Rulman, kayış, zincir, redüktör ve elektrik motoru ihtiyaçlarınız için ürün seçimini ve tedarik sürecini kolaylaştırıyoruz.</p><p>SKF, FAG, NSK, NTN, Timken, INA, Koyo, SNR, Gates ve ContiTech gibi markalara ait ürün seçenekleri için bize danışabilirsiniz. Rulman kodu veya ölçüleriyle arama yapabilir, seçtiğiniz ürünler için teknik destek ve fiyat teklifi isteyebilirsiniz.</p><div className="about-values"><span><CircleCheck size={17}/> İhtiyaca uygun ürün seçimi</span><span><Headphones size={17}/> Teknik danışmanlık</span><span><Layers size={17}/> Çok markalı ürün seçenekleri</span><span><PackageCheck size={17}/> Toplu alım için teklif</span></div><button className="primary" onClick={onQuote}>Teklif listemi hazırla <ArrowRight size={18}/></button></div>
  </section>}
  {page === 'markalar' && <section className="brand-directory" id="markalar" aria-labelledby="brands-title"><div className="container">
   <div className="section-head"><div><span className="section-tag">KATALOGDAKİ MARKALAR</span><h1 id="brands-title">Doğru marka. Doğru ürün.</h1><p>{brands.length} markanın ürünlerini inceleyin, ihtiyacınıza uygun seçenekleri bulun.</p></div><label className="brand-directory-search"><Search size={17}/><input aria-label="Marka ara" value={search} onChange={e => setSearch(e.target.value)} placeholder="Marka adı arayın…"/></label></div>
   <div className="brand-directory-grid">{visible.map(brand => <button key={brand.name} className={`brand-card brand-card-${brand.name.toLowerCase().replace(/[^a-z]/g,'')}`} onClick={() => onBrand(brand.name)}><span>{brand.name}</span><small>{formatCount(brand.count)} katalog ürünü</small><ArrowUpRight size={18}/></button>)}</div>
   {!matching.length && <p className="brand-not-found" role="status">Bu isimde marka bulunamadı. Farklı bir ad deneyin veya WhatsApp’tan bize danışın.</p>}
   {!search.trim() && brands.length > 12 && <button className="brand-show-all" onClick={() => setAll(!all)}>{all ? 'Öne çıkan markaları göster' : `Tüm markaları göster (${brands.length})`} <ArrowRight size={16}/></button>}
   <p className="brand-directory-note">Marka seçtiğinizde katalog filtrelenir. Marka adları ürünleri tanımlamak için kullanılır.</p>
  </div></section>}
  {page === 'teklif' && <section className="quote-contact container" id="teklif" aria-labelledby="quote-title">
   <div className="quote-contact-copy"><span className="section-tag">TEKLİF ALIN</span><h1 id="quote-title">İhtiyacınızı paylaşın,<br/>birlikte doğru ürünü bulalım.</h1><p>Ürünleri teklif sepetinize ekleyin veya aradığınız kodu yazın. Teklif formunu gönderin veya WhatsApp üzerinden fiyat, stok ve teslimat bilgisi isteyin.</p><ol className="quote-steps"><li><span>01</span><div><b>Ürünü seçin</b><small>Kod, marka veya ölçüyle arayın.</small></div></li><li><span>02</span><div><b>Adedi belirleyin</b><small>Ürünleri teklif sepetinde bir araya getirin.</small></div></li><li><span>03</span><div><b>Talebinizi gönderin</b><small>Formla veya WhatsApp üzerinden iletin.</small></div></li></ol><a href={company.phoneHref} className="quote-phone"><Phone size={19}/>{company.phone}</a></div>
   <div className="quote-contact-form"><h2>Teklif talebinizi oluşturun</h2><p>Katalogda bulamadığınız bir ürün için de yazabilirsiniz.</p><QuoteRequest lines={quoteLines} details={quoteDetails} onChange={onQuoteChange} onDownload={onDownload} onOpenCart={onQuote}/></div>
  </section>}
  {page === 'iletisim' && <section className="contact-strip container" id="iletisim" aria-labelledby="contact-title"><div className="contact-strip-heading"><span className="section-tag">İLETİŞİM</span><h1 id="contact-title">Bir mesaj kadar yakınız.</h1></div><div className="contact-card-grid"><a href={company.phoneHref}><Phone size={22}/><span><small>BİZİ ARAYIN</small><b>{company.phone}</b></span><ArrowUpRight size={17}/></a><a href={company.emailHref}><Mail size={22}/><span><small>E-POSTA GÖNDERİN</small><b>{company.email}</b></span><ArrowUpRight size={17}/></a><a className="contact-whatsapp" href={supportWhatsAppUrl} target="_blank" rel="noopener noreferrer"><MessageCircle size={22}/><span><small>WHATSAPP</small><b>Ürün ve teklif desteği</b></span><ArrowUpRight size={17}/></a></div><div className="contact-location"><span><MapPin size={16}/>{company.address}</span><span><Clock size={16}/>{company.weekdayHours} · {company.saturdayHours}</span></div></section>}
 </>;
}
