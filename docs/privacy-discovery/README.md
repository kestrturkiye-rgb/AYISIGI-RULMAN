# Ana sayfa ürün seçkisi, gizlilik ve Google görünürlüğü

Durum: 14 Kasım 2026 tam yayını. Vercel uygulaması yayınlandı; GitHub Pages ve son doğrulamalar için `docs/full-release` kayıtlarına bakın. Mevcut ürünler yeniden aktarılmadı; analiz kapatılmadı ve eski kayıtlar silinmedi. Önceki güvenlik düzeltmeleri de bu çalışma ağacında korunur.

## Her açılışta karışık ürünler

Ana sayfa filtresiz açıldığında tüm yayındaki katalogdan 24 farklı ürün seçilir ve karıştırılır. Sayfanın yeniden yüklenmesinde yeni UUID seed üretilir. Seed yalnızca o sayfa açılışının belleğinde tutulur; çerez, ziyaretçi kimliği, localStorage veya görüntüleme geçmişi kullanılmaz. Aynı açılışta arka plandaki içerik yenilemeleri seçkiyi gereksiz yere zıplatmaz. Her seçkide aynı ürün ikinci kez görünmez; küçük kataloglarda ürünlerin başka ziyaretlerde tekrar görünmesi doğaldır.

Kategoriler, marka/ölçü araması ve tüm katalog sayfalaması mevcut sabit düzenini korur. Ana sayfa seçkisinden “Tüm ürünleri incele” ile tam kataloğa geçilir. Taslak, silinmiş veya markası/kategorisi gizli ürünler seçkiye giremez. Canlıda büyük katalog için 024 migrationıyla önceden hashlenmiş indeksten 24 kayıt seçilir; tüm katalog her istekte sıralanmaz. Veritabanı yalnızca 24 kartın görsel/özellik bilgisini oluşturur; bütün katalog tarayıcıya indirilmez.

`public.get_public_discovery(p_seed uuid,p_size int)` migration 023 ile eklenir. Yeni RPC henüz kurulmamışsa yalnızca `PGRST202/42883` için eski katalog sorgusuna güvenli dönüş yapılır; diğer hatalar yutulmaz. Eski API ile bu geçiş durumunda sıralı katalog görünür; karışık seçki için migration uygulanmalıdır. Admin Ayarlar → Arama → “Ana sayfada karışık ürün seçkisi” seçeneğiyle yönetilir; varsayılan açıktır.

## Ziyaretçi analizi korunur

Admin analitik modülü ve `analytics.enabled` ayarı kaldırılmadı. Migration analiz ayarını kapatmaz; eski kayıtları topluca silmez. Var olan 90 gün saklama kuralı korunur; eski bakım sorgusunun 5.000/gün limiti nedeniyle süresi geçmiş verilerin birikmesi önlenir. Süresi dolmamış kayıtlar korunur.

İzin veren ziyaretçi için sayfa, ürün görüntüleme, yaklaşık şehir/ülke, maskelenmiş IP ağı ve sekme oturumu raporlaması çalışır. Kullanıcı analizi reddeder veya rızasını kaldırırsa yeni ölçüm durur; geçmiş kayıtlar bu tercih işlemiyle silinmez. DNT/GPC izlememe sinyalleri korunur. Önceki bilgilendirme sürümünden kalan kararlar yeni bildirimin otomatik kabulü sayılmaz.

## KVKK, gizlilik ve çerez taslağı

Üç adres hazırlanmıştır: `#/kvkk`, `#/gizlilik`, `#/cerez-politikasi`. Footer'dan, üyelik ve teklif formlarından erişilir. Güvenlik oturumu/CSRF/PKCE, teklif listesi, rıza tercihi ve isteğe bağlı analiz depolaması ayrı açıklanır. Zorunlu dışı analiz kutusu önceden işaretli değildir. “Yalnızca zorunlu” ve “Tercihleri düzenle” seçenekleri ile sonradan geri çekme yolu bulunur. Yeni tercih ekranı ve yasal sayfa erişimi bu yayında uygulandı; hukuki kimlik bilgileri hâlâ tamamlanmalıdır.

Admin Site içeriği → Sayfalar bölümünde üç hukuki taslak kısayolu vardır; taslağı kaydetmek otomatik yayınlamaz. Mevcut aynı slug'lı sayfa varsa onu açar. Admin Ayarlar → KVKK ve gizlilik bilgileri bölümünde ticari unvan, tam başvuru adresi, başvuru e-postası, saklama ve aktarım açıklamaları girilir. Yayınlanmış özel bir metin varsa standart şablon yerine gösterilir.

**Tam ticari unvan ve başvuru adresi henüz kullanıcıdan gelmedi.** Marka adı hukuki unvanmış gibi yazılmadı; bilinmeyen alanlar uydurulmadı. Bu alanlar tamamlanmadan hazır metinler nihai ve eksiksiz KVKK uyumu olarak sunulmamalıdır. Supabase/Vercel/GitHub gibi altyapıların yurt dışı işleme/aktarım şartları ayrıca KVKK madde 9 kapsamında değerlendirilmelidir; çerez rızası tek başına yurt dışı aktarım mekanizması değildir.

