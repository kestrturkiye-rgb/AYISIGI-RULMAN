#!/usr/bin/env bash
# rulmanteklif.com → Cloudflare Pages yayını (Git Bash / Linux / macOS).
# Kullanım:  bash scripts/deploy-cloudflare-pages.sh            (canlıya yayın)
#            bash scripts/deploy-cloudflare-pages.sh --preview  (önizleme dalı, canlı etkilenmez)
# Ortam:     WRANGLER_HOME_DIR  wrangler girişinin bulunduğu klasör (varsayılan: ~/.rulmanteklif/wrangler)
#            CLOUDFLARE_ACCOUNT_ID (varsayılan: alan adlarının bulunduğu hesap)
set -euo pipefail

BRANCH=main; [ "${1:-}" = "--preview" ] && BRANCH=preview
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${TMPDIR:-${TEMP:-/tmp}}/rulmanteklif-cfpages"
export CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-4b6fd4ea073d8dfc50ff0639e9be73eb}"
WRANGLER_DIR="${WRANGLER_HOME_DIR:-$HOME/.rulmanteklif/wrangler}"
# Windows'ta (Git Bash) Node'a /c/... değil C:\... biçiminde yol verilmeli; yoksa C:\c\... altına yazar.
command -v cygpath >/dev/null 2>&1 && WRANGLER_DIR="$(cygpath -w "$WRANGLER_DIR")" && OUT="$(cygpath -w "$OUT")"
export XDG_CONFIG_HOME="$WRANGLER_DIR"
cd "$ROOT"

echo "▶ Testler"
node --test tests/seo/content.test.mjs tests/branding/server.test.mjs tests/branding/domains.test.mjs tests/seo/server.test.mjs >/dev/null 2>&1 \
 || { echo "Testler başarısız; yayın durduruldu."; node --test tests/seo/content.test.mjs tests/branding/server.test.mjs tests/branding/domains.test.mjs tests/seo/server.test.mjs 2>&1 | grep -E '^✖' ; exit 1; }

echo "▶ Site derleniyor"
VITE_MINIMAL_PUBLIC_BUILD=true VITE_DATA_SOURCE=supabase VITE_STATIC_HOST=true npm run build >/dev/null
mkdir -p dist/fonts dist/brand
cp public/fonts/NotoSans-Turkish.woff2 dist/fonts/
cp public/brand/rulman-teklif.webp dist/brand/
cp dist/index.html api/site-shell.html

echo "▶ Admin derleniyor"
# Git Bash '/admin/' değerini 'C:/Program Files/Git/admin/' yoluna çevirmesin: dönüşüm yalnızca burada kapatılır.
MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*' VITE_ADMIN_BASE=/admin/ VITE_PUBLIC_SITE_URL= npm run build:admin >/dev/null

if grep -rl "Program Files" dist >/dev/null 2>&1; then echo "dist içinde hatalı yol (Program Files) var; yayın durduruldu."; exit 1; fi

echo "▶ Paket hazırlanıyor"
node scripts/package-cloudflare-pages.mjs "$OUT" >/dev/null

echo "▶ Cloudflare Pages'e yükleniyor ($BRANCH)"
cd "$OUT"
npx --yes wrangler@4 pages deploy --project-name rulmanteklif --branch "$BRANCH" --commit-dirty=true 2>&1 | grep -E "Deployment complete|https://|rror" || true

if [ "$BRANCH" = main ]; then
 echo "▶ Canlı kontrol"
 sleep 5
 fail=0
 for p in / /6001-2rs/rulman /admin/ /sitemap.xml /api/auth/session; do
  code=$(curl -s -m 30 -o /dev/null -w "%{http_code}" "https://rulmanteklif.com$p" || echo 000)
  echo "  $p → $code"; [ "$code" = 200 ] || fail=1
 done
 [ $fail = 0 ] && echo "✔ Yayın tamam." || echo "⚠ Bazı adresler 200 dönmedi; kontrol edin (ağ engeli de olabilir)."
fi
