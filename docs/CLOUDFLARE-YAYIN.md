# Cloudflare Pages yayını

20 Kasım 2026'dan itibaren rulmanteklif.com ve diğer 9 alan adı **Cloudflare Pages** üzerinde
(ücretsiz plan) yayınlanıyor. Vercel projesi `rulman-teklif-admin` artık kullanılmıyor
(Hobby planı Fast Origin Transfer kotası nedeniyle durduruldu).

## Mimari
- **Statik SPA:** `dist/` (genel site) ve `dist/admin/` (yönetim paneli). Sayfalar tarayıcıda oluşur;
  statik dosyalar için Cloudflare'de trafik/istek sınırı yoktur. Tanımsız yollar `index.html`'e düşer (SPA).
- **Pages Functions:** yalnızca `/api/*` ve `/sitemap*` (`dist/_routes.json`).
  - `deploy/cloudflare-pages/functions/[[path]].js` yönlendirici
  - `deploy/cloudflare-pages/lib/node-adapter.js` — mevcut Vercel/Node `(req, res)` handler'larını
    (`api/*.mjs`) değiştirmeden çalıştırır.
- **robots.txt** statik; **güvenlik başlıkları** `dist/_headers` (Vercel'deki CSP ile aynı).
- **Gizli değişkenler** (Pages → Settings → Variables): `RT_AUTH_COOKIE_KEY`,
  `RT_GATEWAY_HMAC_SECRET`, `RT_OPS_URL`. `NODE_ENV=production` `wrangler.toml` içinde.
- **DNS:** 10 alan adının apex ve `www` kayıtları proxied CNAME → `rulmanteklif-atv.pages.dev`;
  20'si de Pages projesinde custom domain.

Cloudflare hesabı: furkansahinn77 (`4b6fd4ea073d8dfc50ff0639e9be73eb`), proje: `rulmanteklif`.

## Yayın
```bash
bash scripts/deploy-cloudflare-pages.sh            # canlı
bash scripts/deploy-cloudflare-pages.sh --preview  # önizleme (canlı etkilenmez)
```
Betik sırasıyla: SEO/marka testleri → site derlemesi → admin derlemesi → hatalı yol kontrolü →
paket (`scripts/package-cloudflare-pages.mjs`) → `wrangler pages deploy` → canlı adres kontrolü.

Gereken: wrangler girişi (`WRANGLER_HOME_DIR`, varsayılan `~/.rulmanteklif/wrangler`;
yoksa `XDG_CONFIG_HOME=<klasör> npx wrangler@4 login`).

## Bilinen farklar (Vercel'e göre)
- Sayfalar sunucuda HTML olarak üretilmiyor (ücretsiz fonksiyon kotası Google taramasına yetmez).
- `www` adresleri apex'e 301 yönlenmiyor; içerik doğrudan sunuluyor (canonical yine rulmanteklif.com).
- Günlük `/api/retention` cron'u çalışmıyor; Supabase pg_cron'a taşınmalı.
