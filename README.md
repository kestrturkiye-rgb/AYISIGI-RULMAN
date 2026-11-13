# Rulman Teklif

React/Vite ile Türkçe ürün kataloğu, teknik arama ve teklif listesi. Node.js 24+ gerektirir (teklif sunucusunda yerleşik SQLite kullanılır).

```sh
cd /workspace/AYISIGI-RULMAN
npm ci
npm run dev -- --port 5173
```

Üretim derlemesi: `npm run build`. Yerel derleme kontrolü: `npm run preview`. Her görev zaten izole bir ortamda çalışır; kullanıcı istemedikçe Git worktree oluşturmayın.

## Gerçek katalog verileri

1 Kasım 2026 tarihinde üç herkese açık kaynaktan alınan veriler birleştirildi. Aynı marka ve tam ürün kodu eşleşmeleri birleştirilirken kaynak bağlantıları korundu. Markası belirtilmeyen ürünler kaynaklar arasında otomatik eşleştirilmedi.

| Kaynak | Alınan kayıt | Kapsam |
| --- | ---: | --- |
| SKF Türkiye | 79.058 | Resmî Türkiye ürün sitemap'lerindeki ürün kodları ve kategori bağlantıları. Ayrıntılı teknik veri tabloları bu sitemap'lerde bulunmaz. |
| STS Rulman | 7.659 | Açık WooCommerce Store API'sinin 77 sayfasındaki tüm basit ürün kayıtları, ürün adları, teknik tabloları ve mevcut görselleri. |
| Rulman Toptancısı | 23.507 | Katalog/seri/kayış ağacındaki 3.543 sayfanın ürün ve ölçü tabloları; listelenmiş marka varyantları. |

Birleşik katalog **109.417 kayıt** içerir; bu güncellemede mevcut ürün kimlikleri ve katalog üyeliği korundu. **69.948 kayıtta** en az bir ölçü, **47.974 kayıtta** iç ve dış çap birlikte doğrulandı.

Tüm kayıtlarda görüntülenebilir bir görsel vardır; görsel türleri farklıdır:

- **83.780 kayıt:** ürün kaydına doğrudan ilişkilendirilmiş kaynak/üretici görseli.
- **22.825 kayıt:** kaynak kataloğun ilgili seri için kullandığı, “Katalog seri görseli” etiketli çizim/fotoğraf.
- **2.812 kayıt:** ürüne özel fotoğraf bulunamadığından açıkça “Temsili kategori görseli” olarak gösterilen kategori görseli. Ürün detayında bunun ürüne özel fotoğraf olmadığı belirtilir ve örnek görselin kaynak ürün bağlantısı verilir.

SKF'nin açık ürün aramasından 100 sayfada **79.116 SKU** alındı. 79.145 mevcut SKF kaydı üreticinin tam koduyla veya 104 doğrulanmış ayırıcı yazım eşleşmesiyle zenginleştirildi; bazı üretici kodları önceki katalogda farklı yazımlarla ayrı kayıtlar halinde bulunur. Kalan 260 eski SKF kodu, tam-kod servisiyle ayrıca kontrol edildi ve mevcut üretici yanıtlarında bulunamadı. Başka modele ait ölçüler bu kayıtlara atanmadı. 2.618 üretici görsel adresinin 2.615'i doğrulanarak indirildi; üç adres ve aynı varlıkların alternatif boyutları 404 verdi. Rulman Toptancısı'nın ek 41 ZKL seri görseli 4.427 kayda ilişkilendirildi.

Üretici ölçüleri aynı SKU için satıcı ölçülerinden önceliklidir; 13 farklı satıcı ölçüsü üreticinin değerleriyle düzeltildi. Mil çapı, omuz çapı, zincir hatvesi veya inç cinsinden bir değer, mm cinsinden delik/dış çap olarak kullanılmaz. Marka ve tam ürün kodu doğrulanmadan ölçü aktarılmaz. Kaynak sayıları ürünlerin farklı kaynaklarda bulunması ve kaynak içi tekrarlar nedeniyle doğrudan toplanmaz.

