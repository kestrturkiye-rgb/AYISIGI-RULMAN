import React, { useId, useState, useEffect, useRef } from 'react';
import { MessageCircle, Download, ArrowUpRight, Send, LoaderCircle, CircleCheck } from 'lucide-react';
import { createQuoteRequest, makeWhatsAppUrl } from './quote';
import { api, quoteServiceStatus } from './api';

export default function QuoteRequest({ lines, details, onChange, onDownload, onOpenCart, compact = false }) {
 const id = useId();
 const [error, setError] = useState('');
 const [overflow, setOverflow] = useState(false);
 const [available,setAvailable]=useState(null);
 const [pending,setPending]=useState(false);
 const [receipt,setReceipt]=useState(null);
 const requestRef=useRef(null);const submitting=useRef(false);
 useEffect(()=>{let active=true;quoteServiceStatus().then(status=>{if(active)setAvailable(status.quotesEnabled)});return()=>{active=false}},[]);
 const signature=JSON.stringify({items:lines.map(p=>({id:p.id,qty:p.qty})),details});
 useEffect(()=>{setReceipt(null);setError('');requestRef.current=null},[signature]);
 const count = lines.reduce((sum, line) => sum + line.qty, 0);
 async function submit(event) {
  event.preventDefault();
  if (!lines.length && !details.note.trim()) { setError('Aradığınız ürün kodunu veya talebinizi yazın.'); return; }
  if(event.nativeEvent.submitter?.value!=='whatsapp') {
   if(!available||submitting.current)return;
   if(!details.customer.trim()||!details.email.trim()){setError('Teklif göndermek için ad / firma ve e-posta adresinizi girin.');return}
   requestRef.current ||= {key:crypto.randomUUID(),signature};
   submitting.current=true;setPending(true);setError('');
   try{const result=await api('/quotes',{method:'POST',body:JSON.stringify({requestKey:requestRef.current.key,items:lines.map(p=>({id:p.id,qty:p.qty})),details,website:event.currentTarget.elements.website.value})});setReceipt(result)}catch(error){setError(error.message)}finally{submitting.current=false;setPending(false)}
   return;
  }
  const request = createQuoteRequest(lines, details);
  setOverflow(request.tooLong);
  if (request.tooLong) {
   setError('Listeniz WhatsApp bağlantısı için çok uzun. Teklif dosyasını indirip görüşmeye dosya olarak ekleyin.');
   return;
  }
  setError('');
  window.open(request.url, '_blank', 'noopener,noreferrer');
 }
 function field(name, value) { onChange({ ...details, [name]: value }); setError(''); setOverflow(false); }
 return <form className={`quote-form ${compact ? 'quote-form-compact' : ''}`} aria-label={compact ? 'Sepetten teklif iste' : 'Teklif talebi oluştur'} onSubmit={submit}>
  {lines.length > 0 && <div className="quote-selected"><span><b>{lines.length} ürün çeşidi · {count} adet</b> teklif mesajına eklenecek.</span>{onOpenCart && <button type="button" onClick={onOpenCart}>Sepeti incele <ArrowUpRight size={14}/></button>}</div>}
  <fieldset disabled={pending}><div className="quote-fields">
   <label htmlFor={`${id}-customer`}>Ad / Firma <small>(formla gönderimde gerekli)</small><input id={`${id}-customer`} autoComplete="organization" maxLength={120} value={details.customer} onChange={e => field('customer', e.target.value)} placeholder="Adınız veya firma adınız"/></label>
   <label htmlFor={`${id}-email`}>E-posta <small>(formla gönderimde gerekli)</small><input id={`${id}-email`} type="email" autoComplete="email" maxLength={160} value={details.email} onChange={e => field('email', e.target.value)} placeholder="E-posta adresiniz"/></label>
  </div>
  <label htmlFor={`${id}-phone`}>Telefon <small>(isteğe bağlı)</small><input id={`${id}-phone`} type="tel" autoComplete="tel" maxLength={40} value={details.phone || ''} onChange={e=>field('phone',e.target.value)} placeholder="Telefon numaranız"/></label>
  <label htmlFor={`${id}-note`}>{lines.length ? 'Notunuz' : 'Ürün kodu / Talebiniz'} <small>{lines.length ? '(isteğe bağlı)' : '(zorunlu)'}</small><textarea id={`${id}-note`} rows={compact ? 2 : 3} maxLength={1200} required={!lines.length} value={details.note} onChange={e => field('note', e.target.value)} placeholder={lines.length ? 'Teslimat, marka tercihi veya teknik notunuz…' : 'Örn: SKF 6204-2RSH, 10 adet için teklif almak istiyorum.'}/></label>
  <label className="quote-honeypot" aria-hidden="true">Web sitesi<input name="website" tabIndex={-1} autoComplete="off"/></label>
  {receipt && <div className="quote-success" role="status"><CircleCheck size={20}/><div><b>Teklif talebiniz alındı.</b><span>Talep numaranız: {receipt.id}</span><small>Ekibimiz talebinizi inceleyip sizinle iletişime geçecek.</small></div></div>}
  {error && <p className="quote-error" role="alert">{error}</p>}
  {!receipt && <button className="primary send-quote-action" type="submit" value="direct" disabled={!available || pending}>{pending?<LoaderCircle size={18} className="spin"/>:<Send size={18}/>} {pending?'Gönderiliyor…':'Teklif gönder'}</button>}
  {!available && <p className="quote-service-note">{available===null?'Teklif hizmeti kontrol ediliyor…':'Formla teklif gönderimi henüz açılmadı. WhatsApp veya telefonla bize ulaşabilirsiniz.'}</p>}
  <button className="primary whatsapp-action" type="submit" value="whatsapp"><MessageCircle size={19}/> WhatsApp ile teklif iste <ArrowUpRight size={17}/></button>
  <div className="quote-secondary"><button type="button" onClick={onDownload}><Download size={15}/> Teklif listesini indir</button>{overflow && <a href={makeWhatsAppUrl('Merhaba, fiyat teklifi için ürün listemi dosya olarak paylaşmak istiyorum.')} target="_blank" rel="noopener noreferrer">WhatsApp’ı aç <ArrowUpRight size={14}/></a>}</div>
  <p className="quote-explanation">Mesaj WhatsApp’ta açılır; kontrol edip siz gönderirsiniz.{overflow && ' İndirdiğiniz dosyayı görüşmeye kendiniz eklemelisiniz.'}</p>
 </fieldset></form>;
}
