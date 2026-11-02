# Site denetimi ve optimizasyon

Bu çalışma arayüz, katalog erişimi, ürün kodu/ölçü araması, gezinme, sepet, teklif formu, teknik detaylar, makaleler ve mevcut sunucu testlerini kapsar. “Bütün cihazlarda %100 hatasızlık” garantisi vermez. Ölçüm sonuçları aynı makinede yerel üretim derlemesi ve Chromium ile alınır; canlı ağ gecikmesini veya gerçek kullanıcı Core Web Vitals verisini temsil etmez.

## Düzeltilen davranışlar

- Site kabuğu, iletişim, hakkımızda ve makaleler katalogdan bağımsız açılır. 109.417 ürünün indirilmesi ve hazırlanması ayrı Web Worker içinde yapılır. Marka ve kategori sayaçları arka planda hesaplanır. Worker kullanılamazsa ana iş parçacığına geri dönüş, yükleme hatasında yeniden deneme vardır. Arka plan işleminden sonra da aynı ürün kimlikleri ve ölçüleri kullanılır.
- Görsel eşlemeleri ve katalog çözümleyicisi başlangıç paketinden ayrıldı; yönetim ekranı ayrıca yüklenir. Tarayıcı modelinden görünmeyen kaynak adresleri çıkarılır; kaynak verisi sunucu ve bütünlük kontrollerinde korunur.
- Arama yalnızca gönderildiğinde uygulanır; yazarken bütün katalog tekrar taranmaz. Kod, üretici kodu, boşluk/tire farkları ve tüm verilen ölçülerin birlikte eşleşmesi korunur. Sorgu normalizasyonu ürün başına tekrarlanmaz.
- Marka, kategori ve teknik arama filtreleri URL ile senkron çalışır. Yenileme filtreleri korur; teknik aramayı temizlemek marka tercihini silmez. Geçersiz ölçü içeren adres tüm ürünleri sessizce göstermez; hata bildirir. Bilinmeyen ürün grupları bulunamadı ekranına gider.
- Sepet bozuk, tekrar eden veya geçersiz kayıtları ayıklar; kapatılmış/depolama kotası dolmuş localStorage sayfayı bozmaz. Kayıt yapılamıyorsa sepetin oturumla sınırlı olduğu gösterilir. Diğer sekmedeki değişiklikler eşitlenir. Adetler sunucunun izin verdiği üst sınırla tutarlıdır.
- Modal klavye dolaşımında devre dışı ve tab sırası dışında kalan alanlar kullanılmaz. Escape ve odak geri dönüşü korunur. Teknik bilgi isteği başarısız olursa yeniden deneme düğmesi vardır; detay önbelleği sekiz parça ile sınırlıdır. Görsel yükleme hatası farklı ürünün görselini de kalıcı olarak gizlemez.
- 320 pikseldeki arama çubuğu taşması giderildi. Mobil giriş alanları 16px olur; iOS'ta giriş sırasında otomatik yakınlaştırmayı önler. Sepet, adet, kapatma ve sayfalama düğmeleri büyütüldü. Açıklama, marka ve teklif metinleri daha yüksek kontrastla gösterilir. Başlık düzeyleri, bağlantı ayırt edilebilirliği, içeriğe geçiş ve sayfa bölgeleri düzenlendi.
- GitHub Pages derlemesinde sunucu oturumu ve form servisine olmayan API istekleri yapılmaz. Yönetim hizmetinin açık olmadığı açıkça belirtilir. Normal sunucu derlemesinde yönetim ve teklif işlevleri korunur.

## Görseller

Sitede kullanılan 4.750 temiz görselin tamamından `scripts/create-product-thumbnails.py` ile 320px sınırında ve en fazla 640px tam boy WebP sürümleri üretildi. Toplam 9.500 dosya vardır; yalnızca görüntü boyutlandırma ve sıkıştırma uygulanır. Katalog orijinalleri ve denetlenmiş temiz dosyalar değiştirilmez. Kaynak ve çıktı SHA-256 değerleri `docs/product-image-thumbnails.json` dosyasında tutulur ve test edilir.

Kaynak görsellerin toplamı 296.651.355 bayt; küçük sürümler 38.633.112 bayt; tam boy WebP sürümler 65.641.582 bayttır. Bu toplam dosya karşılaştırmasıdır; tek bir sayfanın indirme boyutu değildir. Kartlar ekran yoğunluğuna göre küçük/tam sürümü seçer; detayda tam sürüm kullanılır.

