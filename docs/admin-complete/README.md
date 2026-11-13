# Tam yönetim paneli ve üyelik

Panel: https://rulman-teklif-admin.vercel.app/admin/#/giris

Alternatif aynı sürüm: https://kestrturkiye-rgb.github.io/AYISIGI-RULMAN/admin/#/giris

## Kullanım

- **Ürünler**: mevcut 111.952 ürün dahil arama, filtre, düzenleme, çoğaltma, taslak/yayın, çöp kutusu/geri alma, görseller ve PDF. Seçim kutuları toplu durum/kategori/silme işlemlerini açar.
- **CSV / Excel içe aktar**: en fazla 5.000 satır / 10 MB; önizleme ve hatalar gösterilir. Güncellemede dışa aktarılan `id` ve `lock_version` korunmalı; boş hücreler mevcut alanı silmez. Başarılı 200 satırlık partiler saklanır; sonraki parti hata verirse başarılı satırları tekrar eklemeyin. CSV/XLSX dışa aktarımı seçili ürünleri veya mevcut sayfayı kapsar.
- **Site içeriği**: sayfalar, makaleler, ana sayfa bölümleri, menü/footer ve arayüz metinleri. Yayınlanan değişiklikler Realtime veya 60 saniyelik yenilemeyle görünür; yeni deploy gerekmez. Varsayılan sayfa gövdeleri yapılandırılmış form, yeni sayfalar zengin metin kullanır.
- **Kampanyalı ürünler**: mevcut katalogdan ürün seçin; üye fiyatını, para birimini, tarihleri ve yayın durumunu kaydedin. Kamuya açık API fiyatı döndürmez; aktif üyelik ve geçerli Supabase oturumu gerekir. Kampanyaya otomatik ürün eklenmez.
- **Kullanıcılar ve aktivite**: personel hesapları (admin/editör/satış), müşteri üyelikleri, erişimi aç/kapat ve değişiklik geçmişi. Yeni personel e-posta ve belirlenen ilk parolayla giriş yapar. Müşteri hesabı yönetim yetkisi vermez.
- **Teklif talepleri**: durum, ürün/adet/fiyat/iskonto/vergi, iç notlar, yazdır/PDF, CSV ve müşteriye WhatsApp/e-posta yanıt bağlantıları. Mesajı kullanıcı gönderir. Müşteriler talep geçmişinden oluşur ve ayrıca düzenlenebilir.
- **Medya**: yükleme, yayınlama, kullanıldığı yerler ve silme koruması. Eski 4.716 görsel orijinal GitHub konumunda korunur; referanslı dosyalar silinmez.
- **Ziyaretçi analitiği**: yalnızca izin verilen yeni ziyaretler; yaklaşık ülke/şehir, maskelenmiş ağ, sayfa ve ürün görüntüleme, oturum zaman çizelgesi. Tam IP kaydedilmez; 90 gün saklama, günlük temizlik; DNT/GPC ve izin kaldırma desteklenir. Şehir kesin adres değildir, sağlayıcı veri vermezse bilinmiyor gösterilir. Geçmiş ziyaretler geriye dönük üretilemez.

## Kurulum

Node.js 24+, `npm ci`, `.env.example` içindeki public Supabase değişkenleri ve `npm run build:complete` (Vercel) / `VITE_DATA_SOURCE=supabase npm run build:pages -- --base=/AYISIGI-RULMAN/` (Pages).

`apps/admin/src/project-config.json` yalnızca public proje adresi ve publishable anahtar içerir. Service role ve yönetim tokenları istemciye verilmez. `supabase/migrations/*.sql` sıralı ve değişmez uygulanır. Proje paylaşıldığı için başka uygulamaların tabloları ve Auth site_url ayarı değiştirilmez.

Aktarım: `node scripts/admin-catalog-plan.mjs`, ardından güvenilir sunucu ortamında `python scripts/admin-complete-release.py --confirm-project PROJECT_REF --migrate --import-catalog`. Aktarım tekrarlanabilir, var olan yönetici düzenlemelerini ezmez. Bu projede aktarım tamamlandı; tekrar çalıştırmak gerekmez. 017 migration ilk arama indeksini oluşturur; uzun süren sağlayıcı yanıtı zaman aşımında tekrar uygulamadan önce migration journal kontrol edilmelidir.

Gateway: `RT_GATEWAY_HMAC_SECRET`, `RT_OPS_URL`, `CRON_SECRET` sadece Vercel sunucu ortamında; eşleşen HMAC sırrı Supabase Edge secrets içinde. `rt-admin-operations` yönetici JWT+rolünü sunucuda doğrular; teklif/analiz/temizlik yalnızca imzalı sunucu çağrısı kabul eder. Yeni talepte honeypot, boyut/adet sınırları, atomik kayıt, idempotency ve veritabanı hız sınırı vardır.

**E-posta kurulumu gerekir:** mevcut ortak Supabase Auth projesinde özel SMTP yok; halka açık kendi kendine kayıt/doğrulama ve parola yenileme e-postaları için Supabase SMTP sağlayıcısı yapılandırılmalı. Ortak Auth'ta e-posta doğrulaması kapatılmadı. Panelden doğrulanmış müşteri hesabı oluşturma gerçek Auth üzerinde test edildi. Teklif bildirimleri için ayrıca Edge secrets `RT_RESEND_API_KEY` ve `RT_NOTIFY_FROM` tanımlanmalı, ardından panel Ayarlar'dan açılmalı; tanımsızken gönderilmiş gibi gösterilmez. Talepler bildirimden bağımsız kaydolur.

## Testler

Yerel PostgreSQL: 127.0.0.1:55432, yalnızca izole geçici test veritabanları.

```sh
npm run test:workspace
node --test tests/admin/spreadsheets.test.mjs
npm run test:admin:db
npm run test:admin:catalog
npm run test:supabase:db
npm run test:supabase:read
npm run build:complete
python -m http.server 4186 --bind 127.0.0.1 --directory dist
node tests/admin/workspace.browser.mjs
```

Tarayıcı testi gerçek PostgreSQL ve Deno kullanır, yerel Auth/Storage emülasyonu açıkça ayrıdır. `live-backend-results.json` gerçek Supabase Auth/Edge/Postgres kontrollerini, `browser-results.json` yerel uçtan uca sonuçlarını içerir. Test hesapları ve kampanyaları temizlenir; gerçek ürünler silinmez/değiştirilmez. Üretim dağıtım kimliği ve önceki geri dönüş sürümü `production-deployment.json` dosyasındadır.
