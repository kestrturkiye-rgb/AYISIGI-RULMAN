# Admin 2. aşama: panel düzeni ve dashboard

13 Kasım 2026. Bu aşama tamamlandı; production frontend değiştirilmedi. Vercel önizlemesi, önceki herhangi bir şey yayınlama talimatı nedeniyle otomatik onay denetiminde durduruldu. Yayın onayı bekleniyor. Ürün CRUD aşamasına geçilmedi.

## Tamamlananlar

Daraltma tercihi korunan masaüstü sol menüsü, mobil dialog menüsü, üst bar, hesap ve bildirim panelleri eklendi. Tema mevcut yeşil, logo ve Noto Sans ile uyumlu. Sadece kontrol paneli aktif; sonraki modüller role göre görünür ve Yakında olarak devre dışıdır. Bilinmeyen rotalar 404 ekranı gösterir.

Dashboard verileri gerçek Supabase get_admin_dashboard RPC'sinden gelir. Toplam/yayındaki/taslak ürün, bugünkü/haftalık talepler, bekleyenler, durum dağılımı, en çok istenen ürünler ve stok eşikleri bulunur. Her liste en fazla beş satırdır. Arama ekrandaki kayıtları süzer. Gün ve pazartesi başlangıçlı hafta sınırları Europe/Istanbul ile sunucuda hesaplanır. Gelecek tarihli talepler hariçtir. Katalog/stok tüm güncel kayıtları, talep listeleri seçili aralığı kapsar.

Public sitedeki statik katalog bu metriklere kopyalanmaz. Rulman veritabanı tabloları şu an boş; gerçek sıfırlar ve açıklayıcı boş durumlar görünür. Bilinmeyen stok düşük stok sayılmaz. Yayında sayısı kategori/marka görünürlüğünü ve soft delete durumunu dikkate alır.

Admin tüm özetlere erişir. Editör ticari veri alamaz. Satış, katalog yönetim sayıları veya yayında olmayan stok verisi alamaz. Bunlar SQL sınırında doğrulanır; Auth metadata rol kaynağı değildir. Anonim/yetkisiz/etkin olmayan hesap RPC'yi çağıramaz. Yanıtta fiyat, müşteri e-postası/telefonu ve dahili not yoktur.

Hata, yükleniyor ve boş durumlar ayrıdır. Hatalı yanıtta sahte sıfır gösterilmez. Zod doğrulaması vardır. Eski tarih/rol yanıtları güncel ekranı ezemez. Arka plan Auth kontrolü ekran durumunu gereksiz yere sökmez; yetki doğrulama hatasında erişim kapanır. Yeni talepler düğmesi okunmamış bildirimi değil toplam yeni talepleri gösterir; bildirim gönderme/kaydetme bu aşamada yoktur.

## SQL ve canlı veri

Yalnız 202611130007_dashboard.sql hash günlüğüyle seçilen kivancgroup-deneme projesine uygulandı. Eski altı migration yeniden uygulanmadı; mevcut CMS verileri değiştirilmedi. Yeni SECURITY DEFINER okuma fonksiyonu boş search_path, her çağrıda DB rolü kontrolü ve dar EXECUTE izni kullanır. Yeni teklif tarih indeksi eklenir. Temel RLS politikaları korunur. Test kayıtları canlıya yazılmadı.

migration-result.json SQL hash kaydıdır. live-read-result.json gerçek Auth hesabı ve gerçek RPC kontrolünü kaydeder. Test oturumu local kapsamla kapatıldı. Görsel real-dashboard dosyaları gerçek sıfır verilerle; fixtures klasörü ise açıkça test verisidir.

## Test etme

Node 24 ve bağımlılıklar hazırken kökten npm run test:admin çalıştırın. Yerel 55432 PostgreSQL ile npm run test:admin:db, geçici DB oluşturup siler. Bulut DB üzerinde çalışmaz. Supabase bootstrap SQL'i yalnız yerel harness içindir.

Admin derlemesi: VITE_ADMIN_BASE=/admin/ ve VITE_PUBLIC_SITE_URL=https://kestrturkiye-rgb.github.io/AYISIGI-RULMAN/#/ ortamıyla npm run build:admin. Ayrı terminalde python -m http.server 4186 --bind 127.0.0.1 --directory dist; sonra npm run test:admin:dashboard:browser. Bu tarayıcı testi canlı müşteri verisi kullanmaz, HTTP fixture kullanır. Gerçek Auth/RPC ayrıca doğrulandı.

Kontrol panelinde tarih aralığı, yenileme, kayıt arama, profil, bildirim ve mobil menü denenebilir. Menü Escape ile kapanır; klavye odağı modal içinde kalır. Henüz olmayan modüller tıklanamaz.

## Kanıt ve sınır

10 birim/sözleşme, 24 yerel PostgreSQL, 19 mevcut Auth/public okuma testi geçti: 53 benzersiz otomatik test. Dashboard tarayıcı testinde beş genişlik, beş WCAG taraması ve sekiz davranış kontrolü; mevcut Auth hata/davet fixture akışı da geçti. TypeScript üretim derlemesi başarılı.

Tam dosyalar ve hash listesi files.json içinde. Paket parola veya gizli servis anahtarı içermez. Production frontend ve GitHub Pages değişmedi; Vercel önizleme dağıtımı otomatik onayda reddedildi ve oluşturulmadı. Önce dashboard yayını, ardından 3. aşama için onay beklenir. Ürün CRUD, CSV/Excel, teklif mutasyonları ve kullanıcı/ayar yönetimi uygulanmış sayılmaz.

## Onaylanan canlı yayın

Kullanıcının açık yayın onayıyla 2. aşama production olarak yayınlandı. Vercel READY ve ana alan adının yeni deployment kimliğine bağlı olduğu doğrulandı. Adres: https://rulman-teklif-admin.vercel.app/admin/#/ . Önceki production kimliği geri dönüş için production-deployment.json içinde korunur. Canlı adres bu ortamın ağ politikasında engelli; aynı paketle gerçek Auth/RPC testi geçti. 3. aşamaya geçilmedi.
