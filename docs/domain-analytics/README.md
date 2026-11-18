# Ortak ziyaretçi raporu: domain ayrımı

Panel: https://rulmanteklif.com/admin/#/ziyaretciler (admin rolü gerekir).

Aynı ziyaretçi raporlama altyapısı on site adresinde kullanılır. Site / domain filtresi hem tabloyu hem sayaçları, ürün ve konum özetlerini seçilen siteye göre sınırlar. Geçmişi gör aynı site ve oturum ile sınırlandırılır. Site değiştirince oturum ve sayfa filtreleri sıfırlanır. Tarih aralığında kayıt geldikçe site seçenekleri oluşur.

Yeni kayıtların site bilgisi API sunucusunun izin verilen Origin/Host bağlamından üretilir; tarayıcının JSON içine yazdığı domain veya x-forwarded-host kullanılmaz. www adresleri kendi kök domaininde gruplanır; .com ve .com.tr ayrı gösterilir. Kaynak/referrer başka bir alan olarak kalır; ziyaret edilen site ile karıştırılmaz. Eski istemcilerden domain alanı olmadan gelen olaylar çalışmaya devam eder.

Eski kayıtlar NULL domain ile korunur ve Eski kayıt / site bilinmiyor filtresinde incelenebilir. Geçmiş domain bilgisi tahmin edilmez ve eski kayıtlar silinmez. Veritabanı şeması: 202611180033_domain_analytics.sql. Mevcut RLS, servisle sınırlı veri alımı, admin yetkisi, rıza, 120 olay/dakika IP-özeti limiti ve saklama temizliği korunur.

Bu rapor maskelenmiş IP ağı, yaklaşık konum, sayfa ve ürün görüntülemeleri içindir. Tam IP veya tüm buton tıklamaları toplanmaz. Site başına analiz izni geçerlidir; farklı domainlerdeki kişiler otomatik olarak eşleştirilmez.

## Doğrulama

- node tests/analytics/domain-gateway.test.mjs
- node tests/analytics/domain-db.test.mjs (yalnız yerel PostgreSQL)
- node tests/analytics/domain-admin.browser.mjs (yalnız yerel PostgreSQL ve Chromium, önce npm run build:complete)
- node tests/admin/workspace-db.test.mjs
- node tests/security/domain.test.mjs

Yerel tarayıcı kontrolünde filtreler, sayaçlar, oturum geçmişi, eski kayıtlar, sayfalama ve 320/390px mobil görünüm doğrulandı. Üretimde deneme hesabı veya izinli sahte ziyaret kaydı oluşturulmaz. Gizli sunucu anahtarları istemciye eklenmez.
