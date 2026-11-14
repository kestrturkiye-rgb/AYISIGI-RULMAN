# Tam yayın — güvenlik, karışık ürünler ve gizlilik

Bu yayın yalnız logo değişikliğinin ardından hazırlanmış tüm uygulama değişikliklerini kapsar. Ürün kataloğu yeniden içe aktarılmaz; var olan kullanıcılar, teklifler ve ziyaretçi analizi korunur.

- SQL 022/023 ve canlı büyük katalogda seçki zaman aşımını gideren indeksli SQL 024 uygulandı.
- Yeni parola alt sınırı 12; HttpOnly/Secure oturum anahtarı yalnız Vercel sunucu ortamında.
- `rt-admin-operations` Edge v2; mevcut HMAC ve diğer projelerin site URL ayarları korundu.
- CSP, CSRF, hesap silme korumaları, yeni çerez tercihleri, KVKK/gizlilik/çerez sayfaları ve admin yasal metin taslakları hazır uygulamada.
- Karışık 24 ürün sorgusu gerçek 111.952 ürün kataloğunda indeksle zaman aşımı olmadan çalışır.

## Veri ve geri alma

`snapshot.json`, değişen beş fonksiyonun ve ayarların AES-256-GCM ile şifreli, özel Storage deposunda tutulan dar kapsamlı geri alma kopyasını tarif eder. Anahtar ayrı Vercel şifreli sunucu ortamında tutulur. İndirme ve çözme doğrulandı. Müşteri/üye/ziyaretçi kayıtları bu snapshot'a dışa aktarılmadı; bu kayıt bir tam veritabanı ve medya yedeği değildir. Tam düzenli DB+dosya yedekleme, doğrudan DB bağlantısı ve harici depo olmadan kurulmuş sayılmaz.

## Doğrulama sınırı

Yerel gerçek PostgreSQL ve emüle Auth testleri daha önce geçti. Canlıda kayıt değiştirmeyen kontroller kullanılır; `live-public-smoke.json` sonuçları kaydeder. Geçici admin hesabı oluşturma ve gerçek hesap silme testi otomatik güvenlik incelemesince üretimde ayrıcalıklı hesap bırakma riski nedeniyle engellendi; bu yöntem uygulanmadı. Canlı mevcut kullanıcıyla başarılı giriş/silme doğrulanmış gibi sunulmaz. Kullanıcı yeni güvenli oturumla admin paneline yeniden giriş yapmalıdır.

## Bekleyen işletme bilgileri

Tam ticari unvan ve başvuru adresi verilmedi. Kamuya açık olmayan veya doğrulanmamış bilgiler uydurulmadı. Admin Ayarlar → KVKK ve gizlilik bilgileri üzerinden tamamlanabilir. Görünen metinler bu bilgiler tamamlanmadan eksiksiz hukuki uyum iddiası taşımaz. Daha önce yönetici tarafından yayınlanmış özel gizlilik sayfasının başlığı ve içeriği korunur.

Google Ads kampanyası ve gerçek ürün URL/SSR SEO dönüşümü bu yayında başlatılmadı; önceki çalışma bunlar için bir plandı.
