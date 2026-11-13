# 9 Kasım 2026 katalog genişletmesi

Karşılaştırma listesindeki 2.796 kaynak satırı yeniden incelendi. 2.535 ürün/varyant katalog dosyalarına eklendi; 260 belirsiz/çelişkili satır bekletildi ve iki kaynaktaki bir Bosch GSB 13 RE kaydı tek üründe birleştirildi. Bu çalışma canlı siteye yayımlanmadı.

Mevcut 109.417 kayıt, kimlikleri, sıraları, sözlük indeksleri ve temizlenmiş fotoğrafları değiştirilmedi. Çalışan katalog toplamı **111.952** oldu. Orijinal `index.json`, `index.json.gz`, manifest ve eski görsel denetim raporları korunur. Ek veriler `public/catalog/additions.json` dosyasından birleştirilir; sıkıştırılmış sürümü mobil indirmeyi küçültür.

## Kapsam ve kimlik kontrolü

- İlk listede eşleşme bulunmayan 1.726 satırdan iki tanesi ayrıldı: birinde başlık farklı bir kodla çelişiyor; diğerinde rulmanın tam modeli/üreticisi belirsiz.
- İlk aşamada kontrol listesine ayrılan 1.070 satırdan 812'si, açık marka ve ayırt edilebilir ürün tanımıyla yeniden değerlendirildi. Bunlara **RT-…** biçiminde site içi referans verildi. Üretici parça numarası uydurulmadı.
- Kalan 258 satırda marka/tanım/model belirsizliği veya birbirinden ayrılamayan kayıtlar bulunuyor. Yukarıdaki iki satırla birlikte toplam 260 satır eklenmedi.
- Bosch GSB 13 RE iki kaynakta doğrulanan aynı model olarak tekilleştirildi. İki ürün referansı tek kayıtta korunur; Bosch'un ürün serisi adları ayrı üretici markaları yapılmadı.
- İki farklı tarım parçasında tekrarlanan bir barkod arama takma adı olarak kullanılmadı. Ayrı tanım ve referans kodları korundu.
- Kaynak fiyatı, stok miktarı, teslimat/kargo/garanti vaatleri aktarılmadı. Doğrulanmamış “orijinal” nitelemeleri yeni ürün başlıklarından çıkarıldı.
- Rulman iç/dış çap ve genişlik alanları ad veya genel parça ölçülerinden türetilmedi. 20/47 mm sorgusu önceki 331 sonucunu korur.

Bu genişletme ilk/kısmi karşılaştırmanın kapsamıyla sınırlıdır. Kaynak sitelerin tamamının ürünleri taranmış veya aktarılmış sayılmaz; CNC ve ABF erişim engeli sürer. Kaynak kapsamının ilk raporu `/workspace/shared/product-comparison/2026-11-09/exports/` altındadır.

## Ürün grupları ve kullanım

Beş yeni grup: Kesici takımlar, Atölye ekipmanları, Elektrikli el aletleri, Tarım yedek parçaları, Bahçe ve yardımcı makineler. Üst gezinme, kategori sekmeleri, mega menü ve footer bu grupların ayrı hash sayfalarına bağlanır. Kullanılan alt kategoriler ek grup JSON'undan türetilir; boş kategori sekmesi oluşturulmaz.

RT referansları ile tam ürün/varyant adı teklif mesajına birlikte girer. Satıcı kodu mevcutsa aramada takma ad olarak korunur. Ürün kaynak bağlantıları ziyaretçi kartında veya detayında gösterilmez.

## Görsel durumu

**Yeni ürün fotoğrafları henüz eklenmedi.** Kaynak görsel alan adları mevcut ağ politikasında engelli (`cdn.myikas.com`, `firebasestorage.googleapis.com`); `cdn.myikas.com` isteği ağ geçidinde 403 verdi; Firebase görsel alan adı da izin listesinde bulunmuyor. Bu nedenle doğrulanmamış/filigranlı fotoğraf veya başka ürüne ait temsilî rulman resmi kullanılmadı. Yeni kartlar metin odaklıdır; detayda fotoğrafın eklenmediği açıkça belirtilir. Eski ürün fotoğrafları ve denetim hash'leri korunur. Görsellerin indirilmesi ve temizlenmesi, bu kaynaklara erişim sağlandığında ayrıca tamamlanmalıdır.

## Dosyalar ve tekrar çalıştırma

- `reviewed-input.json`: seçilen kaynak olguları, inceleme yöntemi ve RT referansları; fiyat/stok içermez.
- `result.json`: eklenen kimlikler, kaynak referansları, kategoriler, bekletilen kayıtlar ve sayımlar.
- `src/catalog-addition-groups.json`: ek grup/alt kategori tanımları.
- `public/catalog/additions.json[.gz]`: bağımsız ek katalog.
- `public/catalog/details-425.json` ve sonraki ek detay parçaları: gerçek varyant/teknik bilgiler.

```sh
# İnceleme özeti; site dosyasına yazmaz:
python scripts/prepare-catalog-additions.py
# Aynı veriyi deterministik olarak üretir; ana kataloğu değiştirmez:
python scripts/prepare-catalog-additions.py --write
npm run test:catalog:additions
python tests/test_catalog_additions.py
VITE_STATIC_HOST=true npm run build -- --base=/AYISIGI-RULMAN/
npm run preview -- --port 4173 --strictPort --base=/AYISIGI-RULMAN/
# Ayrı terminal:
node tests/catalog-expansion.browser.mjs
```

Supabase kurulum/aktarım planı da birleşik kataloğu okur; RLS veya giriş sistemi değiştirilmedi. Mevcut Supabase projesi yoktur. Yerel DB testleri geçici PostgreSQL kullanır. Yeni veriyi canlı DB'ye uygulama, gerçek bulut testi veya deploy yapılmadı. Daha önce tamamlanan tek seferlik bir Supabase aktarımını yeniden çalıştırmak için bu dosyayı kullanmayın; sonraki değişiklikler ayrı veri güncellemesiyle yapılmalıdır.

## Son doğrulama

79 JavaScript, 28 gerçek yerel PostgreSQL ve 13 Python testi geçti. Statik ve Supabase yapılandırmalı derlemeler başarılı. Tarayıcıda mevcut akışlar, beş yeni grup, beş ekran genişliği, teklif sepeti, hata/yeniden deneme ve erişilebilirlik kontrol edildi. Supabase tarayıcı kontrolleri sahte HTTP yanıtlarıyla, veritabanı kontrolleri gerçek yerel PostgreSQL ile yapıldı; gerçek bulut projesi test edilmedi. `validation.json` doğrulama özetini, `decisions.csv` tüm 2.796 kaynak satırının kararını, `held-records.csv` bekletilen 260 satırı içerir.
