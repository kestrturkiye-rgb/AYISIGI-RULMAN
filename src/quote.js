import { company } from './company.js';

export const MAX_WHATSAPP_URL_LENGTH = 8000;

export function makeWhatsAppUrl(message, contact=company) {
 return `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(message)}`;
}

export function createQuoteText(lines, details = {}, language = 'tr') {
 const en=language==='en';const text = [en?'RULMAN TEKLİF — QUOTE REQUEST':'RULMAN TEKLİF — TEKLİF TALEBİ', '', lines.length
  ? (en?'Hello, please quote price, availability and delivery for the following products.':'Merhaba, aşağıdaki ürünler için fiyat, stok ve teslimat bilgisi rica ediyorum.')
  : (en?'Hello, I would like product and price information.':'Merhaba, ürün ve fiyat bilgisi almak istiyorum.')];
 if (lines.length) {
  text.push('');
  lines.forEach((line, index) => {
   if (!Number.isSafeInteger(line.qty) || line.qty <= 0) throw new Error('Ürün adedi pozitif bir tam sayı olmalıdır.');
   const brand = line.brand && line.brand !== 'Belirtilmemiş' ? `${line.brand} ` : '';
   text.push(`${index + 1}. ${brand}${line.code} — ${line.qty} ${en?'units':'adet'}${line.referenceCode&&line.name?` · ${line.name}`:''}`);
  });
 }
 const customer = (details.customer || '').trim();
 const email = (details.email || '').trim();
 const note = (details.note || '').trim();
 if (customer || email || note) text.push('');
 if (customer) text.push(`${en?'Name / Company':'Ad / Firma'}: ${customer}`);
 if (email) text.push(`${en?'Email':'E-posta'}: ${email}`);
 if (note) text.push(`${en?'Note / Product request':'Not / Ürün talebi'}: ${note}`);
 return text.join('\n');
}

export function createQuoteRequest(lines, details = {}, contact=company, language='tr') {
 const text = createQuoteText(lines, details,language);
 const url = makeWhatsAppUrl(text,contact);
 return { text, url, tooLong: url.length > MAX_WHATSAPP_URL_LENGTH };
}

export const supportWhatsAppUrl = makeWhatsAppUrl('Merhaba, ürün seçimi ve fiyat teklifi konusunda bilgi almak istiyorum.');
