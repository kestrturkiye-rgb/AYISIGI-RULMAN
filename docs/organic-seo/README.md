# Organik arama görünürlüğü

Bu değişiklik reklam veya Google Tag Manager etiketi eklemez. Mevcut ürün adresleri, sitemap adresleri, üyelik, ziyaretçi analiz izinleri ve teklif akışı korunur. Veritabanı şeması veya ürün kayıtları değiştirilmez.

- Ürünlerin varsayılan başlık ve açıklamaları gerçek kod, bilinen marka, ürün adı/kategori ve mevcut ölçülerle hazırlanır. Admin'de girilmiş `metaTitle`/`metaDescription` veya eski `title`/`description` alanları önceliklidir.
- Aynı içerik üreticisi sunucuda ve tarayıcıda kullanılır. Google JavaScript çalıştırmadan ürün özetini, mevcut ölçüleri, kategori rehberini ve ilgili bağlantıları okuyabilir.
- 12 ürün grubu için Türkçe/İngilizce seçim ve teklif rehberleri eklendi. Kategori açıklaması mevcut admin verisinden alınır; genel seçim rehberleri `src/seo/category-guides.js` içindedir.
- Ürün–kategori–makale bağlantıları yalnızca public API'nin sunduğu yayındaki kayıtlar arasından oluşturulur. Üretici eşdeğerliği veya rastgele alternatif ürün iddiası eklenmez.
- Product ve BreadcrumbList JSON-LD mevcut bilgilerden oluşturulur. Bilinmeyen marka, fiyat, stok vaadi, değerlendirme puanı veya müşteri yorumu uydurulmaz. Fiyat içermeyen B2B ürünlerin Google ürün zengin sonuçlarına uygunluğu garanti edilmez.
- JSON-LD HTML içine güvenli serileştirilir; başka sayfaya geçildiğinde eski ürün verisi temizlenir. Paylaşım görselinde mevcut ürün görseli kullanılır.

Doğrulama:

```sh
npm run build:complete
node tests/seo/content.test.mjs
node tests/seo/server.test.mjs
node tests/i18n/core.test.mjs
node tests/quote.test.js
node tests/seo/browser.mjs
node scripts/security/organic-seo-live-smoke.mjs
```

Tarayıcı testleri yerel PostgreSQL test konteynerini kullanır. Canlı testler hesap açmaz, teklif göndermez, analiz izni vermez veya ücretli reklam başlatmaz. Sepet değişiklikleri izole test tarayıcısındadır. Ortak şablon ve örnek ürünler test edilir; katalogdaki tüm ürünler tek tek ziyaret edilmez.

Search Console'a kabul edilen sitemap URL'si korunmuştur. Sıralama ve indekslenme Google tarafından belirlenir; garanti verilmez. Sonraki değerlendirme Search Console'daki gösterim, sorgu, tıklama ve indeksleme raporları üzerinden yapılmalıdır.
