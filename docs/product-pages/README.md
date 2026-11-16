# Ürün sayfaları

Katalog, ana sayfa ve kampanya kartlarının başlıkları/görselleri mevcut `/urun/{slug}` adresine bağlanır. Türkçe ve İngilizce adresler aynı ürünü gösterir; İngilizce sürüm `/en/urun/{slug}` kullanır. GitHub Pages üzerinde hash adresleri korunur. Mevcut ürün slug değerleri değiştirilmez; veritabanı aktarımı gerekmez.

Ürün sayfasında kategori yolu, marka/kategori bağlantıları, ürün kodu ve mevcut ölçüler, gerçek ürün görselleri arasında seçim, teknik özellikler, teklif listesine ekleme ve bağlantı kopyalama vardır. Pano erişimi kapalıysa seçilebilir bağlantı alanı gösterilir. Teknik bilgiler ürün isteğiyle hazır geldiği için ikinci bir detay sorgusu gönderilmez. PDF dosyaları görsel galerisine alınmaz.

Fiyat ve stok teyidi teklif akışında kalır. Kampanya fiyatları için üyelik kontrolü korunur. Ziyaretçi ürün görüntüleme olayı mevcut izin kurallarına tabidir.

Doğrulama:

- `npm run build:complete`
- `node tests/seo/server.test.mjs`
- `node tests/i18n/core.test.mjs`
- `node tests/quote.test.js`
- Yerel PostgreSQL ile: `node tests/seo/browser.mjs`
- Yayından sonra salt okunur kontrol: `node scripts/security/product-pages-live-smoke.mjs`

Tarayıcı kontrolü ürün bağlantısı, doğrudan açma/yenileme, filtreli kataloğa geri dönüş, yeni sekme, fotoğrafsız kart, görsel galerisi, İngilizce adresler ve mobil taşma durumunu kapsar. Canlı kontroller hesap oluşturmaz, teklif göndermez ve analiz izni vermez; sepet değişiklikleri izole test tarayıcısında kalır. Katalogdaki her kayıt tek tek ziyaret edilmez; ortak sayfa/bağlantı akışı örnek ürünlerle doğrulanır.
