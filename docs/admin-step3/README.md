# Aşama 3 — ürün, kategori, marka ve medya yönetimi

Durum: kullanıcı yayın onayından sonra migration 008 ve 009 canlı Supabase projesine uygulandı, medya Edge Function ACTIVE olarak yayınlandı ve admin paketi mevcut Vercel projesine geçirildi. Ürün, kategori ve marka yönetimi bu sürümdedir. Faz 4 başlatılmadı.

Yönetim adresi: **https://rulman-teklif-admin.vercel.app/admin/#/giris**. Mevcut hesabınız ve şifreniz korunmuştur. Ayrıntılı sağlayıcı durumu ve paket özetleri `production-deployment.json` içindedir.

## Hazırlanan işlevler

- `#/urunler`: sunucuda arama, marka/kategori/yayın/stok/ölçü filtresi, dört sıralama seçeneği, 25 kayıtlık sayfalama, çöp kutusu.
- `#/urunler/yeni` ve `#/urunler/:id`: ekleme, düzenleme, çoğaltma, taslak/yayın, soft delete ve taslak olarak geri alma. Kaydetme sunucuda `lock_version` ile korunur; eski form yeni veriyi ezemez.
- SKU, otomatik veya elle slug, ad, marka, alt kategori, menşei, açıklamalar, öne çıkan/yeni, sıralama, d/D/B, stok durumu/adedi/eşiği, SEO, eşdeğer/OEM kodları.
- TipTap zengin metin editörü: kalın, italik, başlık, listeler, alıntı, güvenli HTTPS bağlantıları. Mevcut public rich-content JSON biçimi korunur.
- Serbest ad–değer–birim özellikleri, hazır rulman şablonu, kategoriye özel şablonlar. Alternatif ve varyantlar ayrı ürün kayıtlarına bağlanır.
- Çoklu görsel/PDF yükleme, sürükle-bırak ve klavye düğmeleriyle sıralama, ana görsel, alternatif metin, PDF açma. Varsayılan fiyat **teklif üzerine**. Fiyat tutarını yalnızca admin yönetir; editör mevcut gizli fiyatı okuyamaz/değiştiremez.
- Kişisel otomatik taslak Supabase'te kullanıcıya özel saklanır; eksik/hatalı form değerleri de geri yüklenebilir. Taslağı geri yükle/sil ve kaydedilmemiş değişiklik uyarısı.
- `#/kategoriler`: hiyerarşi, açıklama/görsel/SEO, şablon alanları, yayın, sıralama. Döngüler DB trigger'ıyla engellenir. Sürükle-bırak aynı üst kategoride çalışır; üst kategori formdan değiştirilir.
- `#/markalar`: logo/açıklama/yayın/sıralama. Bağlı aktif ürün/alt kategori varken silme reddedilir. Çöp kutusu ve geri alma.
- Admin/editör katalog yönetebilir; satış/anonim/rolsüz hesap API seviyesinde reddedilir. Mevcut satış ve dashboard yetkileri korunur.

## Veri ve yayın sınırı

GitHub Pages'teki büyük statik katalog bu adımda değiştirilmedi, yeniden içe aktarılmadı. Public siteyi Supabase verisine bağlama faz 7 kapsamındadır; mevcut sitedeki ürünlerin panelde görünmesi için hazırlanan tek seferlik katalog aktarımı ve public entegrasyonun ayrıca tamamlanması gerekir. Test verileri yalnızca ayrı yerel veritabanlarında oluşturulup silinir. Panel sahte katalog toplamı göstermez.

CSV/Excel, toplu işlemler, teklif yönetimi, müşteri modülü, site içerikleri ve genel medya kütüphanesi sonraki fazlardadır; menüde henüz açık değildir.

## Medya güvenliği ve sınırları

`rt-catalog-media` Deno Edge Function, her istekte Auth üzerinden JWT'yi ve DB'deki etkin admin/editör rolünü doğrular. Gateway `verify_jwt=false` ayarı kullanıcı kontrolünü kaldırmaz; doğrulama fonksiyonun içinde yapılır. Service-role anahtarı yalnızca Supabase'in sunucu ortamından okunur. İstemciye gitmez.

