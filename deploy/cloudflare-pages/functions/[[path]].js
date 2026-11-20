// Cloudflare Pages yönlendiricisi. _routes.json yalnızca /api/* ve /sitemap* isteklerini buraya gönderir;
// diğer tüm sayfalar statik dosya (SPA) olarak sunulur ve fonksiyon kotası harcamaz.
import {runNodeHandler} from '../lib/node-adapter.js';
import authHandler from '../api/auth/[action].mjs';
import collectHandler from '../api/collect.mjs';
import quoteHandler from '../api/quote.mjs';
import publicHandler from '../api/public.mjs';

const AUTH_ACTIONS = /^\/api\/auth\/(session|login|logout|signup|recover|callback|password|delete-account)\/?$/;
const SITEMAP = /^\/(sitemap\.xml|sitemap-pages\.xml|sitemap-products-[0-9]+\.xml)$/;

export async function onRequest(context) {
 const {pathname} = new URL(context.request.url);
 const auth = pathname.match(AUTH_ACTIONS);
 if (auth) return runNodeHandler(authHandler, context, {query: {action: auth[1]}});
 if (pathname === '/api/collect') return runNodeHandler(collectHandler, context);
 if (pathname === '/api/quote') return runNodeHandler(quoteHandler, context);
 const sitemap = pathname.match(SITEMAP);
 if (sitemap) return runNodeHandler(publicHandler, context, {query: {path: '/' + sitemap[1]}});
 if (pathname.startsWith('/api/')) return new Response(JSON.stringify({error: 'Bulunamadı.'}), {status: 404, headers: {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'}});
 return context.next();
}
