import { readFileSync } from 'node:fs';
import {mergeCatalog} from '../src/catalog-merge.js';
import { resolve } from 'node:path';
import { decodeCatalog } from '../src/catalog-data.js';
import { createApplication } from './app.js';
import { createMailer } from './mail.js';
const env=process.env;
if(!env.APP_ORIGIN)throw Error('APP_ORIGIN is required.');
if(env.NODE_ENV==='production'&&!env.APP_ORIGIN.startsWith('https://'))throw Error('Production requires an HTTPS APP_ORIGIN.');
const products=new Map(decodeCatalog(mergeCatalog(JSON.parse(readFileSync('public/catalog/index.json','utf8')),JSON.parse(readFileSync('public/catalog/additions.json','utf8')))).map(p=>[p.id,p]));
const runtime=createApplication({dbPath:resolve(env.DATA_DIR||'data','quotes.sqlite'),products,adminHash:env.ADMIN_PASSWORD_HASH,origin:env.APP_ORIGIN,mailer:createMailer(env),staticDir:resolve('dist'),secureCookies:env.NODE_ENV==='production',trustProxy:env.TRUST_PROXY_HOPS?Number(env.TRUST_PROXY_HOPS):false});
const server=runtime.app.listen(Number(env.PORT||3000),env.HOST||'127.0.0.1',()=>console.log('Rulman Teklif server ready'));
const timer=setInterval(()=>runtime.processOutbox().catch(()=>console.error('Email worker failed')),15000);timer.unref();
function stop(){clearInterval(timer);server.close(async()=>{await runtime.processOutbox();runtime.store.close();process.exit(0)})}
process.on('SIGTERM',stop);process.on('SIGINT',stop);
