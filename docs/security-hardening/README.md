# Güvenlik düzeltmeleri — inceleme taslağı

Bu paketin uygulama güvenliği değişiklikleri 14 Kasım 2026 yayınına alındı; canlı durum için `docs/full-release` kayıtlarına bakın. Mevcut katalog yeniden aktarılmadı ve müşteri kayıtları silinmedi. Eski migration dosyaları değiştirilmedi; yeni migration `202611140022_auth_and_erasure.sql`.

## Değişiklikler

| Konu | Taslaktaki çözüm | Canlıya geçiş şartı |
|---|---|---|
| Parola | Yeni parola/üyelik/personel hesabında 12–128 karakter; normal parola değişiminde mevcut parola; kurtarmada server tarafından doğrulanan PKCE | Auth `password_min_length=12`; mevcut kısa parolayla giriş bozulmaz |
| CSP | Üretim HTML meta politikası; Vercel'de gerçek CSP header ve `frame-ancestors 'none'`; script `unsafe-inline`/`unsafe-eval` yok | Hem katalog hem admin yeniden derlenmeli/yayınlanmalı |
| Oturum | Şifreli `__Host-rt-session`, `HttpOnly; Secure; SameSite=Lax; Path=/`, mutlak 12 saat; PKCE çerezi 15 dakika | Server-only `RT_AUTH_COOKIE_KEY` ve aynı origin auth API |
| CSRF | Ayrı `__Host-rt-csrf`, `SameSite=Strict`, rastgele çift-gönderim anahtarı, kesin Origin, JSON ve yöntem kontrolü | Vercel auth route'u |
| Hesap silme | Mevcut parola + `HESABIMI SİL`; yerel profil silme, kendine ait teklif PII anonimleştirme, PDF silme, tekrar denenebilir kalıcı iş | SQL 022 + Edge güncellemesi |
| Bağımlılıklar | ExcelJS 4.4 korunur, uuid 11.1.1 override; geliştirme zincirindeki Sentry/glob/minimatch kayıtları da kapatıldı | Kilitten `npm ci` ve yeni build |
| Yedek | AES-256-GCM+scrypt, PostgreSQL ortak snapshot, dosya SHA-256, gerçek yerel geri yükleme + satır özeti kontrolü | Canlı DB bağlantısı, harici kalıcı depo ve saklama planı gerekli |

### Oturumun pratik etkisi

GitHub Pages sunucu çalıştıramaz. Bu yüzden üyelik/kampanya işlemleri `https://rulman-teklif-admin.vercel.app/` adresinde, admin `/admin/#/giris` adresinde açılır. GitHub Pages katalog ve ürün rotaları korunur; üyelik bağlantısı güvenli origin'e yönlenir. Üçüncü taraf çerezine ihtiyaç yoktur. Eski `rt-admin-auth-v1` ve `rt-supabase-auth` oturum/PKCE/user kayıtları istemcide temizlenir; yayın sonrası tekrar giriş gerekir.

Refresh token JavaScript'e veya localStorage'a verilmez. Supabase RLS istekleri için kısa ömürlü access token yalnızca bellekte bulunur. BroadcastChannel sadece “oturum değişti” sinyali taşır. Rol, fiyat ve veri izinleri veritabanında doğrulanmaya devam eder. Kullanıcı girdisi / provider hata ayrıntıları API hata yanıtına veya loga dökülmez.

Zorunlu oturum/CSRF çerezleri analitik izninden ayrıdır. İsteğe bağlı ziyaretçi analizi onaydan önce çalışmaz; ret/izin kaldırma ve DNT/GPC davranışı korunur. Tarayıcıya indirilen görsel/HTML/JS tamamen kopyalanamaz hale getirilemez; bu çalışma hesap ve sunucu verisini korur, kopyalamayı engellediğini iddia etmez.

### Ortak Supabase projesinde silme sınırı

