// Cloudflare Pages yayın paketini hazırlar. Önce derleme yapılmış olmalı:
//   VITE_MINIMAL_PUBLIC_BUILD=true VITE_DATA_SOURCE=supabase VITE_STATIC_HOST=true npm run build
//   (fonts/brand kopyası) ve MSYS_NO_PATHCONV=1 VITE_ADMIN_BASE=/admin/ npm run build:admin
// Kullanım: node scripts/package-cloudflare-pages.mjs <çıktı-klasörü>
// Sonra:    cd <çıktı-klasörü> && npx wrangler pages deploy --project-name rulmanteklif --branch main
import {cp,mkdir,readFile,writeFile,readdir,rm,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {SEO_ORIGIN} from '../src/branding/domains.js';

const out=process.argv[2];
if(!out)throw Error('Çıktı klasörü verin: node scripts/package-cloudflare-pages.mjs <klasör>');
const root=fileURLToPath(new URL('..',import.meta.url));
const from=p=>join(root,p),to=p=>join(out,p);

for(const name of ['dist/index.html','dist/admin/index.html'])if(!(await stat(from(name)).catch(()=>null)))throw Error(name+' yok; önce derleyin.');
for(const name of ['dist/index.html','dist/admin/index.html'])if((await readFile(from(name),'utf8')).includes('Program Files'))throw Error(name+' hatalı yol içeriyor (Git Bash). MSYS_NO_PATHCONV=1 ile yeniden derleyin.');

await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
await cp(from('dist'),to('dist'),{recursive:true});
await cp(from('deploy/cloudflare-pages/functions'),to('functions'),{recursive:true});
await cp(from('deploy/cloudflare-pages/lib'),to('lib'),{recursive:true});
await cp(from('deploy/cloudflare-pages/wrangler.toml'),to('wrangler.toml'));
// Sunucu kodu ve içe aktardığı paylaşılan modüller (Vercel paketiyle aynı liste).
await cp(from('api'),to('api'),{recursive:true,filter:src=>!/site-shell\.html$/.test(src)});
for(const dir of ['src/branding','src/seo','src/i18n','src/security']){
 await mkdir(to(dir),{recursive:true});
 for(const f of await readdir(from(dir)))if(/\.(m?js)$/.test(f))await cp(from(join(dir,f)),to(join(dir,f)));
}
await mkdir(to('apps/admin/src'),{recursive:true});
await cp(from('apps/admin/src/project-config.json'),to('apps/admin/src/project-config.json'));

// Güvenlik başlıkları: Vercel'deki ilk rota ile aynı.
const vercel=JSON.parse(await readFile(from('deploy/admin-vercel/vercel.json'),'utf8'));
const security=vercel.routes[0].headers;
await writeFile(to('dist/_headers'),'/*\n'+Object.entries(security).map(([k,v])=>`  ${k}: ${v}`).join('\n')+'\n\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n\n/admin/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n');
// Yalnızca bu yollar fonksiyonu tetikler; geri kalan her şey statik (ücretsiz, sınırsız).
await writeFile(to('dist/_routes.json'),JSON.stringify({version:1,include:['/api/*','/sitemap*'],exclude:[]},null,1)+'\n');
// robots.txt artık tüm alan adlarında aynı (tek asıl adres).
await writeFile(to('dist/robots.txt'),'User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /hesabim\nDisallow: /teklif\nDisallow: /en/hesabim\nDisallow: /en/teklif\nSitemap: '+SEO_ORIGIN+'/sitemap.xml\n');
console.log('Cloudflare Pages paketi hazır: '+out);
