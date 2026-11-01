# Teklif ve admin paneli kurulumu

GitHub Pages yalnızca statik dosyaları sunar. Müşterinin teklifini kalıcı kaydetmek, yönetici oturumunu doğrulamak ve e-posta göndermek için bu depodaki Node.js hizmeti gerekir. Sunucu veya e-posta hesabı bu çalışma sırasında satın alınmaz ya da otomatik oluşturulmaz.

Önerilen başlangıç: Ubuntu LTS yüklü, en az 1 GB RAM ve 10 GB kalıcı diski olan tek VPS; Node.js 24, Caddy ve e-posta sağlayıcınızın TLS destekli SMTP hesabı. Uygulama ve API aynı HTTPS adresinde çalışır. SQLite verileri kalıcı disktedir. Sunucu hizmeti ve SMTP ücretleri sağlayıcınıza bağlıdır. Yalnızca paylaşımlı PHP hosting bu Node.js hizmetini çalıştıramaz.

## Yerel kontrol

```sh
npm ci
npm run admin:password
```

Komut şifreyi ekranda göstermeden sorar ve yalnızca `ADMIN_PASSWORD_HASH` satırını üretir. En az 16 karakterli, bu siteye özel güçlü bir şifre kullanın. Çıktıyı `.env` dosyasına koyun; şifreyi veya hash'i Git'e eklemeyin. `.env.example` dosyasını `.env` olarak kopyalayın; yerel test için `NODE_ENV=development`, `APP_ORIGIN=http://localhost:3000`, `DATA_DIR=./data`, `TRUST_PROXY_HOPS=0` ayarlayın. SMTP alanları boşken gerçek form gönderimi kapalıdır; admin oturumu açılabilir, WhatsApp çalışır.

```sh
npm run build
npm start
```

Ana sayfa `http://localhost:3000/#/`, admin `http://localhost:3000/#/admin`. Tarayıcıdaki alan adı APP_ORIGIN ile aynı olmalıdır. GitHub Pages proje tabanı ile derlenen dosyaları bu kök sunucuda kullanmayın; burada varsayılan `npm run build` gerekir.

## VPS'ye kurulum

1. VPS'de Node.js 24, Git ve Caddy kurun. Alan adının DNS A/AAAA kayıtlarını VPS'ye yönlendirin. Dışarıya yalnızca SSH, HTTP ve HTTPS erişimi açın; Node.js 127.0.0.1:3000 üzerinde kalır.
2. `rulmanteklif` adlı oturum açamayan sistem kullanıcısı oluşturun. Depoyu `/opt/rulmanteklif` altına alın. Depoda `npm ci` ve `npm run build` çalıştırın. Node.js çalıştırılabilir yolu `/usr/bin/node` değilse hizmet dosyasındaki ExecStart'ı düzeltin.
3. `.env.example` içeriğini `/etc/rulmanteklif.env` olarak oluşturun; sahibi root, izni 600 olsun. `NODE_ENV=production`, gerçek HTTPS `APP_ORIGIN`, `DATA_DIR=/var/lib/rulmanteklif`, `TRUST_PROXY_HOPS=1` ve oluşturduğunuz yönetici şifre hash'ini girin. Yönetici şifresi istemciye gönderilmez.
4. E-posta sağlayıcınızdan SMTP sunucusu, port, kullanıcı ve uygulama parolası alın. Bunları yalnızca sunucudaki ortam dosyasına girin. Port 587 için `SMTP_SECURE=false` (STARTTLS zorunlu); port 465 için `SMTP_SECURE=true`. `SMTP_FROM` sağlayıcının göndermeye izin verdiği doğrulanmış adres olmalıdır. Bildirim alıcısı kodda sabit olarak **info@rulmanteklif.com**; müşteri adresi sadece Reply-To olarak kullanılır. Alan adının SPF/DKIM kayıtlarını sağlayıcının talimatlarıyla ayarlayın.
5. `deploy/rulmanteklif.service` dosyasını `/etc/systemd/system/` içine kopyalayın. `systemctl daemon-reload` ve `systemctl enable --now rulmanteklif` çalıştırın. systemd kalıcı veri klasörünü oluşturur. Ortam dosyası değişince hizmeti yeniden başlatın.
6. `deploy/Caddyfile` içindeki `example.com` yerine gerçek alan adını yazıp `/etc/caddy/Caddyfile` olarak kullanın. `caddy validate --config /etc/caddy/Caddyfile` ardından Caddy'yi yeniden yükleyin. Tek ters vekil olan Caddy HTTPS sertifikasını yönetir; ikinci bir CDN/proxy eklenirse güvenilen vekil ayarını yeniden değerlendirin.
7. HTTPS üzerinden formdan gerçek bir deneme talebi gönderin. Talep numarasını, admin listesinde ürün kodu/adetlerini ve info@rulmanteklif.com gelen kutusunu birlikte kontrol edin. Bu son kontrol gerçek SMTP hesabı gerektirir; yerel otomatik testler e-posta göndermez.

## İşleyiş ve sınırlar

- Teklif önce SQLite'a yazılır; müşteri yalnızca kayıt başarılı olduktan sonra talep numarası görür. E-posta arka planda 15 saniyede bir kontrol edilir. Başarısız gönderim bir dakika arayla toplam 5 kez denenir; ardından admin detayında “Bildirimi tekrar dene” görünür. Sunucu yeniden başlasa da bekleyen bildirimler ve teklifler korunur. SMTP'nin kabul etmesi gelen kutusuna teslim garantisi değildir.
- Talep idempotency anahtarıyla ağ hatası sonrasında tekrarlı kayda karşı korunur. E-posta teslimi en az bir kez mantığındadır; SMTP kabulünden hemen sonra sunucu kapanırsa aynı Message-ID ile tekrar bildirim oluşabilir.
- Yönetici paneli ürünleri, müşteri iletişim bilgilerini, notu, tarihi ve talep durumunu gösterir. Yeni / İnceleniyor / Teklif verildi / Tamamlandı durumları değiştirilebilir; arama, filtre ve sayfalama vardır. Fiyat teklifi hazırlama/PDF, müşteri hesabı ve ödeme bu sürümün kapsamında değildir.
- Admin oturumu 8 saatlik HttpOnly/Secure/SameSite çereziyle çalışır. API oturum doğrulaması yapar; arayüzü gizlemek güvenlik sayılmaz. Köken kontrolü, alan doğrulama, istek boyutu ve deneme sayısı sınırları uygulanır. Canlı trafikte ek spam koruması gerekirse sağlayıcı üzerinde etkinleştirilebilir.
- Güncellemelerde `data` klasörünü silmeyin. Günlük şifreli ve erişimi sınırlı yedek alın. Çalışan SQLite için `sqlite3 /var/lib/rulmanteklif/quotes.sqlite ".backup '/GUVENLI_YEDEK_YOLU/quotes.sqlite'"` gibi SQLite'ın yedekleme komutunu kullanın; yalnızca ana dosyayı WAL açıkken kopyalamayın. Geri yüklemeyi ayrıca deneyin. Müşteri verisi içerdiğinden dosyayı public/dist veya Git'e koymayın.
- SMTP hesabı kapalı/eksikse form yanlış bir başarı mesajı vermez; WhatsApp ve telefon seçenekleri görünür kalır. GitHub Pages'te sayfalar açılır ancak teklif kaydı/admin API'si VPS kurulana kadar çalışmaz.

Doğrulamalar: `node --test tests/server.test.js`, `node tests/quote.test.js`, katalog ve teknik arama testleri. Hiçbir test gerçek müşteriye veya firmaya mesaj göndermez.
