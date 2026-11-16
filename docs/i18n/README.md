# Türkçe ve İngilizce

Public siteye TR/EN seçimi ve `/en/` adresleri eklenir. Admin paneli Türkçe kalır.

- Türkçe varsayılandır. Üst başlıktaki seçim mevcut sayfayı ve filtreleri korur. Dil URL'de ve `rt-language` tercihinde tutulur. İngilizce seçilmiş normal ana sayfa ziyaretinde tercih hatırlanır; auth callback parametreleri değiştirilmez.
- Menü, katalog, kategori adları, arama, teknik özellik etiketleri, teklif/sepet, form doğrulamaları, kampanyalar, üyelik, iletişim, hakkımızda ve gizlilik/çerez arayüzü çevrilir.
- Canlıdaki mevcut 10 akademi makalesinin İngilizce teknik sürümü vardır. Yeni bir makalenin İngilizce sürümü yoksa orijinal korunur ve bu durum belirtilir.
- SKU, marka, ölçü/sayısal veri, müşteri girdileri, e-posta, telefon ve adresler değiştirilmez. Ürün adlarında bilinen teknik terimler çevrilir. Özel üretici açıklamaları ve yeni serbest metinler İngilizce karşılık yoksa kaynak dilde kalabilir; veri uydurulmaz.
- WhatsApp ve indirilen teklif metni seçilen dilde hazırlanır. Sunucuya gönderilen gerçek ürün kimliği, miktar ve müşteri notu değiştirilmez. Hesap silme onay anahtarı `HESABIMI SİL` kalır; İngilizce açıklama aynı anahtarı açıkça belirtir.
- İngilizce kategori arama sözcükleri Türkçe katalog karşılıklarına eşlenir; ürün kodları olduğu gibi aranır. Dropdown etiketleri değişir, filtre değerleri aynı kalır.
- Google ve site içi ziyaretçi analizi izinleri dil değişiminde değiştirilmez. Analiz yeni dil yolunu kaydeder; `/en/hesabim`, `/en/teklif`, `/en/admin` özel sayfaları Google ölçümünden dışlanır.

## Yönetim

Admin → Ayarlar → **Dil ve İngilizce çeviriler**. Bir kaynak metnin ekranda görünen tam karşılığı ve İngilizce çevirisiyle kayıt eklenebilir. Bu kayıtlar düz metindir, HTML/JS çalıştırılmaz. Kaynak Türkçe içerik korunur. Çeviri değişiklikleri mevcut içerik sürümü ve önbellek kurallarıyla yeniden deploy gerektirmeden alınır.

`202611160029_public_languages.sql`, yalnız ayar anahtarını ve bir başlangıç çevirisini ekler. Ürün, teklif veya kullanıcı kaydı aktarmaz; RLS politikalarını değiştirmez.

## SEO ve yayın

`/en/`, `/en/urunler`, `/en/urun/{slug}` ve makale/sabit sayfa yolları sunucuda İngilizce HTML verir. Canonical ve karşılıklı `hreflang=tr/en` bağlantıları vardır. Site haritaları iki dili içerir; Vercel yanıt boyutu sınırı için her ürün parçası en fazla 1000 ürün / 2000 dil URL'si döndürür. Eski hash adresleri ve GitHub Pages korunur. Ana ürün kimlikleri değişmediğinden iki dil aynı kataloğu yönetir.

E-posta doğrulama ve parola kurtarma dönüşlerinde İngilizce müşteri `/en/` yoluna döner; yönetici `/admin/` yolunda kalır. Supabase izin listesine bu tam adresler eklenir. SMTP sağlayıcısı kurulumunun kendisi bu değişikliğin parçası değildir; önceki bekleyen SMTP/Google hesap kurulumu devam eder.

## Kontroller

- `npm run test:i18n`: sözlük, rotalar, teknik arama, müşteri girdileri ve düz metin güvenliği.
- `npm run test:i18n:browser`: izole gerçek PostgreSQL/RLS + emüle anonim auth ile dil, sepet/form, arama, akademi, çerez ve 1366/390/360 px görünüm.
- `node tests/security/auth.test.mjs`: İngilizce callback yolu dahil mevcut auth güvenliği.
- `node tests/seo/server.test.mjs`: İngilizce ilk HTML, canonical ve hreflang.
- Canlı testler yeni hesap açmaz, giriş yapmaz, teklif veya rızalı analiz kaydı yazmaz. Gerçek üyelik e-postası teslimi doğrulanmış sayılmaz.
