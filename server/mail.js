import nodemailer from 'nodemailer';
import { company } from '../src/company.js';
import { createQuoteText } from '../src/quote.js';
export function createMailer(env, createTransport = nodemailer.createTransport) {
 if(!env.SMTP_HOST||!env.SMTP_USER||!env.SMTP_PASSWORD||!env.SMTP_FROM)return null;
 const transport=createTransport({host:env.SMTP_HOST,port:Number(env.SMTP_PORT||587),secure:env.SMTP_SECURE==='true',requireTLS:env.SMTP_SECURE!=='true',auth:{user:env.SMTP_USER,pass:env.SMTP_PASSWORD},connectionTimeout:15000,socketTimeout:20000});
 return async quote=>{
  const result=await transport.sendMail({from:env.SMTP_FROM,to:company.email,replyTo:quote.details.email,subject:`Yeni teklif talebi: ${quote.id}`,messageId:`<${quote.id}@rulmanteklif.com>`,text:`Talep no: ${quote.id}\nTarih: ${quote.createdAt}\n\n${createQuoteText(quote.lines,quote.details)}\nTelefon: ${quote.details.phone || 'Belirtilmedi'}\n\nYönetim paneli: ${env.APP_ORIGIN}/#/admin`});
  if(!result.accepted?.length)throw new Error('SMTP did not accept the notification');
 };
}
