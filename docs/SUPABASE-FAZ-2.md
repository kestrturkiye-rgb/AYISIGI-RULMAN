# Supabase — Faz 2: ziyaretçi verisinin bağlanması

Bu faz, mevcut hash rotalarını ve statik çalışma seçeneğini korur. Supabase projesi henüz oluşturulmadı. Dosyalar yerelde hazırdır; canlı veritabanına migration, gerçek Storage yüklemesi veya deploy yapılmadı. Ürün düzenleme ekranları Faz 3 kapsamındadır.

## Veri kaynağı

`.env.local` içinde varsayılan `VITE_DATA_SOURCE=static` mevcut JSON kataloğunu kullanır. Auth yapılandırması tek başına ziyaretçi veri kaynağını değiştirmez.

Gerçek proje hazır olduğunda Faz 1 kurulumunu ve tek seferlik aktarımı tamamlayın. Migration çalıştırıcısı `202611020004_public_read.sql` dosyasını da uygular. Daha önce ilk üç migration uygulanmışsa aynı migration komutu yalnızca yeni dosyayı uygular; tamamlanmış aktarımı yeniden başlatmayın.

```dotenv
VITE_DATA_SOURCE=supabase
VITE_SUPABASE_URL=https://PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=PUBLIC_PUBLISHABLE_KEY
```

URL ve public anahtar birlikte zorunludur. Service-role anahtarını hiçbir `VITE_` değişkenine koymayın. Başlangıçta veri kaynağını etkinleştirmek için bir build/deploy gerekir. Sonraki yayımlanmış içerik değişiklikleri için yeniden deploy gerekmez.

GitHub Pages workflow'u aynı adlı repository variables değerlerini okur; `VITE_DATA_SOURCE` boşsa `static` kullanır. Yönetici rotası mevcut yönlendirme yapısında `#/admin` olarak korunur. Bu aşamada panel yalnızca önceki fazın giriş/yetki ekranını sunar.

## Okuma davranışı

- Katalog Supabase modunda tüm JSON dosyasını indirmez. Ürünleri 24 kayıtlık sayfalarla sunucudan ister; kategori, marka, metin ve kod/ölçü koşulları sunucuda uygulanır. Sayfa `sayfa` URL parametresinde tutulur; filtre değişince sıfırlanır.
- Kategori ağacı, markalar ve sayıları, sayfalar, ana sayfanın mevcut bölüm içerikleri/sırası/görünürlüğü, menüler, makaleler ve genel ayarlar public okuma katmanından gelir. Teknik bilgiler ve makale metni gerektiğinde yüklenir.
- İletişim, WhatsApp, logo/favicon, ana renk/yazı tipi, duyuru ve bakım modu veritabanındaki ayarlara bağlandı. Zengin içerik React düğümleriyle işlenir; ham HTML çalıştırılmaz.
- Public okumalar admin oturumunu paylaşmayan ayrı, anonim bir SDK istemcisi kullanır. SQL fonksiyonları bir personel JWT'siyle çağrılsa bile yalnızca yayımlanmış, silinmemiş ve üst kategori/markası görünür kayıtları döndürür. Kaynak metadata ve gizli fiyatlar dönmez.
- Realtime yalnızca `content_version` değişimini dinler. Bağlantı kesintilerine karşı 60 saniyelik yenileme ve pencereye geri dönünce kontrol vardır. Mevcut sorgu yeniden çalıştırılır; gecikmiş önceki arama yanıtları yeni sonuçları ezmez.
- Supabase bağlantısı başarısız olursa eski JSON verisine sessiz geçilmez. Hata ve yeniden deneme sunulur.
- Sepet kimlikleri tarayıcıda kalır; ürün bilgisi görünür sayfadan bağımsız yüklenir. Şu anda yayımlanmayan ürünlerin kayıtları diğer ürün ekleme işlemlerinde silinmez. Eski sayısal sepet kayıtları için marka/kod eşlemesi korunur. Bozuk kayıtlar ve aşırı adetler temizlenir.

## Yerel doğrulama