Tedarikçilerin fiyatları, stokları, telefonları, ödeme bağlantıları ve teslimat vaatleri uygulamaya aktarılmaz. Marka adları ürünleri tanımlamak içindir. Ürün görselleri kaynak ürün fotoğraflarıdır. Kaynak katalog sayfasının aynı seri için kullandığı görseller “Katalog seri görseli” olarak ayrıca etiketlenir. Fotoğraf veya seri görseli olmayan kayıtlarda “Temsili çizim” etiketli SVG/ikon gösterilir. Kaynak kayıtlarındaki iki çap tutarsızlığı ve URB 609 ZZ için farklı değerler gösteren iki kayıt raporlandı; çelişen ölçüler teknik arama indeksinden çıkarıldı ve ilgili detaylara uyarı eklendi.

## Arama ve teklif akışı

- Tam kod veya temel rulman kodu araması; kısmi kodlar teknik aramada eşleşmez. Boşluk, tire, Unicode tire ve tam genişlikli karakter yazımları normalize edilir. Marka önde/sonda yazılabilir (örneğin `SKF 6204-2RS`). Genel arama kutusuna yazıldığında eski kategori/marka/kaynak filtreleri sıfırlanır. Genel metin araması ürün kodu, ad, marka ve kategoriyi kapsar.
- İç çap, dış çap ve en için milimetre cinsinden tam sayısal eşleşme. Ondalık virgül/nokta desteklenir. Birden fazla alan doldurulduğunda tüm koşullar sağlanmalıdır. Bilinmeyen ölçüler eşleşmez; gövde merkezi, zincir hatvesi veya kayış çevresi rulman çapı/en değeri olarak kullanılmaz.
- Ürün ailesi, alt kategori ve marka filtresi; 24 ürünlük sayfalama.
- Detaylarda kaynak bağlantıları ve mevcut teknik tablolar. SKF'nin yalnızca dizinden alınan kayıtlarında eksik ölçüler açıkça gösterilir.
- Kalıcı teklif sepeti, miktar düzenleme, metin dosyası indirme ve WhatsApp ile teklif talebi. Ürün kodu, marka, adet ve isteğe bağlı müşteri bilgileri mesaj taslağına eklenir; kullanıcı WhatsApp’ta kontrol edip kendisi gönderir. Uzun listeler kesilmez; dosya indirip görüşmeye ekleme yolu gösterilir. Ayrıca sunucu kurulduğunda formdan kalıcı teklif kaydı, talep numarası, admin paneli ve info@rulmanteklif.com adresine SMTP bildirimi vardır. Ödeme bu sürümde yoktur.

## Veri dosyaları ve yeniden üretim

`public/catalog/index.json` katalog indeksidir; `index.json.gz` aynı verinin sıkıştırılmış kopyasıdır. Modern tarayıcılar sıkıştırılmış kopyayı yükler; desteklenmeyen ortamlarda düz JSON kullanılır. Teknik tablolar ürün detayı açıldığında `details-*.json` dosyalarından yüklenir. Fotoğraflar `public/catalog/images/` altındadır. `manifest.json` kaynak sayıları, kapsam, tarih ve çelişki raporunu içerir. Ana JavaScript paketine büyük katalog gömülmez.

Kaynak yanıtlarının önbelleği `/workspace/shared/catalog-cache` altındadır. Bunlar aktarım sırasında kullanılan ham kopyalardır; Git deposuna eklenmez. `scripts/fetch-sts.py`, `fetch-rt.py` ve `fetch-catalog-images.py` uygulanan salt okunur indirme adımlarını içerir. Bu yardımcılar mevcut dosyaları önbellekten kullanır. Veri kaynağı biçimi değişirse ayrıştırıcıyı güncelleyin ve sonuçları tekrar doğrulayın. SKF kaynakları: `https://www.skf.com/sitemap/productsitemap/products/sitemap_products_tr_0.xml` ve `_tr_1.xml`.