Projede başka bir uygulamanın `cms_records` tablosu vardır. Bu durumda global Auth kimliği **silinmez**; başka uygulamadaki hesaba dokunulmaz. Rulman profili fiziksel silinir, ona bağlı teklif müşteri bilgileri anonimleştirilir, erişim tombstone ile kapatılır. Başka üyeye ait teklif veya ortak müşteri kaydı korunur. Admin/editör/satış hesapları bu müşteri akışından silinemez. Personel rol atama ile silme aynı veritabanı kilidini kullanır.

Kalan teknik tombstone/job/audit kimlikleri yeni oturumla profili tekrar oluşturmayı engellemek içindir. Dosya silme geçici başarısızsa sonuç `202 pending` olur; mevcut günlük maintenance cron'u bekleyen işleri tekrar dener. Tamamlanmamış dosya silme işlemi tamamlandı diye gösterilmez. Yedeklerin eski PII içermesi olağandır; erişim/saklama süresi ve geri yükleme sonrası silme taleplerini yeniden uygulama operasyon planına dahil edilmelidir.

### Excel güvenlik kaydının kapsamı

`npm audit` hem production hem dev ağacında 0 kayıt verir. ExcelJS'in Node uuid bağımlılığı 11.1.1'e kilitlendi. ExcelJS tarayıcı için kendi hazır paketini içerir; npm override bu hazır paketi yeniden üretmez. Uygulamanın Excel akışında uuid'nin etkilenen v3/v5/v6 buffer API'si çağrılmaz; ExcelJS kullandığı yerde v4 üretir. Bu bir genel “tüm gömülü kod güncellendi” iddiası değildir. Gerçek XLSX okuma/yazma hem Node'da hem sıkı CSP altında tarayıcıda doğrulandı. İçe aktarmada formüller, 10 MB üstü giriş, 40 MB üstü açılmış ZIP ve aşırı satırlar reddedilir.

## Testleri çalıştırma

Node 24, Chromium, Deno, PostgreSQL 17 istemcileri ve loopback test PostgreSQL gerekir. Testler canlı Supabase'i değiştirmez; ayrı test veritabanlarını oluşturup kaldırır. Geri yükleme aracı yalnızca boş, `rt_restore_` önekli loopback veritabanlarını kabul eder.

```bash
npm ci --ignore-scripts
npm audit
npm run build:complete
# Yerel DB varsayılanı postgresql://postgres@127.0.0.1:55432/postgres
# pg_dump ve pg_restore PATH'te değilse RT_PG_BIN=/.../postgresql/17/bin tanımlayın.
npm run test:security
npm run test:security:browser
```

Yeni browser testi üretim bundle + gerçek PostgreSQL/RLS + gerçek Edge kodu kullanır. Auth sağlayıcısı bu testte emüledir; canlı e-posta teslimatı/SMTP veya canlı kullanıcı silme testi değildir. Üretim çerezlerinin Secure/HttpOnly/__Host bayrakları server testinde, HttpOnly ve token depolamama davranışı browser testinde doğrulanır. Yerel HTTP test çerezi adları `rt-*-dev` kullanır; üretim bunu kullanmaz.

Yerel geliştirmede `.env.local` içine server-only ayarları koyup `NODE_ENV=development npm run dev:auth` ile auth köprüsünü, ayrı terminalde `npm run dev` / `npm run dev:admin` ile Vite'ı açın. Köprü yalnızca loopback dinler. Vite `/api/auth` isteklerini bu köprüye aktarır. Tarayıcı ve sunucu Supabase proje ayarları eşleşmelidir; sunucuda opsiyonel `RT_SUPABASE_URL` / `RT_SUPABASE_PUBLIC_KEY` tanımlanabilir. Bu geliştirme sunucusu internete açılmaz.

## Şifreli yedek ve doğrulama

Gizli değerleri sohbete veya komut argümanına yazmayın; güvenli ortam değişkeni/depo kullanın. `.env.example` değişkenleri içerir. Anahtar en az 24 karakter olmalı, yedekten ayrı saklanmalıdır. PostgreSQL 17 `pg_dump`/`pg_restore` gerekir. Uzak DB TLS sertifikası doğrulanır.