- Dosya başına 10 MiB, görselde 16 MP ve 10.000 px kenar sınırı. JPEG/PNG/WebP imzaları kontrol edilir; gerçek görsel ImageMagick WASM 0.0.35 ile açılır, yönü düzeltilir, oran korunarak en fazla 1600 px WebP'ye çevrilir ve metadata temizlenir.
- Orijinal dosya ve taslak türevi **media-originals** özel bucket'ında tutulur. Önizleme süreli imzalı URL kullanır. Üretilen yollar ve dosya metadata'sı istemci tarafından değiştirilemez.
- Kullanıcı yayınlamayı açıkça onayladığında işlenmiş kopya **media-published** bucket'ına alınır; kopyalama öncesi SHA-256 doğrulanır. Orijinal dosya daima özel kalır.
- Storage ve PostgreSQL tek bir transaction değildir: medya yayınlamadan sonra ürün kaydı çakışırsa, yayın onayı verilmiş medya herkese açık kalabilir; ürünün eski kaydı korunur. Yeniden deneme aynı dosyayı kullanır. Yayınlanmış URL taslağa alma/üründen kaldırma işlemiyle gizlenmez. Eski public URL'yi gizleme vaadi verilmez.
- PDF başlık/yapı kontrolü, aktif eylem/ekli dosya/obfuscated name/compressed object stream reddi, pdf-lib ile gerçek açılabilirlik ve 1–1000 sayfa sınırı. Şifreli dosyalar kabul edilmez. Bu işlem antivirüs taraması değildir. Bazı modern PDF'ler güvenlik için reddedilir; düzleştirip standart PDF olarak dışa aktarmak gerekir.
- Kullanıcı başına 20 medya isteği/dakika. SVG/HTML yüklenemez. Sunucu hata mesajları Türkçedir; decoder iç hata ayrıntıları gösterilmez.
- Taslaktan kaldırılan kullanılmayan dosyalar otomatik fiziksel silinmez; bu aşamada yanlışlıkla ortak kullanılan dosya silinmesi önlenir. Kullanım takibi/medya kütüphanesi sonraki fazdadır.

## Kurulum

Node 24+, Docker/PostgreSQL 17 ve mevcut repo gereklidir. `npm ci`, `npm run build:admin` ve `npm run admin:prepare-media` çalıştırın. WASM dosyası integrity ile kilitlenmiş npm paketinden Brotli (`magick.wasm.br`) biçiminde paketlenir; sunucuda açılır. Bu, Supabase’in 5 MB dağıtım sınırına uyar ve aynı ikiliyi kullanır; Git'e eklenmez. Deno 2.5.6 geliştirici bağımlılığıdır, sunucu fonksiyonunun kullandığı sürümler importlarda sabittir.

Admin ortam değişkenleri `.env.local` veya dağıtım ortamından verilebilir:

```dotenv
VITE_ADMIN_BASE=/admin/
VITE_SUPABASE_URL=https://lptosaejlowasrbcyqnu.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=SUPABASE_PUBLIC_KEY
VITE_PUBLIC_SITE_URL=https://kestrturkiye-rgb.github.io/AYISIGI-RULMAN/#/
```

Mevcut `project-config.json` yalnızca public proje adresi/anon anahtarı içerir. Service-role/PAT/şifre için hiçbir `VITE_` değişkeni kullanılmaz. Edge için `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` sağlayıcı tarafından sunucuda tanımlanır. CORS canlı admin, GitHub Pages ve yerel 4180 portuyla sınırlıdır.

## Onaydan sonra canlıya alma

1. Önce `npm run admin:prepare-media`, ardından `python scripts/admin-deploy-step3.py`: varsayılan **dry run**; uzak sisteme yazmaz.
2. Güvenli ortamda `SUPABASE_ACCESS_TOKEN` tanımlı olmalı. Migration 001–007 zaten uygulanmış hedefte yalnızca eksik 008/009 uygulanır; önceki migration hash'leri doğrulanır. 009, iş sürüm çakışmasını otomatik yeniden denenen SQL 40001 yerine doğrudan HTTP 409 (PT409) olarak döndürür. Önceki SQL dosyalarını SQL Editor'de yeniden çalıştırmayın.
3. Açık yayın onayından sonra:

```sh
python scripts/admin-deploy-step3.py --confirm-project lptosaejlowasrbcyqnu --apply-database --deploy-media
```

4. Sonuçta fonksiyonun ACTIVE olduğunu, özel görsel yüklemesini ve public yayın kopyasını gerçek admin oturumuyla doğrulayın. Başka CMS tablolarını/oturum ayarlarını değiştirmeyin.
5. Admin'i `/admin/` tabanıyla derleyip **yalnızca rulman-teklif-admin** Vercel projesine statik olarak yayınlayın. `deploy/admin-vercel/vercel.json` yönlendirmelerini koruyun. Kıvanç/industrial-cms projelerine ve GitHub Pages sitesine deploy yapılmaz.
6. Açılacak adresler: `https://rulman-teklif-admin.vercel.app/admin/#/urunler`, `#/kategoriler`, `#/markalar`.