`beautifulsoup4` kurulu bir Python ortamıyla, saklanan kaynak yanıtlarından veri dosyalarını yeniden üretin:

```sh
python scripts/build-catalog.py --cache /workspace/shared/catalog-cache
node tests/catalog.test.js
node tests/technical-search.test.js
npm run build
```

Tüm dosyalar statik çalışır; üretim sunucusunun `/catalog/` dizinini sunması gerekir. GitHub Pages proje dizininde de katalog yolları Vite taban adresini kullanır.

## Üretici verileriyle zenginleştirme

`search.skf.com` ve `cdn.skfmediahub.skf.com` ağ izinleri bu ortamda doğrulandı. Veriler, kendi kategori filtreleri ve sayfalama parametreleri kullanılarak resmî açık arama servisinden alındı. Ürün olmayan kategori sayfaları SKU olarak eklenmedi; tıklama izleme alanları ve stok/fiyat alanları saklanmadı.

Tekrarlanabilir adımlar (fotoğraf indirme ve önceki satıcı önbelleklerini yenileme birbirinden ayrıdır):

```sh
python scripts/fetch-skf.py
python scripts/fetch-skf-missing.py
python scripts/fetch-skf-images.py
python scripts/supplement-rt-images.py
python scripts/enrich-skf.py --category-fallbacks
python tests/test_skf_data.py
node tests/catalog.test.js
node tests/technical-search.test.js
npm run build
```

`enrich-skf.py` mevcut indeks ve kimlikleri korur; eski katalog indirmelerini yeniden çalıştırmaz. Kategori görselleri, ürünün fotoğrafıymış gibi gösterilmez. Üreticinin resmi kodu, özgün satıcı kodundan farklı yazılıyorsa ürün detayında ayrıca görünür ve iki yazımla da aranabilir. Önbellekler `/workspace/shared/catalog-cache` altındadır. İlk güncellemeden önceki indeks `catalog-base-before-skf.json` adıyla burada korunur. Kaynak 404 adresleri `images/skf-image-report.json` içinde, bulunamayan kodlar `skf/products/exact-report.json` içinde raporlanır. İndirme ve zenginleştirme yardımcıları yeniden çalıştırılabilir; siteyi veya ortamı yayımlamaz.

## GitHub Pages yayını

`.github/workflows/pages.yml`, `main` dalına gönderilen değişiklikleri Node.js 24 ile kurar, test eder, `npm run build -- --base=/AYISIGI-RULMAN/` komutuyla derler ve yalnızca `dist` klasörünü GitHub Pages'e gönderir. İlk kurulumda deponun **Settings → Pages → Build and deployment → Source** seçeneği **GitHub Actions** olmalıdır. Bu ayar siteyi otomatik olarak etkinleştirmek için `GITHUB_TOKEN` ile değiştirilemez; yönetici erişimi veya depo sahibinin ayarı değiştirmesi gerekir. Depo görünürlüğünü değiştirmeyin.

Katalog JSON'u, sıkıştırılmış indeks, teknik bilgi parçaları ve görseller Vite'ın taban adresini kullanır; kök alan adı ve GitHub Pages proje dizini desteklenir. Yerel yayın kontrolü:

```sh
npm run build -- --base=/AYISIGI-RULMAN/
npm run preview -- --port 4173 --base=/AYISIGI-RULMAN/
```

Canlı adres ancak GitHub Actions dağıtımı başarılı olduktan ve dışarıdan HTTP/görsel/arama kontrolü yapıldıktan sonra doğrulanmış sayılmalıdır. GitHub API yönetimi ve canlı kontrol için `api.github.com` ve `kestrturkiye-rgb.github.io` erişimi gerekir.

## Firma ve iletişim