```bash
npm run security:backup -- create --output=/guvenli-dizin/rulman.rtbackup
# RT_RESTORE_DATABASE_URL: sadece boş yerel rt_restore_* veritabanı
npm run security:backup -- restore-verify --input=/guvenli-dizin/rulman.rtbackup
```

Tam uygulama yedeği `public/private/auth/storage` DB şemalarını ve `media-originals/media-published/quote-documents` dosyalarını içerir. Başka uygulama tabloları aynı DB şemasında olabileceği için yedek özel tutulur. Storage içermeyen işlem için `--database-only` bilinçli seçilmeli; bu sonuç tam dosya yedeği sayılmaz. Araç yedekleri `public`/`dist` altına yazmayı reddeder. Geçici açık dosyalar 0700 dizinde tutulur ve işlem sonunda temizlenir.

`restore-verify` şifre bütünlüğünü, tüm dosya boyut/SHA-256 değerlerini, DB'nin gerçek geri yüklenmesini ve her tablonun satır sayısı/içerik özetini kontrol eder. Storage dosyalarını doğrular, canlı Storage'a yüklemez. Edge kodu, ortam gizli anahtarları ve Supabase tarafından yönetilen roller/uzantılar ayrıca kurtarma planına dahil edilmelidir. Production restore yalnızca aynı Supabase uzantıları/rolleri kurulmuş ayrı bir projede yapılmalı; bu araç production DB'ye yazmayı özellikle reddeder.

**Henüz canlı yedek alınmadı ve harici otomatik yedekleme kurulmadı.** Canlı DB bağlantısı ve yedek deposu yok. Test edilen şey sentetik verilerle gerçek yerel geri yüklemedir. Canlı yedek için ayrı proje geri yükleme provası ve dış depo saklama planı tamamlanmadan “doğrulanmış canlı yedek” denmemeli.

## Canlıya uygulama sırası (bu taslakta çalıştırılmadı)

1. Canlı DB+Storage yedeğini özel harici depoya alıp ayrı test projesinde geri yükleyerek doğrulayın.
2. SQL 022'yi mevcut migration mekanizmasıyla bir kez uygulayın; eski migration'ları tekrar çalıştırmayın.
3. `rt-admin-operations` Edge sürümünü güncelleyin; mevcut HMAC ve bildirim ayarlarını koruyun.
4. `python scripts/security/configure-auth.py` ve `python scripts/security/configure-vercel.py` salt okunur ön kontrol yapar. Apply ancak aşağıdaki açık komutlarla olur:

```bash
python scripts/security/configure-auth.py --apply --confirm-project=lptosaejlowasrbcyqnu
python scripts/security/configure-vercel.py --apply --confirm-project=prj_LNMcFN1YPhsnCLVCpiqCJo455nKD
```

Auth aracı yalnızca min parola ve canonical redirect allowlist eklerini yazar, ortak `site_url`/SMTP ayarlarını korur. Vercel aracı yalnızca doğru projede eksik server cookie anahtarını rastgele üretir; var olan anahtarı döndürmez/değiştirmez. Anahtar 64 hex karakter, server-only olmalı. `VITE_` değişkenine yazılmaz. Anahtar rotasyonu oturumları kapatır.

5. Katalog+admin üretim build'ini ve testlerini çalıştırın. Vercel deploy yapılandırması auth fonksiyonunu, iç bağımlılıklarını ve CSP header'ını içerir. Deploy aracı cookie anahtarı eksikse veya meta/header CSP eşleşmiyorsa durur.
6. Onaylı yayın adımında Vercel'i, ardından GitHub Pages istemcisini güncelleyin. Üretimde giriş, yenileme, çıkış, kurtarma, üyelik, kampanya fiyatları ve yeni hesapla silme smoke testi yapın. Günlük cron/pending job kontrolünü doğrulayın.

Yayın öncesi min parola 6 ve cookie anahtarı eksikti; bu yayında min parola 12 yapıldı ve sunucu cookie anahtarı tanımlandı. Canlı doğrulama kaydı `docs/full-release` altındadır. Eski canlı deploy geri alınabilir; veri migration'ını rollback etmek için anonimleştirilmiş müşteri verisini otomatik geri getirmeyin.
