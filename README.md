# Rulman Teklif

React/Vite ile Türkçe ürün kataloğu, teknik arama ve teklif listesi. Node.js 22.12+ veya 24+ gerektirir.

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
- Ürün ailesi, alt kategori, marka ve kaynak filtresi; 24 ürünlük sayfalama.
- Detaylarda kaynak bağlantıları ve mevcut teknik tablolar. SKF'nin yalnızca dizinden alınan kayıtlarında eksik ölçüler açıkça gösterilir.
- Kalıcı teklif sepeti, miktar düzenleme, metin dosyası indirme ve WhatsApp ile teklif talebi. Ürün kodu, marka, adet ve isteğe bağlı müşteri bilgileri mesaj taslağına eklenir; kullanıcı WhatsApp’ta kontrol edip kendisi gönderir. Uzun listeler kesilmez; dosya indirip görüşmeye ekleme yolu gösterilir. Ödeme veya sunucuda teklif kaydı yoktur.

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
