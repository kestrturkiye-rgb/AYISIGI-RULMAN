# Domainlere göre marka görünümü

Aynı katalog, Supabase projesi ve yönetim paneli kullanılır; ürünler kopyalanmaz. Telefon, WhatsApp, e-posta, adres ve çalışma saatleri ortaktır. Yeni marka adıyla e-posta kutusu açılmaz.

| Marka | Ana SEO adresi | Aynı markayı gösteren diğer adresler |
| --- | --- | --- |
| Rulman Teklif | https://rulmanteklif.com | rulmanteklif.com.tr, rulmanteklif.online |
| Rulman Teknik | https://rulmanteknik.com | rulmanteknik.com.tr |
| Rulman Asistan | https://rulmanasistan.com | rulmanasistan.com.tr |
| Rulman Kodu | https://rulmankodu.com | rulmankodu.com.tr |
| Rulman Seçim | https://rulmansecim.com | — |

www adresleri aynı markayı gösterir. Ziyaretçi kullandığı adreste kalır; canonical, hreflang, ürün şeması ve site haritaları markanın ana .com adresini kullanır. Farklı markalar arasında canonical birleştirmesi yapılmaz. Aynı katalog içerikleri Google tarafından benzer sayılabilir; beş markanın birlikte sıralama alması garanti değildir.

## Panelden düzenleme

/admin/#/ayarlar → Site kimliği, logolar ve domain markaları → Düzenle.

Rulman Teklif ana adı ve logosu mevcut kimlik alanlarındadır. Domainlere göre marka görünümü altındaki Rulman Teknik, Asistan, Kodu ve Seçim bölümlerinde ad, logo, favicon, Türkçe/İngilizce slogan, SEO açıklaması ve Hakkımızda metni düzenlenir. Ayrı logo seçilmezse mevcut rulman simgesi ve ilgili marka adı kullanılır. Görseller mevcut medya kütüphanesinden seçilir. Kayıt, mevcut admin rolü ve sürüm çakışması kontrolüyle yapılır.

## DNS bağlantısı

Domainler mevcut Vercel projesine eklendi. Yeni dokuz domainin DNS yönlendirmesi bekliyor; provider-setup.json ölçüm anındaki durumu gösterir. Natro hesabına tarayıcı erişimi bu çalışma ortamında bulunmadığından DNS değişikliği yapılmadı.

Her yeni domainin aktif DNS sağlayıcısında mevcut @ A kaydını 216.198.79.1 olarak düzenleyin; www CNAME kaydının hedefini b47b254bab90fc36.vercel-dns-017.com yapın. Aynı ad için eski/çakışan web A/AAAA/CNAME kayıtlarını kontrol edin. MX, SPF, DKIM, DMARC ve e-posta sunucusu kayıtlarını değiştirmeyin. Cloudflare DNS kullanılıyorsa web kayıtlarını DNS only yapın. Natro'dan alınmış olsa da DNS Cloudflare nameserver'larıyla yönetiliyorsa kayıtları Cloudflare'de düzenleyin; nameserver taşıması gerekmez.

rulmanteknik.com için iki ayrı TXT kaydı da gerekir; ikisinin adı _vercel, değerleri dns-records.csv içindedir. Biri kök domaini, diğeri www adresini doğrular. Vercel bu domainin sahipliğini henüz doğrulamadı; DNS doğrulaması tamamlanınca proje domain ekranındaki Verify işlemi yapılabilir. Yeni domainler için HTTPS sertifikası ve canlı HTTP kontrolü DNS doğrulamasından sonra tamamlanır.

## Güvenlik ve hesaplar

Yalnızca kodda tanımlı 20 tam hostname yetkilidir. CMS'den güvenilir hostname eklenemez. Her domaine ait HttpOnly/Secure __Host oturum çerezleri host ile sınırlıdır. Aynı müşteri hesabı veritabanını kullanır; bir domaindeki giriş ve çerez rızası diğer domaine otomatik taşınmaz. Ziyaretçi analizi korunur ve her adreste ayrı rıza gerektirir. Yeni callback adresleri Supabase allow list'e eklendi; SMTP, shared site_url ve diğer uygulama ayarları korunur. Tekrar eden mevcut Rulman callback URL'leri aynı tam domainin /** yol deseniyle birleştirildi (Supabase uzunluk sınırı).

## Kontroller

- node tests/branding/domains.test.mjs
- node tests/branding/server.test.mjs
- node tests/branding/browser.mjs (yerel PostgreSQL konteyneri, 55432 gerekir)
- node tests/security/auth.test.mjs
- node tests/security/domain.test.mjs
- node tests/seo/browser.mjs
- npm run build:complete

Tarayıcı testlerinde yeni domainlerin tüm istekleri loopback test sunucusundan karşılanır. Üretimde müşteri/test hesabı oluşturulmaz ve e-posta gönderilmez. Yerel raporlar bu klasördedir. Yeniden kurulumda SQL migration 202611170032_domain_brand_profiles.sql mevcut identity ayarına küçük marka profilleri ekler; mevcut profil özelleştirmelerini korur. Varsayılanlar profil alanı boşsa uygulamada da bulunur.
