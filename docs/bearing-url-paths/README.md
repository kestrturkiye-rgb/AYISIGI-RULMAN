# Kod/rulman adresleri

Rulmanlar ürün grubundaki ürünlerin canonical adresi `/{slug}/rulman` biçimindedir. Örnekler: `/6001/rulman`, `/6001-2rs/rulman`, `/6001-2rs-rbe/rulman`. İngilizce sürüm `/en/{slug}/rulman` kullanır.

Diğer ürün gruplarının mevcut `/urun/{slug}` adresleri kullanılır. Ayrım gerçek kategori ağacından yapılır; sadece kodda rakam bulunmasına göre karar verilmez. Korunan uygulama yollarıyla çakışabilecek `en`, `admin`, `api`, `urunler`, `akademi` gibi slug değerleri de önceki ürün yolu altında kalır.

Önceki `/urun/{slug}` ve ilk uzun adresler doğru ürüne tek sunucu yönlendirmesiyle gider. Eski hash adresleri tarayıcıda güncellenir. Kodlar, slug eşlemeleri ve ürün kayıtları değişmez. 31 numaralı migration sadece sitemap RPC sonucuna zaten public olan `category_id` alanını ekler; ürün satırı veya yeni tablo oluşturmaz.

Ürün kartları, kampanyalar, canonical, hreflang, Product/BreadcrumbList verisi, paylaşım adresi ve sitemap aynı formatter'ı kullanır. Dil geçişleri fiziksel yolu korur. Kullanıcının seçtiği görünür yol: **Ürünler → kategori → tam model kodu**.

Doğrulama: `node tests/seo/content.test.mjs`, `node tests/seo/server.test.mjs`, `node tests/i18n/core.test.mjs`, `node tests/seo/browser.mjs`, `npm run build:complete`. Canlı kontrol: `node scripts/security/readable-product-urls-live-smoke.mjs` (hesap veya teklif kaydı oluşturmaz).
