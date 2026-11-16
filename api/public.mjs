import {readFile} from 'node:fs/promises';import {publicRpc,escapeHtml as e,textFromRich,xmlResponse} from './_public.mjs';
const ROOT='https://rulmanteklif.com';let template;
const link=(path,label)=>`<a href="${e(path)}">${e(label)}</a>`;
export default async function handler(req,res){
 if(req.method!=='GET'&&req.method!=='HEAD'){res.statusCode=405;res.end();return;}
 const url=new URL(req.url,ROOT),path=String(req.query?.path||url.pathname).replace(/\/$/,'')||'/';url.searchParams.delete('path');res.setHeader('X-Content-Type-Options','nosniff');
 if(path==='/robots.txt'){res.setHeader('Content-Type','text/plain; charset=utf-8');res.setHeader('Cache-Control','public,max-age=300');res.end('User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /hesabim\nDisallow: /teklif\nSitemap: '+ROOT+'/sitemap.xml\n');return;}
 try{
  const site=await publicRpc('get_public_site',{},10000),identity=site.settings?.identity||{},seo=site.settings?.seo||{};
  if(path==='/sitemap.xml'){
   const pages=Math.ceil(Number(site.totalProducts)/5000),items=[ROOT+'/sitemap-pages.xml',...Array.from({length:pages},(_,i)=>ROOT+'/sitemap-products-'+(i+1)+'.xml')];xmlResponse(res,'<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+items.map(loc=>'<sitemap><loc>'+e(loc)+'</loc></sitemap>').join('')+'</sitemapindex>');return;
  }
  if(path==='/sitemap-pages.xml'||/^\/sitemap-products-\d+\.xml$/.test(path)){
   let rows;if(path==='/sitemap-pages.xml'){
    const fixed=['/','/urunler','/akademi','/markalar','/hakkimizda','/iletisim','/teknik-arama','/kampanyalar','/kvkk','/gizlilik','/cerez-politikasi'];
    rows=[...new Set([...fixed,...site.categories.filter(c=>!c.parent_id).map(c=>'/urunler/'+(c.id.startsWith('group-')?c.id.slice(6):c.slug)),...site.articles.map(a=>'/akademi/'+encodeURIComponent(a.slug)),...site.pages.filter(p=>!['hesabim','teklif','admin'].includes(p.slug)).map(p=>'/'+encodeURIComponent(p.slug))])].map(path=>({path}));
   }else{const page=Number(path.match(/products-(\d+)/)[1]);if(page<1||page>Math.ceil(Number(site.totalProducts)/5000)){res.statusCode=404;res.end();return;}rows=(await publicRpc('get_public_sitemap',{p_page:page,p_size:5000},30000)).map(p=>({path:'/urun/'+encodeURIComponent(p.slug),modified:p.updated_at}));}
   xmlResponse(res,'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+rows.map(r=>'<url><loc>'+e(ROOT+r.path)+'</loc>'+(r.modified?'<lastmod>'+e(r.modified)+'</lastmod>':'')+'</url>').join('')+'</urlset>');return;
  }
  const headings={'/':'Rulman ve endüstriyel güç aktarım ürünleri','/urunler':'Ürünler','/akademi':'Rulman Akademisi','/markalar':'Markalar','/hakkimizda':'Hakkımızda','/iletisim':'İletişim','/teklif':'Teklif al','/teknik-arama':'Teknik arama','/kampanyalar':'Kampanyalı ürünler','/hesabim':'Üye hesabı','/kvkk':'KVKK Aydınlatma Metni','/gizlilik':'Gizlilik Politikası','/cerez-politikasi':'Çerez Politikası'};
  const category=site.categories.find(c=>!c.parent_id&&path==='/urunler/'+(c.id.startsWith('group-')?c.id.slice(6):c.slug)),page=site.pages.find(p=>path==='/'+p.slug),article=site.articles.find(a=>path==='/akademi/'+a.slug);
  let bootstrapCatalog=null,product=null,body='',specific=article?.seo||page?.seo||{},title=article?.title||page?.title||category?.name||headings[path],description=article?.summary||category?.description||seo.description||'',status=200;
  if(path.startsWith('/urun/')){const slug=decodeURIComponent(path.slice(6));product=await publicRpc('get_public_product_by_slug',{p_slug:slug},10000);if(product){title=product.name;specific=product.seo||{};description=product.short_description||product.name;}}
  if(!title){status=404;title='Sayfa bulunamadı';body='<p>İstenen içerik bulunamadı veya yayında değil.</p>';}
  if(product){body=`<article itemscope itemtype="https://schema.org/Product"><h1 itemprop="name">${e(product.name)}</h1><p itemprop="sku">${e(product.sku)}</p><p>${e(product.brand)} · ${e(product.category)}</p><p itemprop="description">${e(description)}</p><p>${e(textFromRich(product.long_description))}</p><table><tbody>${(product.specifications||[]).map(s=>'<tr><th>'+e(s.name)+'</th><td>'+e([s.value,s.unit].filter(Boolean).join(' '))+'</td></tr>').join('')}</tbody></table>${link('/teklif','Bu ürün için teklif isteyin')}</article>`;}
  else if(article){const full=await publicRpc('get_public_article',{article_slug:article.slug},10000);body='<h1>'+e(title)+'</h1><p>'+e(description)+'</p>'+((full?.body?.sections||[]).map(s=>'<section><h2>'+e(s.title)+'</h2>'+(s.paragraphs||[]).map(p=>'<p>'+e(p)+'</p>').join('')+'</section>').join('')||'<p>'+e(textFromRich(full?.body))+'</p>');}
  else if(page)body='<h1>'+e(title)+'</h1><p>'+e(textFromRich(page.body))+'</p>';
  else if(status===200){body='<h1>'+e(title)+'</h1><p>'+e(description)+'</p>';
   if((category||path==='/urunler')&&url.searchParams.size===0){const args={p_query:'',p_code:null,p_inner:null,p_outer:null,p_width:null,p_category:category?.id||null,p_brand:null,p_page:1,p_page_size:24};const data=await publicRpc('search_public_catalog',args,10000);bootstrapCatalog={method:'search_public_catalog',args,data};body+='<ul>'+data.items.map(p=>'<li>'+link('/urun/'+encodeURIComponent(p.slug),p.name+' — '+p.sku)+'</li>').join('')+'</ul>';}
   else if(path==='/akademi')body+='<ul>'+site.articles.map(a=>'<li>'+link('/akademi/'+encodeURIComponent(a.slug),a.title)+'</li>').join('')+'</ul>';
   else if(path==='/markalar')body+='<ul>'+site.brands.map(b=>'<li>'+e(b.name)+'</li>').join('')+'</ul>';
   else if(path==='/iletisim')body+='<p>'+e(site.settings?.contact?.address)+'</p><p>'+e(site.settings?.contact?.phone)+'</p><p>'+e(site.settings?.contact?.email)+'</p>';
  }
  const noindex=status!==200||['/hesabim','/teklif'].includes(path)||url.searchParams.size>0;
  title=specific.metaTitle||specific.title||(path==='/'?seo.title||title:title+' | '+(identity.name||'Rulman Teklif'));description=specific.metaDescription||specific.description||description;
  const head=`<link rel="canonical" href="${e(ROOT+path)}"><meta name="robots" content="${noindex?'noindex,follow':'index,follow'}"><meta property="og:title" content="${e(title)}"><meta property="og:description" content="${e(description)}"><meta property="og:url" content="${e(ROOT+path)}"><meta property="og:type" content="${article?'article':'website'}"><meta property="og:image" content="${ROOT}/brand/rulman-teklif.webp">`+(/^[A-Za-z0-9_-]{10,200}$/.test(seo.searchConsoleVerification||'')?`<meta name="google-site-verification" content="${e(seo.searchConsoleVerification)}">`:'');
  template??=await readFile(new URL('./site-shell.html',import.meta.url),'utf8');
  const html=template.replace(/<title>[\s\S]*?<\/title>/,()=>'<title>'+e(title)+'</title>').replace(/<meta name="description"[^>]*>/,()=>'<meta name="description" content="'+e(description)+'">').replace('</head>',()=>head+'</head>').replace('<div id="root"></div>',()=>`<div id="root" data-rt-site="${e(JSON.stringify(site))}" data-rt-catalog="${e(JSON.stringify(bootstrapCatalog))}"><header class="container"><p>${link('/',identity.name||'Rulman Teklif')}</p><nav>${site.categories.filter(c=>!c.parent_id).map(c=>link('/urunler/'+(c.id.startsWith('group-')?c.id.slice(6):c.slug),c.name)).join(' · ')} · ${link('/akademi','Rulman Akademisi')}</nav></header><main class="container standalone-page">${body}</main></div>`);
  res.statusCode=status;res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control',noindex?'no-store':'public,max-age=0,s-maxage=30,stale-while-revalidate=60');if(noindex)res.setHeader('X-Robots-Tag','noindex,follow');res.end(req.method==='HEAD'?'':html);
 }catch{res.statusCode=503;res.setHeader('Retry-After','30');res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><html lang="tr"><meta charset="UTF-8"><title>Rulman Teklif</title><h1>İçerik geçici olarak yüklenemedi</h1><p>Lütfen kısa süre sonra tekrar deneyin.</p></html>');}
}