SQL dosyaları: `supabase/migrations/202611130008_catalog_admin.sql`, `supabase/migrations/202611130009_catalog_conflict_response.sql`. RLS tüm yeni tabloda aktiftir; service-only RPC'ler anon/authenticated rollerine kapalıdır. Rollback için önceki admin frontend sürümü tekrar seçilebilir. Migration veri silmez; geri dönüşte yeni tabloları veya verileri DROP etmeyin.

## Nasıl test edilir

Yerel PostgreSQL'i `127.0.0.1:55432` üzerinde başlatın; harness bootstrap'ı yalnızca ayrı test DB'lerine uygulanır. `npm run test:admin`, `npm run test:admin:db`, `npm run test:admin:catalog`, `npm run test:admin:edge:types`. Testler canlı projeye bağlanmaz.

Tarayıcı için `dist` klasörünü localhost:4186 üzerinde sunun; `npm run admin:prepare-media` ve `npm run test:admin:catalog:browser` çalıştırın. Bu test gerçek PostgreSQL/RLS, gerçek Deno ve gerçek WASM/PDF parser kullanır; Auth/Storage HTTP servisleri loopback harness ile emüle edilir. Test bitince oluşturduğu DB silinir. Ayrıca `npm run test:admin:dashboard:browser` mevcut dashboard regresyonunu çalıştırır.

Gerçek yerel GoTrue testi `npm run dev:admin:local` + `npm run test:admin:browser` ile çalışır. Çakışan eski konteynerlere dokunmadan çalıştırmak için `ADMIN_LOCAL_CONTAINER`, `ADMIN_LOCAL_AUTH_CONTAINER`, `ADMIN_LOCAL_DATABASE`, `ADMIN_LOCAL_DIR` ve testte `ADMIN_LOCAL_ACCOUNTS` ayarlanabilir. Bunlar sadece yerel test isimleridir; kullanıcı şifresi ZIP'e veya repoya alınmaz.

Manuel kabul testi:

1. Ürün ekleyin; boş zorunlu alan/yanlış d-D ölçüsünü deneyin. Taslak kaydedin, liste filtrelerinden bulun.
2. Görsel ve teknik PDF ekleyin, ana görseli değiştirin, sıralayın; taslakta anonim erişimin kapalı olduğunu kontrol edin. Yayın onayından sonra sadece türev açılmalı.
3. Ürünü iki sekmede açın; ilkinde kaydedin, ikinci eski sürümle kaydetmeyi denesin. Güncel kayıt korunmalı.
4. Sayfayı düzenleyip ayrılın; uyarıyı ve dönüşte kişisel taslak geri yüklemeyi deneyin.
5. Çoğalt/sil/geri al: kopya ve geri alınan ürün taslak olmalı.
6. Alt kategori/marka/özellik şablonu ekleyin. Aynı üst kategoride sıralama, döngü ve bağlı kayıt silme reddini kontrol edin.
7. Satış hesabıyla katalog adresini doğrudan açın: erişim reddedilmeli.

Tam dosya içerikleri ZIP'tedir; `files.json` dosya yollarını ve SHA-256 özetlerini listeler. Ekran görüntülerinde yerel örnek ürünler vardır; canlı katalog olduğu iddia edilmez.


## Canlı yayın doğrulaması

Gerçek mevcut admin hesabıyla canlı Supabase üzerinde kategori/marka/ürün ekleme, Brotli WASM başlangıcı, WebP işleme, özel Storage yükleme, anonim taslak erişiminin reddi, açık yayın onayıyla public kopya, SHA-256 doğrulaması, ürün yayınlama, HTTP 409 sürüm çakışması, silme ve geri alma geçti. Yalnızca test için oluşturulan kayıt/dosyalar temizlendi; diğer oturumları kapatmadan test oturumu kapatıldı. Parola ve service key istemci paketine veya rapora alınmadı.

Vercel alanına ortamın ağ politikası CONNECT 403 verdiği için canlı HTML bu ortamdan doğrudan açılamadı. Aynı üretim paketi yerelde açılarak gerçek admin oturumu ve gerçek Supabase ile masaüstü/mobil sayfalar doğrulandı (`live-browser-results.json`). Vercel API’siyle READY ve canonical alias ataması ayrıca kontrol edildi. Kıvanç ve industrial-cms projelerinin production kimlikleri değişmedi.

Canlı veritabanında henüz aktarılmış ürün/kategori/marka yoktur; ilk ekranın boş olması beklenir. Bu sürüm mevcut statik katalog verisinin aktarımını veya public site entegrasyonunu tamamlamış gibi göstermez.
