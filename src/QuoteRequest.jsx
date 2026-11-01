import React, { useId, useState } from 'react';
import { MessageCircle, Download, ArrowUpRight } from 'lucide-react';
import { createQuoteRequest, makeWhatsAppUrl } from './quote';

export default function QuoteRequest({ lines, details, onChange, onDownload, onOpenCart, compact = false }) {
 const id = useId();
 const [error, setError] = useState('');
 const [overflow, setOverflow] = useState(false);
 const count = lines.reduce((sum, line) => sum + line.qty, 0);
 function submit(event) {
  event.preventDefault();
  if (!lines.length && !details.note.trim()) { setError('Aradığınız ürün kodunu veya talebinizi yazın.'); return; }
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
  <div className="quote-fields">
   <label htmlFor={`${id}-customer`}>Ad / Firma <small>(isteğe bağlı)</small><input id={`${id}-customer`} autoComplete="organization" maxLength={120} value={details.customer} onChange={e => field('customer', e.target.value)} placeholder="Adınız veya firma adınız"/></label>
   <label htmlFor={`${id}-email`}>E-posta <small>(isteğe bağlı)</small><input id={`${id}-email`} type="email" autoComplete="email" maxLength={160} value={details.email} onChange={e => field('email', e.target.value)} placeholder="E-posta adresiniz"/></label>
  </div>
  <label htmlFor={`${id}-note`}>{lines.length ? 'Notunuz' : 'Ürün kodu / Talebiniz'} <small>{lines.length ? '(isteğe bağlı)' : '(zorunlu)'}</small><textarea id={`${id}-note`} rows={compact ? 2 : 3} maxLength={1200} required={!lines.length} value={details.note} onChange={e => field('note', e.target.value)} placeholder={lines.length ? 'Teslimat, marka tercihi veya teknik notunuz…' : 'Örn: SKF 6204-2RSH, 10 adet için teklif almak istiyorum.'}/></label>
  {error && <p className="quote-error" role="alert">{error}</p>}
  <button className="primary whatsapp-action" type="submit"><MessageCircle size={19}/> WhatsApp ile teklif iste <ArrowUpRight size={17}/></button>
  <div className="quote-secondary"><button type="button" onClick={onDownload}><Download size={15}/> Teklif listesini indir</button>{overflow && <a href={makeWhatsAppUrl('Merhaba, fiyat teklifi için ürün listemi dosya olarak paylaşmak istiyorum.')} target="_blank" rel="noopener noreferrer">WhatsApp’ı aç <ArrowUpRight size={14}/></a>}</div>
  <p className="quote-explanation">Mesaj WhatsApp’ta açılır; kontrol edip siz gönderirsiniz.{overflow && ' İndirdiğiniz dosyayı görüşmeye kendiniz eklemelisiniz.'}</p>
 </form>;
}
