# Natro SMTP kurulumu

Kullanıcının ilettiği sağlayıcı yanıtı bu hesap için şifreli 465 / SSL-TLS bağlantısını doğruluyor. Aynı yanıtta 587 bağlantısında STARTTLS'nin kapalı olduğu belirtiliyor; bu hesap için 587 kullanılmaz.

Supabase projesi: `lptosaejlowasrbcyqnu`.
Panel: https://supabase.com/dashboard/project/lptosaejlowasrbcyqnu/auth/smtp
Authentication → Emails → SMTP Settings / Custom SMTP.

| Alan | Değer |
| --- | --- |
| Host | mail.kurumsaleposta.com |
| Port | 465 |
| Username | info@rulmanteklif.com |
| Sender email | info@rulmanteklif.com |
| Sender name | Rulman Teklif |
| Password | Kullanıcı yalnız Supabase SMTP ekranına veya güvenli sunucu sırrına girer |

Bu projenin Auth altyapısı başka bir CMS ile ortaktır. Global SMTP değişikliği o uygulamanın giriş e-postalarında da aynı göndericiyi kullanır. Bu etki hesaba katılmalı; kurulumda diğer uygulamaların site URL, redirect listesi, doğrulama ve parola ayarları korunmalıdır.

SMTP ayarları kullanıcı tarafından Supabase panelinde kaydedildi; sunucu/465 portu, kullanıcı ve gönderici doğrulandı. Son iki üyelik denemesinde Auth günlükleri SMTP 535 kimlik doğrulama reddini gösterdi. Parola hiçbir zaman okunmadı veya dışa aktarılmadı. Gerçek e-posta teslimi henüz doğrulanmadı. Kullanıcı güncel posta kutusu parolasını yalnız SMTP ekranında yeniden girmeli; hata sürerse Natro dış uygulama SMTP AUTH yetkisini ve hesap kısıtlarını kontrol etmelidir. Sağlayıcıya bağlantı bilgileri bilinmesi tek başına SMTP kimlik doğrulamasının veya teslimatın çalıştığını kanıtlamaz.

Sunucu yardımcısı `scripts/security/configure-smtp.py` varsayılan olarak salt okunurdur. Natro 587'yi reddeder; gizli değerleri çıktılamaz. Güvenlik kontrolleri: `python tests/security/test_smtp.py`.
