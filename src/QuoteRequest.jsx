import {translate as t,getLanguage} from './i18n/core.js';
import {useSite} from './data/SiteContext';
import React, { useId, useState, useEffect, useRef } from 'react';
import { MessageCircle, Download, ArrowUpRight, Send, LoaderCircle, CircleCheck } from 'lucide-react';
import { createQuoteRequest, makeWhatsAppUrl } from './quote';
import { api, quoteServiceStatus } from './api';
import {getSupabaseClient} from './supabase/client';
import {trackGoogleLead} from './seo/google-tags';
import {publicServiceUrl} from './security/policy.mjs';

export default function QuoteRequest({ lines, details, onChange, onDownload, onOpenCart, compact = false, busy=false }) {
 const site=useSite();const {company}=site;
 const id = useId();
 const [error, setError] = useState('');
 const [overflow, setOverflow] = useState(false);
 const [available,setAvailable]=useState(null);
 const [pending,setPending]=useState(false);
 const [receipt,setReceipt]=useState(null);
 const requestRef=useRef(null);const submitting=useRef(false);
 useEffect(()=>{let active=true;(site.remote?Promise.resolve({quotesEnabled:true}):quoteServiceStatus()).then(status=>{if(active)setAvailable(status.quotesEnabled)});return()=>{active=false}},[site.remote]);
 const signature=JSON.stringify({items:lines.map(p=>({id:p.id,qty:p.qty})),details});
 useEffect(()=>{setReceipt(null);setError('');requestRef.current=null},[signature]);
 const count = lines.reduce((sum, line) => sum + line.qty, 0);
 async function submit(event) {
  event.preventDefault();if(busy)return;
  if (!lines.length && !details.note.trim()) { setError('Aradığınız ürün kodunu veya talebinizi yazın.'); return; }
  if(event.nativeEvent.submitter?.value!=='whatsapp') {
   if(!available||submitting.current)return;
   if(!details.customer.trim()||!details.email.trim()){setError('Teklif göndermek için ad / firma ve e-posta adresinizi girin.');return}
   requestRef.current ||= {key:crypto.randomUUID(),signature};
   submitting.current=true;setPending(true);setError('');
   try{let result;const body={requestKey:requestRef.current.key,items:lines.map(p=>({id:String(p.id),qty:p.qty})),details,website:event.currentTarget.elements.website.value};if(site.remote){const session=(await getSupabaseClient().auth.getSession()).data.session;const response=await fetch(publicServiceUrl('/api/quote'),{method:'POST',headers:{'Content-Type':'application/json',...(session?{Authorization:'Bearer '+session.access_token}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});result=await response.json();if(!response.ok)throw Error(result.error||'Talep gönderilemedi.');}else result=await api('/quotes',{method:'POST',body:JSON.stringify(body)});setReceipt(result);trackGoogleLead(result.id)}catch(error){setError(error.message)}finally{submitting.current=false;setPending(false)}
   return;
  }
  const request = createQuoteRequest(lines, details, company,getLanguage());
  setOverflow(request.tooLong);
  if (request.tooLong) {
   setError('Listeniz WhatsApp bağlantısı için çok uzun. Teklif dosyasını indirip görüşmeye dosya olarak ekleyin.');
   return;
  }
  setError('');
  window.open(request.url, '_blank', 'noopener,noreferrer');
 }
 function field(name, value) { onChange({ ...details, [name]: value }); setError(''); setOverflow(false); }
 return <form className={`quote-form ${compact ? 'quote-form-compact' : ''}`} aria-label={t(compact ? 'Sepetten teklif iste' : 'Teklif talebi oluştur')} onSubmit={submit}>
  {t(lines.length > 0 && <div className="quote-selected"><span><b>{t(lines.length)}{t(" ürün çeşidi · ")}{t(count)}{t(" adet")}</b>{t(" teklif mesajına eklenecek.")}</span>{t(onOpenCart && <button type="button" onClick={onOpenCart}>{t("Sepeti incele ")}<ArrowUpRight size={14}/></button>)}</div>)}
  <fieldset disabled={pending||busy}><div className="quote-fields">
   <label htmlFor={`${id}-customer`}>{t("Ad / Firma ")}<small>{t("(formla gönderimde gerekli)")}</small><input id={`${id}-customer`} autoComplete="organization" maxLength={120} value={details.customer} onChange={e => field('customer', e.target.value)} placeholder={t("Adınız veya firma adınız")}/></label>
   <label htmlFor={`${id}-email`}>{t("E-posta ")}<small>{t("(formla gönderimde gerekli)")}</small><input id={`${id}-email`} type="email" autoComplete="email" maxLength={160} value={details.email} onChange={e => field('email', e.target.value)} placeholder={t("E-posta adresiniz")}/></label>
  </div>
  <label htmlFor={`${id}-phone`}>{t("Telefon ")}<small>{t("(isteğe bağlı)")}</small><input id={`${id}-phone`} type="tel" autoComplete="tel" maxLength={40} value={details.phone || ''} onChange={e=>field('phone',e.target.value)} placeholder={t("Telefon numaranız")}/></label>
  <label htmlFor={`${id}-note`}>{t(lines.length ? 'Notunuz' : 'Ürün kodu / Talebiniz')} <small>{t(lines.length ? '(isteğe bağlı)' : '(zorunlu)')}</small><textarea id={`${id}-note`} rows={compact ? 2 : 3} maxLength={1200} required={!lines.length} value={details.note} onChange={e => field('note', e.target.value)} placeholder={t(lines.length ? 'Teslimat, marka tercihi veya teknik notunuz…' : 'Örn: SKF 6204-2RSH, 10 adet için teklif almak istiyorum.')}/></label>
  <label className="quote-honeypot" aria-hidden="true">{t("Web sitesi")}<input name="website" tabIndex={-1} autoComplete="off"/></label>
  {t(receipt && <div className="quote-success" role="status"><CircleCheck size={20}/><div><b>{t("Teklif talebiniz alındı.")}</b><span>{t("Talep numaranız: ")}{receipt.id}</span><small>{t("Ekibimiz talebinizi inceleyip sizinle iletişime geçecek.")}</small></div></div>)}
  {t(error && <p className="quote-error" role="alert">{t(error)}</p>)}
  {t(!receipt && <button className="primary send-quote-action" type="submit" value="direct" disabled={!available || pending}>{t(pending?<LoaderCircle size={18} className="spin"/>:<Send size={18}/>)} {t(pending?'Gönderiliyor…':'Teklif gönder')}</button>)}
  {t(!available && <p className="quote-service-note">{t(available===null?'Teklif hizmeti kontrol ediliyor…':'Formla teklif gönderimi henüz açılmadı. WhatsApp veya telefonla bize ulaşabilirsiniz.')}</p>)}
  {t((!site.remote||site.settings.quote_ui?.whatsappEnabled!==false)&&<button className="primary whatsapp-action" type="submit" value="whatsapp"><MessageCircle size={19}/>{t(" WhatsApp ile teklif iste ")}<ArrowUpRight size={17}/></button>)}
  <div className="quote-secondary">{t((!site.remote||site.settings.quote_ui?.downloadEnabled!==false)&&<button type="button" onClick={onDownload}><Download size={15}/>{t(" Teklif listesini indir")}</button>)}{t(overflow && <a href={makeWhatsAppUrl('Merhaba, fiyat teklifi için ürün listemi dosya olarak paylaşmak istiyorum.',company)} target="_blank" rel="noopener noreferrer">{t("WhatsApp’ı aç ")}<ArrowUpRight size={14}/></a>)}</div>
  <p className="quote-privacy-notice">{t("Teklif talebiniz için ilettiğiniz bilgiler, talebi yanıtlamak amacıyla işlenir. ")}<a href="#/kvkk">{t("KVKK aydınlatma metni")}</a>{t(" · ")}<a href="#/gizlilik">{t("Gizlilik politikası")}</a>{t(". Teklif istemek pazarlama veya ziyaretçi analizi izni sayılmaz.")}</p>
  <p className="quote-explanation">{t("Mesaj WhatsApp’ta açılır; kontrol edip siz gönderirsiniz.")}{t(overflow && ' İndirdiğiniz dosyayı görüşmeye kendiniz eklemelisiniz.')}</p>
 </fieldset></form>;
}