Gerçek PostgreSQL 17 test sunucusu yalnızca localhost üzerinde çalışır. Faz 1 kılavuzundaki geçici PostgreSQL kurulumu kullanılabilir.

```sh
npm run test:supabase
npm run test:supabase:read
npm run test:supabase:db
npm run test:site
npm run build -- --base=/AYISIGI-RULMAN/
npm run preview -- --port 4173 --strictPort --base=/AYISIGI-RULMAN/
# Ayrı terminal:
npm run test:browser
```

Supabase tarayıcı testi gerçek projeye bağlanmaz; SDK'nın REST yanıtlarını Playwright ile taklit eder:

```sh
VITE_STATIC_HOST=true VITE_DATA_SOURCE=supabase \
VITE_SUPABASE_URL=https://phase2-local-test.supabase.co \
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_phase2_local_test_only \
npm run build -- --base=/AYISIGI-RULMAN/ --outDir=/tmp/rt-phase2-preview
npm run preview -- --port 4177 --strictPort --base=/AYISIGI-RULMAN/ --outDir=/tmp/rt-phase2-preview
# Ayrı terminal:
node tests/supabase-read.browser.mjs
AUTH_TEST_URL=http://127.0.0.1:4177/AYISIGI-RULMAN/ \
AUTH_TEST_PROJECT=https://phase2-local-test.supabase.co \
node tests/supabase-auth.browser.mjs
```

Test anahtarları yalnızca sahte yanıt senaryosu içindir. Şema/RLS ve tam aktarım gerçek yerel PostgreSQL üzerinde; Auth, Storage HTTP ve ziyaretçi HTTP akışları taklit sağlayıcı yanıtlarıyla sınanır. Gerçek Supabase PostgREST, Auth e-posta, Storage ve Realtime teslimatı proje oluşturulduktan sonra ayrıca doğrulanmalıdır.

## Faz sınırı

Faz 3 ürün/kategori/marka düzenleme ve yükleme ekranlarını; Faz 4 toplu işlemleri; Faz 5 gerçek teklif kaydı ve bildirimleri; Faz 6 ayrıntılı içerik/ayar editörlerini; Faz 7 dashboard, geçmiş ve kullanıcı yönetimini ekleyecek. Henüz kullanılmayan slider/istatistik gibi yeni içerik türlerinin ekranları ve tüm arayüz etiketlerinin editör eşlemeleri içerik fazında tamamlanacak. SEO metaverisi SPA içinde yenilenir; statik robots/sitemap dosyalarının yönetimi ve sosyal botlara sunucu taraflı önizleme bu fazda eklenmez.

Faz 2 sonunda kullanıcı onayı alınmadan Faz 3'e geçilmez.

## Tamamlanan yerel test sonucu

99 ayrı otomatik test geçti: önceki 52 regresyon, 11 Auth/yapılandırma, 22 PostgreSQL güvenlik/okuma, altı tam aktarım/kurtarma ve sekiz veri adaptörü/sepet testi. Tam aktarımda 109.417 kimlik ve 342.504 teknik özellik korundu; 20/47 mm araması 331 sonuç verdi. Türkçe I/İ eşleşmesi ayrıca PostgreSQL üzerinde doğrulandı.

Son derlemede statik sitenin beş ekran genişliği ve 20 erişilebilirlik taraması geçti; JavaScript hatası veya başarısız site varlığı bulunmadı. Supabase HTTP taklit testinde sayfalama, bağımsız sepet yükleme, yayımlanmayan kayıtları koruma/kullanıcı isteğiyle kaldırma, hata/yeniden deneme, gecikmiş yanıtlar, ayrı sayfalar ve yeniden build olmadan içerik yenileme doğrulandı. Bu testte statik katalog isteği yapılmadı ve erişilebilirlik ihlali bulunmadı. Auth tarayıcı regresyonu da geçti.

Özet: [Faz 2 sonuç raporu](SUPABASE-FAZ-2-SONUC.json). Bu sonuçlar gerçek Supabase projesinin kurulmuş veya canlı sitenin değiştirilmiş olduğunu ifade etmez.
