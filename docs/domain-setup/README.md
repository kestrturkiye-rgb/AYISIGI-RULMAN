# rulmanteklif.com alan adı geçişi

Vercel projesi: `rulman-teklif-admin` (`prj_LNMcFN1YPhsnCLVCpiqCJo455nKD`). Natro kayıt firmasıdır; yetkili DNS Cloudflare'dadır (`fred.ns.cloudflare.com`, `kehlani.ns.cloudflare.com`).

## Cloudflare kayıtları

Vercel API'sinin bu proje için döndürdüğü hedefler:

| Tür | Ad | Hedef | Proxy | TTL |
| --- | --- | --- | --- | --- |
| A | @ | 216.198.79.1 | DNS only | Auto |
| CNAME | www | b47b254bab90fc36.vercel-dns-017.com | DNS only | Auto |

Mevcut MX ve TXT kayıtları değiştirilmez. FTP kaydının ana domaine bağlı kalıp Vercel'e taşınmasını önlemek için `ftp` eski web sunucusu `176.62.166.129` adresinde A/DNS only olarak korunabilir.

Her iki domain Vercel projesine eklendi. Bu işlem tek başına mevcut DNS trafiğini değiştirmez. DNS değişikliği ve HTTPS durumu canlı doğrulama raporlarından ayrıca takip edilir.

## Uygulama uyumluluğu

- Tam eşleşen HTTPS origin listesi ile eski Vercel adresi, kök domain ve www desteklenir. Başka host, port veya benzer domain kabul edilmez.
- Auth çerezleri host ile sınırlı, HttpOnly/Secure kalır. Giriş ve parola kurtarma yönlendirmeleri isteğin doğrulanmış hostunda kalır. DNS geçişi mevcut oturumu yeni domaine taşımaz; tekrar giriş gerekir.
- Teklif ve rızaya bağlı ziyaretçi analizi yeni domainde aynı-origin endpointleri kullanır. GitHub Pages mevcut Vercel hizmetini kullanmaya devam eder.
- Admin panelinin siteye dönüş bağlantısı bulunduğu domainin köküne döner.
- Supabase callback izin listesine iki domain eklendi; paylaşılan projenin site URL'si ve diğer uygulamaların kayıtları korunur.

## Kontrol

`node tests/security/domain.test.mjs` ve `node tests/security/auth.test.mjs` domain/sahte origin ve kurtarma yönlendirmesini yerelde sınar. `npm run build:complete` site ve admin uygulamasını derler.

DNS sonrası `node scripts/security/domain-smoke.mjs https://rulmanteklif.com` ve www adresi için aynı komut çalıştırılır. Bu canlı kontroller hesap oluşturmaz, giriş yapmaz, teklif ya da kabul edilmiş analiz olayı yazmaz. E-posta teslimi ve gerçek kullanıcıyla giriş ayrı doğrulanmalıdır.
