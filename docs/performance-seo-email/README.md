# Hız, Google ve üyelik e-postası

## Katalog hatası

Canlı anonim API'de `search_public_catalog` çağrısında `57014` zaman aşımı yakalandı. Önceki örneklerde yataklar kategorisi 3912 ms'de, `rulman` araması 5566 ms'de hata verdi. Bunlar bağlantı hatası olarak maskeleniyordu.

025: kategori/marka kapsamını bir kez hesaplayan filtreler, kapsayıcı sayfa indeksi.
026: özel şemada, RLS açık ve anonimden kapalı dar arama projeksiyonu; ürün, durum, ölçü, marka/kategori ve arama alias değişiklikleriyle güncellenir.
027: yayınlanmış ürün slug ve parçalı sitemap API'leri; Google ayarları boş varsayılanlarla eklenir.
028: geniş metin aramaları, bütün sonuçları saymadan önce 24 kayıt ve `hasMore` döndürür. Alt sınır toplamı kesin sayı gibi sunulmaz; kategori/marka/ölçü aramaları kesin sayısını korur. Eski RPC uyumluluk için vardır; eski tam sayım isteği çok geniş sorgularda hâlâ yavaş olabilir. Public site yeni sayfalama RPC'sini kullanır.

Aynı örneklerin yeni API ölçümünde `rulman` 415 ms, `a` 576 ms, yataklar 1483 ms ve tüm dokuz örnek HTTP 200 döndü. Bunlar tek ölçüm sonuçlarıdır, sürekli süre garantisi değildir.

İstemci aynı anonim okumaları birleştirir, 20 saniyelik sınırlı bellek önbelleği kullanır, geçici hatayı bir kez yeniden dener. Sürüm değişmediğinde sekme odağı ve dakikalık kontrol ürünleri boşaltmaz. Yönetici değişiklikleri Realtime/sürüm kontrolüyle yenilenir.

## SEO

Yeni domain üzerinde temiz kategori, makale ve `/urun/{slug}` adresleri desteklenir. Hash bağlantıları ve GitHub Pages korunur. Vercel sunucusu yayımlanmış içeriği ilk HTML'de verir; canonical, meta, Open Graph, 404/503 ve özel sayfalarda noindex/no-store uygulanır. İlk HTML'deki anonim site verisi istemcide tekrar indirilmez. HTML özel kullanıcı veya üyelere özel fiyat verisi içermez; public API sözleşmesini kullanır.

- `https://rulmanteklif.com/robots.txt`
- `https://rulmanteklif.com/sitemap.xml` — indeks
- `https://rulmanteklif.com/sitemap-pages.xml`
- `https://rulmanteklif.com/sitemap-products-1.xml` ve 5000 ürünlük diğer parçalar

Ürünlerde fiyat yoksa fiyat veya sahte yorum/puan üretilmez. Aramada yer veya zengin sonuç garantisi verilmez. Sitemap ve renderer veritabanı değişikliklerini kısa CDN önbelleğinden sonra yeniden deploy olmadan alır.

## Google hesapları — kullanıcı adımları

1. [Search Console](https://search.google.com/search-console/welcome) → Alan adı mülkü → `rulmanteklif.com`. Verilen `google-site-verification=...` TXT kaydını Cloudflare'a ekleyin; MX/SPF kayıtlarını değiştirmeyin. Doğrulamadan sonra `https://rulmanteklif.com/sitemap.xml` gönderilir. TXT değeri gizli parola değildir.
2. [Google Analytics](https://analytics.google.com/) → GA4 mülkü, saat dilimi Türkiye, para birimi TRY → web veri akışı `https://rulmanteklif.com`. `G-...` ölçüm kimliğini alın. Otomatik form etkileşimleri ve tarayıcı geçmişine dayalı ek sayfa görüntülemelerini kapatın; uygulama açık sayfa/dönüşüm olayları gönderir.
3. [Google Ads](https://ads.google.com/) → hesap kurulumu, şirket/billing bilgileri; başlangıçta kampanya yayınlamayın. Web sitesi dönüşümü için kategori “Teklif iste”, sayım “Bir” seçilir. `AW-...` ve dönüşüm etiketi alınır. GA4'ten aynı dönüşümü tekrar birincil hedef olarak içe aktarmayın.
4. Admin → Ayarlar → SEO: `analyticsId`, `adsId`, `adsLeadLabel`, gerekiyorsa `searchConsoleVerification` (yalnız kod kısmı). Eski `tagId` alanına rastgele script veya GTM kodu yapıştırmayın; bu sürüm GA4/Ads kimliklerini doğrular ve gtag ile yükler.

Kimlikler şu anda boş; gerçek Google hesabı ve kampanya oluşturulmuş sayılmaz. Kampanya bütçesi ve hedef bölgeler ayrıca belirlenmelidir; harcama başlatılmadı.

Site içi ziyaretçi analizi korunur. Google Analytics ve Ads ölçümü için ayrı, başlangıçta işaretsiz izinler vardır. Önceden verilmiş site içi analiz izni Google izni sayılmaz. Google kodu ilgili kimlik ve izin olmadan yüklenmez. DNT/GPC tüm isteğe bağlı ölçümü kapatır. Ads müşteri verisi ve reklam kişiselleştirmesi kapalıdır. Dönüşüm yalnız başarılı teklif yanıtında gönderilir; müşteri adı/e-posta/telefon veya serbest arama sorgusu aktarılmaz.

## Üyelik e-postası — bekleyen yapılandırma

Posta kutusunun hazır olduğu kullanıcı tarafından doğrulandı. Canlı Supabase'te özel SMTP henüz yapılandırılmamış, e-posta doğrulama açıktır. Natro'nun gerçek SMTP sunucusu/port/TLS bilgisi bekleniyor; sunucu adresi tahmin edilmez.

Supabase → proje `lptosaejlowasrbcyqnu` → Authentication → Emails/SMTP bölümünde sağlayıcı bilgileri girilebilir. Parola sohbetten veya istemci ayarından gönderilmez. Alternatif sunucu tarafı yardımcı: `scripts/security/configure-smtp.py`; kuru çalıştırma yalnız durum gösterir. `.env.example` gerekli `RT_SMTP_*` isimlerini listeler; değerler yalnız gizli sunucu ortamına girilir.

**Bu projenin Auth altyapısı başka bir CMS ile ortaktır. SMTP global göndericiyi etkiler.** Mevcut diğer uygulamaların URL'leri, kullanıcıları ve doğrulama ayarları korunmalı; ortak gönderici değişikliği uygulanmadan önce gözden geçirilmelidir. Yardımcı bu nedenle hedef proje ve paylaşılan Auth etkisinin açık doğrulamasını ister. Şu an SMTP uygulanmadı, test e-postası gönderilmedi ve gerçek gelen kutusu teslimi doğrulanmadı.

SMTP hazır olunca kullanıcının belirlediği alıcıyla doğrulama → giriş → parola kurtarma akışı sınanır. SPF kaydı çoğaltılmaz; Natro'nun verdiği DKIM/DMARC değerleri varsa sağlayıcının belgelenmiş değerleri kullanılır. E-posta doğrulama kapatılarak sorun gizlenmez.