## Akademi

Yedi özgün teknik rehber eklendi; toplam 10 yazı vardır. Yeni başlıklar: gres seçimi, açık/kapaklı/contalı rulmanlar, C3 iç boşluk, montaj hataları, titreşim/sıcaklık izleme, hasar incelemesi ve depolama/izlenebilirlik. Ana sayfa üç kartla sınırlı kalır; tüm yazılar Akademi listesinde ve kendi adreslerinde okunur. Bunlar kaynak standartları belirtilen teknik rehberlerdir, hakemli araştırma olarak sunulmaz.

## Yeniden doğrulama

```sh
npm ci --no-audit --no-fund
node tests/site.test.js
node tests/catalog.test.js
node tests/image-cleanup.test.js
node tests/technical-search.test.js
node tests/quote.test.js
node --test tests/server.test.js
python tests/test_skf_data.py
VITE_STATIC_HOST=true npm run build -- --base=/AYISIGI-RULMAN/
npm run preview -- --port 4173 --strictPort --base=/AYISIGI-RULMAN/
```

Ayrı terminalde `npm run test:browser` çalıştırılır. Sistem Chromium'u yoksa `npx playwright install chromium` veya `CHROMIUM_EXECUTABLE` kullanılabilir. `SITE_URL` farklı önizleme adresini seçer. Tarayıcı raporu `/tmp/rulman-browser-audit.json` dosyasına yazılır. WhatsApp açılışı testte taklit edilir; dışarıya mesaj gönderilmez.

Performans ölçümü:

```sh
CHROME_PATH=/usr/bin/chromium npx lighthouse http://127.0.0.1:4173/AYISIGI-RULMAN/ --chrome-flags='--headless --no-sandbox' --only-categories=performance,accessibility,best-practices,seo --output=json --output-path=/tmp/rulman-mobile.json
```

Masaüstü ölçümünde `--preset=desktop` eklenir. Eski sürüm karşılaştırması `d0a1cc1` kaynağının ayrı üretim derlemesiyle, aynı makinede ve başka tarayıcı testleri çalışmadan alınır. Sonuçlar `docs/site-audit-results.json` içindedir.

## Kalan hizmet sınırı

GitHub Pages statik barındırmadır. Kalıcı teklif kaydı, e-posta bildirimi ve yönetici oturumu için hazırlanan Node.js/SQLite sunucusu ile SMTP hizmeti ayrıca kurulmalıdır. Bu çalışma yeni bir sunucu veya e-posta hesabı açmaz. Sunucuda kullanılacak derleme `VITE_STATIC_HOST=true` olmadan üretilir. Sunucu testlerinde bildirimler taklit edilir, gerçek müşteriye e-posta gönderilmez.

## Son ölçüm ve test sonuçları

| Denetim | Önce (mobil) | Sonra (mobil) | Sonra (masaüstü) |
| --- | ---: | ---: | ---: |
| Lighthouse performans | 44 | 98 | 100 |
| Erişilebilirlik | 89 | 100 | 100 |
| İyi uygulamalar | 100 | 100 | 100 |
| SEO denetimi | 100 | 100 | 100 |
| LCP | 22,7 sn | 0,8 sn | 0,6 sn |
| Toplam engelleme süresi | 15.720 ms | 180 ms | 0 ms |

Başlangıç JavaScript paketi 531.327 bayttan 317.757 bayta indi. 52 birim/veri/sunucu testi geçti. Tarayıcı kontrolünde 10 makale, yedi ürün grubu, beş ekran genişliği, kod/ölçü araması, sepet ve indirme, klavye odağı, depolama reddi, Worker geri dönüşü ve ağ hatasından kurtarma doğrulandı. Mobil ve masaüstünde toplam 20 axe taraması ihlal bulmadı; test edilen normal akışlarda çalışma hatası veya başarısız yerel dosya isteği görülmedi. Üretim bağımlılıklarında bilinen güvenlik açığı sayısı sıfırdır.

Puanlar yerel laboratuvar koşullarına ve ölçüm değişkenliğine bağlıdır. Lighthouse SEO puanı, hash tabanlı bütün sayfaların arama motorlarında ayrı ayrı indeksleneceğini veya sıralama sonucunu garanti etmez.
