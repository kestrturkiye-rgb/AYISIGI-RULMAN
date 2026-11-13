import { company } from './company.js';

export const MAX_WHATSAPP_URL_LENGTH = 8000;

export function makeWhatsAppUrl(message, contact=company) {
 return `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(message)}`;
}

export function createQuoteText(lines, details = {}) {
 const text = ['RULMAN TEKLİF — TEKLİF TALEBİ', '', lines.length
  ? 'Merhaba, aşağıdaki ürünler için fiyat, stok ve teslimat bilgisi rica ediyorum.'
  : 'Merhaba, ürün ve fiyat bilgisi almak istiyorum.'];
 if (lines.length) {
  text.push('');
  lines.forEach((line, index) => {
   if (!Number.isSafeInteger(line.qty) || line.qty <= 0) throw new Error('Ürün adedi pozitif bir tam sayı olmalıdır.');
   const brand = line.brand && line.brand !== 'Belirtilmemiş' ? `${line.brand} ` : '';
   text.push(`${index + 1}. ${brand}${line.code} — ${line.qty} adet${line.referenceCode&&line.name?` · ${line.name}`:''}`);
  });
 }
 const customer = (details.customer || '').trim();
 const email = (details.email || '').trim();
 const note = (details.note || '').trim();
 if (customer || email || note) text.push('');
 if (customer) text.push(`Ad / Firma: ${customer}`);
 if (email) text.push(`E-posta: ${email}`);
 if (note) text.push(`Not / Ürün talebi: ${note}`);
 return text.join('\n');
}

export function createQuoteRequest(lines, details = {}, contact=company) {
 const text = createQuoteText(lines, details);
 const url = makeWhatsAppUrl(text,contact);
 return { text, url, tooLong: url.length > MAX_WHATSAPP_URL_LENGTH };
}

export const supportWhatsAppUrl = makeWhatsAppUrl('Merhaba, ürün seçimi ve fiyat teklifi konusunda bilgi almak istiyorum.');