Genel çerçeve: Her sitenin yalnızca zorunlu çerezler için “kabul et” penceresi sunması gerekmez; aydınlatma yükümlülüğü devam eder. Ayrıntılı IP/konum/oturum ve ürün izleme, zorunlu giriş/CSRF hizmetinden ayrı değerlendirilir. Mevcut analiz bu taslakta önceden ve ayrı verilen rızaya bağlı tutulur. Çerez kullanmamak tek başına kişisel veri işleme yükümlülüklerini kaldırmaz. Bu açıklama somut işletme/aktarım koşulları netleştirilmiş hukuki görüş değildir.

## Google'da görünürlük: üç ayrı konu

| Hizmet | Amaç |
|---|---|
| Google AdSense | Kendi sitenizde reklam yayınlayarak gelir elde etmek |
| Google Ads | Hedef aramalarda ve reklam alanlarında ücretli görünürlük almak |
| SEO | Reklamsız/organik arama görünürlüğünü iyileştirmek |

Hedef müşteri ve teklif kazanmaksa öncelik SEO ve ürün kodu/marka odaklı Google Ads olur. Reklam bütçesi organik sıralama satın almaz; hiçbir kurulum ilk sıra garantisi vermez.

Kod ve herkese açık site incelemesindeki ilk teknik öncelik: ürünler modal içinde açılıyor, normal katalog navigasyonu hash URL kullanıyor. Her ürünün paylaşılabilir, taranabilir kendi gerçek URL'si ve HTML içeriği yok. Ana sayfada rastgele ürünler göstermek bunu kendi başına çözmez.

Önerilen sıra:

1. Tek ana alan adı seçmek; mevcut adresleri ve canonical stratejisini düzenlemek. Canlı alan adı/DNS değişikliği yapılmadı.
2. Ürün, kategori ve makaleleri gerçek yollarla (`/urun/skf-6204-2rs` gibi) sunmak; sunucuda render veya build ön üretimiyle başlık/ürün bilgisini HTML'de bulundurmak. Eski `#/` bağlantılarını koruyarak kademeli yapılabilir; kataloğu baştan yazmak şart değildir.
3. Benzersiz title/description, canonical, taranabilir `<a href>` ürün bağlantıları, XML sitemap ve Search Console indekslenme kontrolleri eklemek. Ürün detay butonları tek başına ürün URL'sinin yerine geçmez. Domain root robots.txt isteği bu incelemede 404 verdi; robots.txt bulunmaması tek başına indekslenmeyi engellemez. Sitemap isteği 503 verdi; varlığı/içeriği doğrulanamadı.
4. Gerçek marka, SKU, ölçüler, teknik açıklamalar, görsel alt metinleri ve uygun yapılandırılmış veri kullanmak. Uydurma fiyat, stok veya değerlendirme puanı eklememek. Üyelik arkasındaki kampanya fiyatlarını SEO uğruna herkese açmamak. Teklif üzerine çalışan ürünler için alışveriş/rich result uygunluğu ayrıca değerlendirilir.
5. Mobil hız/erişilebilirliği, özgün teknik içerikleri, doğrulanmış Google İşletme Profili'ni ve gerçek müşteri referanslarını geliştirmek.
6. Google Ads'i ürün kodu/marka/ürün ailesi odaklı arama kampanyaları, uygun açılış sayfaları, negatif kelimeler ve rızaya uygun teklif/iletişim dönüşüm ölçümüyle başlatmak. Hedef bölge ve bütçe kampanya kurulumu öncesi belirlenir.

Bu turda Ads/AdSense veya Search Console hesabında işlem yapılmadı; SEO URL/SSR dönüşümü uygulanmadı. Bunlar yeni bir iş kapsamıdır.

### Kaynak erişimi sınırı

Google ve KVKK'nın resmî sayfalarını okumak denendi; `developers.google.com`, `support.google.com` ve `www.kvkk.gov.tr` ortamın izin verilen alan adlarında bulunmadığından ağ politikası 403 döndürdü. Güncel metinler canlı olarak doğrulanmış gibi sunulmaz. Başvuru kaynakları:

- Google SEO başlangıç rehberi: https://developers.google.com/search/docs/fundamentals/seo-starter-guide?hl=tr
- JavaScript SEO: https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- Taranabilir bağlantılar: https://developers.google.com/search/docs/crawling-indexing/links-crawlable
- Google AdSense/Ads farkı: https://support.google.com/adsense/answer/76231?hl=tr
- KVKK resmî rehber ve duyuruları: https://www.kvkk.gov.tr/

## Doğrulama

- 18 otomatik test: seçki çeşitliliği, kopya/yan etki olmaması, filtre/sayfalama sınırları, yetkisiz/veritabanı görünürlüğü, eski API uyumu, rıza/ret/GPC/DNT ve veri adaptörleri.
- 6 tarayıcı senaryosu: üretim build'i + gerçek yerel PostgreSQL + gerçek Edge/gateway; her açılışta farklı 24 ürün, sabit katalog sırası, analizin rıza sonrası gerçek veri kaydı, geri çekme, 390px hukuki sayfalar ve admin taslak kaydı.
- Üretim public/admin derlemeleri başarılı.

Komutlar: `npm run build:complete`, `npm run test:privacy`, `npm run test:supabase:read`, `npm run test:privacy:browser`. Yerel PostgreSQL `127.0.0.1:55432` ve browser için Chromium/Deno gerekir. Testler canlı DB'ye yazmaz.