Hakkımızda metni ve iletişim bilgileri `https://rulmanteklif.com/` ana sayfasından 1 Kasım 2026 tarihinde doğrulandı: **0553 334 75 63**, **info@rulmanteklif.com**, İstanbul Dolapdere Sanayi Sitesi. Ortak bilgiler `src/company.js` içinde tutulur. Marka dizini mevcut katalogdan hesaplanır; marka kartları kataloğu filtreler. Teklif bağlantısı `wa.me/905533347563` adresini kullanır; hiçbir mesaj otomatik gönderilmez.

Teklif doğrulaması: `node tests/quote.test.js`.

## Ayrı sayfalar ve teklif sunucusu

Üst menüdeki ürün grupları, Hakkımızda, Markalar, İletişim, Teklif al ve Teknik arama kendi `#/...` adreslerinde açılır. Hash rotaları GitHub Pages üzerinde doğrudan açma, yenileme ve geri/ileri gezinmeyi destekler. Anasayfadaki teknik arama korunur.

Admin adresi `#/admin`; oturum sunucu tarafından doğrulanır. Teklif kaydı sunucudaki SQLite veritabanında tutulur, SMTP bildirim kuyruğu yeniden denemeleri korur. GitHub Pages API çalıştıramadığından orada form gönderimi kapalıdır; WhatsApp kullanılabilir. Sunucu ve SMTP hesabı bu çalışmada henüz sağlanmadı.

Kurulum dosyaları, kalıcı disk, HTTPS, şifre oluşturma ve SMTP adımları: [Sunucu kurulumu](docs/SUNUCU-KURULUMU.md). Hazırlanan sistemd ve Caddy dosyaları `deploy/` altındadır. Yapılandırma örneği `.env.example`; gerçek gizli değerleri depoya eklemeyin.

Testler: `npm run test:server` ve `node tests/quote.test.js`; katalog/teknik arama testleri de korunur. Testler gerçek e-posta göndermez.

## Ürün sunumu ve temizlenen görseller

Ürün kartı, detay ve görsel alanlarında kaynak adları/bağlantıları gösterilmez. Kaynak filtresi kaldırıldı. Temsili kategori/seri ayrımı yalnızca detay açıklaması ve erişilebilir alternatif metinde korunur; fotoğraf üzerinde arayüz etiketi gösterilmez.

Kataloğun **109.417 ürününün** kullandığı **5.325 görsel dosyasının** tamamı tarandı. **2.689 dosya** temiz sürümlerine eşlenir; bu eşlemeler **27.351 ürün kaydında** kullanılır. Diğer 2.636 dosya temiz üretici görseli olarak korunur. Önceki dört düzenleme korunmuştur; yeni toplu işlem kullanıcı onayıyla Python/OpenCV üzerinden yerel olarak yapıldı. Ürün kimlikleri, kodları, ölçüleri ve orijinal dosyalar değiştirilmedi.

Yeni çıktılar `public/catalog/clean-images`, önceki dört çıktı `public/catalog/edited-images` içindedir. Tüm görüntü alanları `src/product-image-map.json` eşlemesini kullanır. Kapsam ve SHA-256 doğrulaması [tam raporda](docs/product-image-cleanup-report.json), yöntem ve yeniden çalıştırma adımları [görsel temizliği rehberinde](docs/GORSEL-TEMIZLIGI.md) yer alır. `node tests/image-cleanup.test.js` tüm kayıtların tamamlandığını, orijinallerin korunduğunu ve çıktı dosyalarının varlığını kontrol eder.

## Supabase yönetim paneli — Faz 1

Supabase Postgres/Auth/Storage için şema, RLS, e-posta/şifre giriş ekranı ve bir kerelik katalog aktarım araçları hazırlandı. Ziyaretçi sitesi bu fazda statik katalogdan okumaya devam eder. Ürün ve içerik düzenleme ekranları sonraki onaylı fazlarda eklenecektir.

