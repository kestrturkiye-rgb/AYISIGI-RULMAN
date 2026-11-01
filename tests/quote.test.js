import test from 'node:test';
import assert from 'node:assert/strict';
import { company } from '../src/company.js';
import { createQuoteText, createQuoteRequest, makeWhatsAppUrl, MAX_WHATSAPP_URL_LENGTH } from '../src/quote.js';

const lines=[{brand:'SKF',code:'6204-2RSH/C3',qty:2},{brand:'FAG',code:'6001 2RSR C3',qty:5}];

test('public contact destination matches the verified company details',()=>{
 assert.equal(company.phone,'0553 334 75 63');assert.equal(company.email,'info@rulmanteklif.com');
 assert.equal(new URL(makeWhatsAppUrl('Merhaba')).pathname,'/905533347563');
 assert.equal(company.emailHref,'mailto:info@rulmanteklif.com');
});
test('quote contains every selected brand, full code and quantity',()=>{
 const text=createQuoteText(lines);
 assert.ok(text.includes('1. SKF 6204-2RSH/C3 — 2 adet'));
 assert.ok(text.includes('2. FAG 6001 2RSR C3 — 5 adet'));
 assert.ok(text.includes('fiyat, stok ve teslimat'));
 assert.ok(!text.includes('gönderildi'));
});
test('unknown brand is not presented as a real manufacturer',()=>{
 const text=createQuoteText([{code:'6204',brand:'Belirtilmemiş',qty:1}]);
 assert.ok(text.includes('1. 6204 — 1 adet'));assert.ok(!text.includes('Belirtilmemiş'));
});
test('customer details and Turkish characters survive URL encoding without query injection',()=>{
 const details={customer:'  Işık & Ortakları  ',email:'satin.alma@example.com',note:'Ölçü: 20 × 47 mm\nAcil &text=başka + % / ?'};
 const result=createQuoteRequest(lines,details);const url=new URL(result.url);
 assert.equal(url.origin,'https://wa.me');assert.equal(url.pathname,'/905533347563');
 assert.equal(url.searchParams.get('text'),result.text);assert.deepEqual([...url.searchParams.keys()],['text']);
 assert.ok(result.text.includes('Ad / Firma: Işık & Ortakları'));assert.ok(result.text.includes(details.note));assert.equal(result.tooLong,false);
});
test('long lists are flagged without silently truncating any product',()=>{
 const many=Array.from({length:200},(_,i)=>({brand:'SKF',code:`PRODUCT-${i}-LONG-DESIGNATION/C3`,qty:i+1}));
 const result=createQuoteRequest(many);
 assert.ok(result.url.length>MAX_WHATSAPP_URL_LENGTH);assert.equal(result.tooLong,true);
 assert.ok(result.text.includes('200. SKF PRODUCT-199-LONG-DESIGNATION/C3 — 200 adet'));
});
test('invalid quantities are rejected rather than forwarded to the supplier',()=>{
 for(const qty of [0,-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>createQuoteText([{brand:'SKF',code:'6204',qty}]),/pozitif bir tam sayı/);
});
test('a customer can request an unlisted product without having cart items',()=>{
 const result=createQuoteRequest([],{note:'30206 rulman için 10 adet teklif istiyorum.'});
 assert.ok(result.text.includes('30206 rulman için 10 adet'));assert.ok(!result.text.includes('Ad / Firma:'));assert.equal(result.tooLong,false);
});
