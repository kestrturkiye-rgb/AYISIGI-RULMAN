import {translate as t} from './i18n/core.js';
import React, { useMemo, useState } from 'react';
import { ArrowRight, ArrowUpRight, CircleCheck, Layers, Search, MapPin, Phone, Mail, Clock, MessageCircle, Headphones, PackageCheck } from 'lucide-react';
import { company } from './company';
import { supportWhatsAppUrl } from './quote';
import { formatCount } from './catalog-utils';
import QuoteRequest from './QuoteRequest';
import './company.css';
import {useSite} from './data/SiteContext';
import {makeWhatsAppUrl} from './quote';
import RichContent from './data/RichContent';

export default function CompanySections({ products, stats, onBrand, onQuote, quoteLines, quoteDetails, onQuoteChange, onDownload, page, quoteBusy }) {
 const site=useSite();const company=site.company;const supportWhatsAppUrl=makeWhatsAppUrl(t('Merhaba, ürün seçimi ve fiyat teklifi konusunda bilgi almak istiyorum.'),company);
 const record=site.pages.find(p=>p.slug===page);const body=record?.body;
 const [search, setSearch] = useState('');
 const [all, setAll] = useState(false);
 const brands = useMemo(() => {
  const counts = new Map();
  if(stats){for(const brand of stats.brands)if(brand.name!=='Belirtilmemiş')counts.set(brand.name,brand.count)}
  else for (const product of products) if (product.brand && product.brand !== 'Belirtilmemiş') counts.set(product.brand, (counts.get(product.brand) || 0) + 1);
  const order = ['SKF','FAG','INA','NSK','NTN','TIMKEN','KOYO','SNR','NACHI','URB','ZKL','THK'];
  return [...counts].map(([name,count]) => ({ name,count,logoUrl:stats?.brands.find(b=>b.name===name)?.logoUrl })).sort((a,b) => {
   const first = order.indexOf(a.name), second = order.indexOf(b.name);
   return (first < 0 ? 999 : first) - (second < 0 ? 999 : second) || a.name.localeCompare(b.name,'tr');
  });
 }, [products,stats]);
 const matching = brands.filter(b => b.name.toLocaleLowerCase('tr').includes(search.trim().toLocaleLowerCase('tr')));
 const visible = all || search.trim() ? matching : matching.slice(0,12);
 if(site.remote&&page!=='markalar'&&!record)return <section className="container not-found"><h1>{t("Sayfa bulunamadı")}</h1></section>;
 if(site.remote&&body?.type==='doc')return <section className="container standalone-page"><h1>{t(record.title)}</h1><RichContent document={body}/></section>;
 return <>
  {t(page === 'hakkimizda' && <section className="about-company container" id="hakkimizda" aria-labelledby="about-title">
   <div className="about-panel"><span className="section-tag">{t(site.remote?body?.eyebrow:'DOLAPDERE’DEN TÜM TÜRKİYE’YE')}</span><div className="about-monogram"><img src={site.identity?.logoUrl||import.meta.env.BASE_URL+'brand/rulman-teklif.webp'} alt={site.company.name} width="160" height="160"/><span>{site.company.name.toLocaleUpperCase(site.language==='en'?'en-US':'tr-TR')}</span></div><div className="about-location"><MapPin size={18}/><span>{t("Dolapdere Sanayi Sitesi")}<br/><b>{t("İstanbul")}</b></span></div></div>
   <div className="about-content"><span className="section-tag">{t("HAKKIMIZDA")}</span><h1 id="about-title">{t(site.remote?body?.title:<>{t("Hareketin arkasındaki")}<br/>{t("güvenilir çözüm ortağınız.")}</>)}</h1>{t((site.remote?body?.paragraphs||[]:["Rulman Teklif olarak İstanbul Dolapdere Sanayi Sitesi’nden Türkiye’nin dört bir yanına rulman ve endüstriyel güç aktarım ürünleri tedarik ediyoruz. Rulman, kayış, zincir, redüktör ve elektrik motoru ihtiyaçlarınız için ürün seçimini ve tedarik sürecini kolaylaştırıyoruz.","SKF, FAG, NSK, NTN, Timken, INA, Koyo, SNR, Gates ve ContiTech gibi markalara ait ürün seçenekleri için bize danışabilirsiniz. Rulman kodu veya ölçüleriyle arama yapabilir, seçtiğiniz ürünler için teknik destek ve fiyat teklifi isteyebilirsiniz."]).map((text,i)=><p key={i}>{t(text)}</p>))}<div className="about-values">{t((site.remote?body?.values||[]:['İhtiyaca uygun ürün seçimi','Teknik danışmanlık','Çok markalı ürün seçenekleri','Toplu alım için teklif']).map(text=><span key={text}><CircleCheck size={17}/>{t(text)}</span>))}</div><button className="primary" onClick={onQuote}>{t(site.remote?body?.cta:'Teklif listemi hazırla')} <ArrowRight size={18}/></button></div>
  </section>)}
  {t(page === 'markalar' && <section className="brand-directory" id="markalar" aria-labelledby="brands-title"><div className="container">
   <div className="section-head"><div><span className="section-tag">{t("KATALOGDAKİ MARKALAR")}</span><h1 id="brands-title">{t("Doğru marka. Doğru ürün.")}</h1><p>{t(brands.length)}{t(" markanın ürünlerini inceleyin, ihtiyacınıza uygun seçenekleri bulun.")}</p></div><label className="brand-directory-search"><Search size={17}/><input aria-label={t("Marka ara")} value={search} onChange={e => setSearch(e.target.value)} placeholder={t("Marka adı arayın…")}/></label></div>
   <div className="brand-directory-grid">{t(visible.map(brand => <button key={brand.name} className={`brand-card brand-card-${brand.name.toLowerCase().replace(/[^a-z]/g,'')}`} onClick={() => onBrand(brand.name)}>{t(brand.logoUrl&&<img src={brand.logoUrl} alt={t(brand.name+' logosu')} loading="lazy"/>)}<span>{brand.name}</span><small>{t(formatCount(brand.count))}{t(" katalog ürünü")}</small><ArrowUpRight size={18}/></button>))}</div>
   {t(!matching.length && <p className="brand-not-found" role="status">{t("Bu isimde marka bulunamadı. Farklı bir ad deneyin veya WhatsApp’tan bize danışın.")}</p>)}
   {t(!search.trim() && brands.length > 12 && <button className="brand-show-all" onClick={() => setAll(!all)}>{t(all ? 'Öne çıkan markaları göster' : `Tüm markaları göster (${brands.length})`)} <ArrowRight size={16}/></button>)}
   <p className="brand-directory-note">{t("Marka seçtiğinizde katalog filtrelenir. Marka adları ürünleri tanımlamak için kullanılır.")}</p>
  </div></section>)}
  {t(page === 'teklif' && <section className="quote-contact container" id="teklif" aria-labelledby="quote-title">
   <div className="quote-contact-copy"><span className="section-tag">{t("TEKLİF ALIN")}</span><h1 id="quote-title">{t(site.remote?body?.title:<>{t("İhtiyacınızı paylaşın,")}<br/>{t("birlikte doğru ürünü bulalım.")}</>)}</h1><p>{t(site.remote?body?.description:'Ürünleri teklif sepetinize ekleyin veya aradığınız kodu yazın. Teklif formunu gönderin veya WhatsApp üzerinden fiyat, stok ve teslimat bilgisi isteyin.')}</p><ol className="quote-steps">{t((site.remote?body?.steps||[]:[['Ürünü seçin','Kod, marka veya ölçüyle arayın.'],['Adedi belirleyin','Ürünleri teklif sepetinde bir araya getirin.'],['Talebinizi gönderin','Formla veya WhatsApp üzerinden iletin.']]).map(([title,text],i)=><li key={i}><span>{t("0")}{t(i+1)}</span><div><b>{t(title)}</b><small>{t(text)}</small></div></li>))}</ol><a href={company.phoneHref} className="quote-phone"><Phone size={19}/>{company.phone}</a></div>
   <div className="quote-contact-form"><h2>{t("Teklif talebinizi oluşturun")}</h2><p>{t("Katalogda bulamadığınız bir ürün için de yazabilirsiniz.")}</p><QuoteRequest busy={quoteBusy} lines={quoteLines} details={quoteDetails} onChange={onQuoteChange} onDownload={onDownload} onOpenCart={onQuote}/></div>
  </section>)}
  {t(page === 'iletisim' && <section className="contact-strip container" id="iletisim" aria-labelledby="contact-title"><div className="contact-strip-heading"><span className="section-tag">{t("İLETİŞİM")}</span><h1 id="contact-title">{t(site.remote?body?.title:'Bir mesaj kadar yakınız.')}</h1></div><div className="contact-card-grid"><a href={company.phoneHref}><Phone size={22}/><span><small>{t("BİZİ ARAYIN")}</small><b>{company.phone}</b></span><ArrowUpRight size={17}/></a><a href={company.emailHref}><Mail size={22}/><span><small>{t("E-POSTA GÖNDERİN")}</small><b>{company.email}</b></span><ArrowUpRight size={17}/></a><a className="contact-whatsapp" href={supportWhatsAppUrl} target="_blank" rel="noopener noreferrer"><MessageCircle size={22}/><span><small>{t("WHATSAPP")}</small><b>{t("Ürün ve teklif desteği")}</b></span><ArrowUpRight size={17}/></a></div><div className="contact-location"><span><MapPin size={16}/>{company.address}</span>{t(company.mapUrl&&/^https:\/\//.test(company.mapUrl)&&<a href={company.mapUrl} target="_blank" rel="noopener noreferrer">{t("Haritada göster ")}<ArrowUpRight size={15}/></a>)}<span><Clock size={16}/>{t(company.weekdayHours)}{t(" · ")}{t(company.saturdayHours)}</span></div></section>)}
 </>;
}