Kurulum, `.env.local`, ilk admin, migration, dry-run ve yerel test adımları: [Supabase Faz 1 kılavuzu](docs/SUPABASE-FAZ-1.md).

```sh
npm run test:supabase
npm run supabase:dry-run
```

Gerçek DB işlemleri yalnızca `--apply --confirm-project PROJECT_REF` ile yapılır. Public publishable/anon anahtar dışında hiçbir sunucu sırrı `VITE_` değişkenine konmaz; build öncesi kontrol buna karşı koruma sağlar. Gerçek bir Supabase projesi olmadan canlı Auth/Storage testi yapılmış sayılmaz.

## Supabase ziyaretçi verisi — Faz 2

Mevcut statik mod varsayılan olarak korunur. `VITE_DATA_SOURCE=supabase` açıkça seçildiğinde katalog, sayfalar, makaleler ve temel site ayarları public okuma API'sinden gelir. Ürün araması sunucuda sayfalanır; sepet ürünleri ayrı yüklenir. Veritabanı değişiklikleri Realtime, periyodik kontrol ve pencereye dönüşte yenilenir. Bağlantı hataları yeniden deneme ekranı gösterir.

Kurulum, migration 004, iki veri modunun testi ve sınırlar: [Supabase Faz 2 kılavuzu](docs/SUPABASE-FAZ-2.md). Gerçek Supabase projesi ve canlı doğrulama henüz yoktur; admin düzenleme ekranları sonraki fazlardadır.

## 9 Kasım 2026 ürün ve kategori genişletmesi

Mevcut katalog korunarak 2.535 ürün/varyant ayrı ek katalog dosyasına alındı. Toplam 111.952 ürüne, beş yeni ürün grubunun ayrı sayfalarına ve ek alt kategorilerine erişilebilir. RT referansları satıcı/üretici kodu bilinmeyen fakat ürün tanımı doğrulanabilen kayıtlarda kullanılır. Yeni ürün fotoğrafları görsel sunucularına erişim sağlanana kadar eklenmedi; kartlarda başka ürünlerin resmi kullanılmaz.

Kimlik kontrolleri, kapsam, yeniden üretme ve test adımları: [Katalog genişletme notları](docs/catalog-expansion/README.md).

### Ayrı admin uygulaması — 1. adım

React + TypeScript + Tailwind + HashRouter admin uygulaması `apps/admin/` altındadır. Yerel gerçek Auth testi: `npm run dev:admin:local`; test hesapları yalnızca `/tmp/rt-admin-local-test/accounts.json` dosyasında üretilir. Normal geliştirme: `npm run dev:admin`. İki uygulamayı birlikte derleme: `npm run build:pages -- --base=/AYISIGI-RULMAN/`. Mevcut `#/admin` yeni admin uygulamasına yönlenir. Ayrıntılı kurulum, test ve sınırlar: [Admin 1. adım](docs/admin-step1/README.md). Henüz dashboard/CRUD yoktur; bu aşama giriş ve şema altyapısıdır.

### Admin 2. aşama

Panel düzeni ve rol bazlı dashboard hazırdır. SQL migration 007 yeni okuma RPC'sini ekler. Testler: npm run test:admin, npm run test:admin:db ve npm run test:admin:dashboard:browser. Tam kapsam ve yayın onayı durumu docs/admin-step2/README.md içindedir.

### Admin — aşama 3

Ürün/kategori/marka yönetimi, çoklu görsel ve PDF yükleme, kişisel taslak, sürüm çakışması ve soft delete hazırlandı. Ayrıntılı kurulum, güvenlik sınırları, testler ve **onay sonrası** yayın adımları: [docs/admin-step3/README.md](docs/admin-step3/README.md). Kullanıcı yayın onayıyla bu aşama [mevcut yönetim adresinde](https://rulman-teklif-admin.vercel.app/admin/#/giris) yayınlandı. Büyük statik kataloğun aktarımı ve public entegrasyon sonraki çalışmadır.
