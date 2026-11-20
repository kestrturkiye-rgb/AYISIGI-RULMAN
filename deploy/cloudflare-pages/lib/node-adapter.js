// Vercel/Node tarzı (req, res) handler'larını Cloudflare Pages Functions'ta değiştirmeden çalıştırır.
// Handler'lar process.env'i çağrı anında okur; Pages ortam değişkenleri her istekte process.env'e yazılır.
export async function runNodeHandler(handler, context, {query = {}} = {}) {
 const {request, env} = context;
 globalThis.process ??= {env: {}};
 process.env ??= {};
 for (const [key, value] of Object.entries(env || {})) if (typeof value === 'string') process.env[key] = value;

 const url = new URL(request.url);
 const headers = {};
 request.headers.forEach((value, key) => { headers[key] = value; });
 // Vercel'in sağladığı ziyaretçi başlıklarının Cloudflare karşılıkları (analitik maskeleme için).
 const cf = request.cf || {};
 headers['x-forwarded-for'] ??= request.headers.get('cf-connecting-ip') || '';
 if (cf.country) headers['x-vercel-ip-country'] ??= String(cf.country);
 if (cf.regionCode || cf.region) headers['x-vercel-ip-country-region'] ??= String(cf.regionCode || cf.region);
 if (cf.city) headers['x-vercel-ip-city'] ??= encodeURIComponent(String(cf.city));

 const hasBody = !['GET', 'HEAD'].includes(request.method);
 const text = hasBody ? await request.text() : '';
 const req = {
  method: request.method,
  url: url.pathname + url.search,
  headers,
  query: {...Object.fromEntries(url.searchParams), ...query},
  body: hasBody ? text : undefined,
  async *[Symbol.asyncIterator]() { if (text) yield new TextEncoder().encode(text); },
 };

 const outHeaders = new Map();
 let body = null;
 const res = {
  statusCode: 200,
  setHeader(name, value) { outHeaders.set(String(name).toLowerCase(), value); return res; },
  getHeader(name) { return outHeaders.get(String(name).toLowerCase()); },
  removeHeader(name) { outHeaders.delete(String(name).toLowerCase()); },
  end(chunk) { if (chunk !== undefined && chunk !== null) body = chunk; },
 };

 await handler(req, res);

 const responseHeaders = new Headers();
 for (const [name, value] of outHeaders) {
  if (Array.isArray(value)) for (const item of value) responseHeaders.append(name, String(item));
  else responseHeaders.set(name, String(value));
 }
 const status = res.statusCode || 200;
 const noBody = request.method === 'HEAD' || [204, 304].includes(status) || (status >= 300 && status < 400 && !body);
 return new Response(noBody ? null : body, {status, headers: responseHeaders});
}
