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

Son kontrolde özel SMTP kapalı, e-posta doğrulama açık, posta kutusu parolası çalışma ortamında yoktu. Bu nedenle henüz SMTP uygulanmadı ve test e-postası gönderilmedi. Gönderim ve gerçek gelen kutusu teslimi kurulumdan sonra ayrıca doğrulanmalıdır. Sağlayıcıya bağlantı bilgileri bilinmesi tek başına SMTP kimlik doğrulamasının veya teslimatın çalıştığını kanıtlamaz.

Sunucu yardımcısı `scripts/security/configure-smtp.py` varsayılan olarak salt okunurdur. Natro 587'yi reddeder; gizli değerleri çıktılamaz. Güvenlik kontrolleri: `python tests/security/test_smtp.py`.
