# Tasarım ve Rulman Akademisi

Arayüz, kullanıcının verdiği Schaeffler medias referansının yeşil/beyaz/gri renk yaklaşımı ve Noto Sans yazı ailesiyle düzenlendi. Referans sayfanın HTML içindeki font tanımı doğrulandı; uzak CSS sunucusuna ortam ağ politikası nedeniyle erişilemedi. Bu nedenle düzen özgün olarak uygulandı, referans CSS kopyalanmadı.

`src/theme.css` tüm sayfaların ortak görünümünü tanımlar. Noto Sans, Google Fonts açık dağıtımından alınıp Türkçe/Latin karakterler, matematik simgeleri ve noktalama korunarak WOFF2 biçiminde küçültüldü. Font ve OFL lisansı `public/fonts` içinde tutulur; çalışma sırasında font servisine istek yapılmaz.

Logo simgesi, kullanıcının talebiyle `https://rulmanteklif.com/wp-content/uploads/2026/04/cropped-ext-custom-logo-1775658038221.webp` dosyasından alındı ve `public/brand` içinde yerelleştirildi. Yapay ana sayfa SVG rulmanı yerine mevcut temiz katalog görseli kullanılır.

Akademi bileşeni `src/Academy.jsx`, metinleri `src/academy-data.js` içindedir. Ana sayfada üç kart, `#/akademi` adresinde konu filtreli liste ve `#/akademi/{slug}` adreslerinde ayrı makaleler vardır. Menü, alt bilgi, geri dönüş bağlantıları ve sayfa başlıkları bu adreslerle çalışır. Görseller mevcut temiz yerel katalog varlıklarıdır.

Yazılar özgün teknik rehberlerdir; bir akademik dergiden alınmış veya hakemli araştırma olarak sunulmaz. ISO 281, ISO 76, ISO 15243 ve ISO 14728 başvuru standartları olarak belirtilir. Tam standart metinleri kopyalanmaz. İçerikler uygulamaya özel mühendislik değerlendirmesinin yerine geçmez.
