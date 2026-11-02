# Toplu ürün görseli temizliği

Bu işlem, kullanıcının Python/OpenCV ile toplu temizleme seçimi üzerine mevcut ürün fotoğraflarına uygulanır. Ürün kimlikleri, adları, kodları, ölçüleri ve katalog üyeliği değiştirilmez. Kaynak dosyalar `public/catalog/images` içinde korunur; web sitesi temizlenmiş dosyaları `src/product-image-map.json` eşlemesiyle kart, detay ve sepette gösterir. Eşleme katalog çözülürken uygulanır; ürün modelinin `image` alanı doğrudan temiz görsel adresini taşır. Kök adres ve GitHub Pages proje tabanı ayrı test edilir.

## Yöntem

- Kataloğun referans verdiği tüm benzersiz dosyalar açılıp sınıflandırılır. Şablonlu satıcı fotoğrafları, ortak çapraz filigranlı çizimler ve temiz üretici fotoğrafları ayrı işlenir.
- Çapraz filigranın yarı saydam katmanı, aynı şablonlu çizimlerin alfa ve renk istatistiklerinden çıkarılır. OpenCV/NumPy ile kaynak-üstüne alfa birleştirmesi tersine çevrilir. Filigran maskesi dışındaki piksel verileri değiştirilmez; bu koşul işlem raporunda denetlenir.
- Çerçeveli fotoğraflarda satıcı üst bilgisi ve adres şeridi ürünün alanından ayrılır. Yerel IS-Net foreground modeli yalnızca maske üretir. Ürün fotoğrafı başka bir ürünle değiştirilmez veya yeniden üretilmez; maskenin içindeki görüntü orijinal fotoğraftan gelir. Çerçevesiz fotoğraflar için farklı kırpma uygulanır; ürünün üst kısmı korunur.
- Beyaz seramik/plastik gibi zor örneklerde kontrol edilmiş maske düzeltmeleri vardır. Bazı bilgi etiketlerinin örttüğü alan, aynı fotoğrafın etiket içermeyen eşleşmesinden onarılır; etiketten bağımsız bölgeler arasındaki piksel farkı denetlenir. Ürün üzerine basılı model numarası değiştirilmez. Bu eşlemeler `scripts/image-cleanup-overrides.json` dosyasındadır.
- Görsel dışındaki kaynak bağlantıları, kaynak filtresi ve görsel üzerindeki arayüz etiketleri önceki güncellemede kaldırılmıştır. Temsili seri/kategori ayrımı erişilebilir alternatif metin ve detay açıklamasında korunur.
- Önceki turda kabul edilen dört düzenlenmiş görsel korunur. Diğer dosyalar için yeni görsel üretme servisi kullanılmaz. İşlem ve maskeleme yerel makinede çalışır.

## Yeniden çalıştırma

Yalnızca görüntüleri yeniden üretmek için Python ve aşağıdaki paketler gerekir; sitenin derlenmesi/çalışması bu paketlere bağlı değildir.

```sh
python -m pip install -r scripts/image-cleanup-requirements.txt
mkdir -p /workspace/shared/image-models
curl -fL https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-general-use.onnx -o /workspace/shared/image-models/isnet-general-use.onnx
python scripts/clean-product-images.py --workers 3
```

Model, rembg projesinin açık dağıtımındaki IS-Net modelidir (orijinal MD5: `fc16ebd8b0c10d971d3513d564d01e29`). Betik bu modeli 512 piksel girişe uyarlar; ağırlıkları değiştirmez. Modeller, maskeler ve ara kayıtlar `/workspace/shared/image-models` içinde tutulur ve depoya eklenmez. Checkpoint dosyası atomik olarak yazılır; kesilen işlem aynı komutla sürdürülebilir. Orijinal dosyanın SHA-256 değeri veya işlem sürümü değiştiyse sonuç tekrar üretilir. Ham katalogdaki çapraz filigran şablonu değiştiğinde `rt-watermark.npz` ara modelini silip yeniden üretin.

`--sample 40` seçeneği kontrol örnekleri üretir. Deneme çıktılarının canlı derlemeye girmemesi için farklı bir `--output` klasörü kullanın.

## Denetim

`docs/product-image-cleanup-report.json` her dosyanın işlem durumunu, orijinal SHA-256 değerini, hangi ürünlerde kullanıldığını, çıktı adresini ve varsa çıktı SHA-256 değerini tutar. `verified_clean` bilinen şablon taramasında temiz üretici görseli olarak sınıflandırılan dosyadır; `cleaned` yerel işlemin çıktısıdır; `previously_edited` önceki turda kontrol edilmiş görseldir. Son raporda `review_required` kalmamalıdır.

```sh
node tests/image-cleanup.test.js
node tests/catalog.test.js
node tests/technical-search.test.js
npm run build -- --base=/AYISIGI-RULMAN/
```

Tarayıcı kontrolünde özellikle kullanıcının paylaştığı `SNR 6001 ZZ C3` görseli, çapraz filigranlı çizimler, beyaz malzemeler, mobil detay penceresi ve sepet incelenir. Otomatik maskeleme sınırda çok hafif kenar gölgelerini etkileyebilir; model/ürün uygunluğu mevcut sipariş öncesi teknik teyitle korunur. Dosyaların kaynak SHA-256 değerleri ayrı testle kontrol edilir; orijinaller silinmez.

## Son metin ve piksel taraması

`docs/product-image-text-audit.json`, sitede gösterilen 4.750 farklı dosyanın tamamına uygulanan yerel RapidOCR PP-OCRv4 taramasını içerir. Her kayıt dosyanın SHA-256 değerine bağlıdır; değişen görüntü eski denetim sonucunu kullanamaz. Bilinen adres içeren bir orijinal fotoğraf pozitif kontrol olarak okunur. Son taramada nitelikli web adresi veya satıcı kaynak adı adayı kalmamıştır. OCR küçük veya bozulmuş metinleri kaçırabileceğinden bu sonuç görsellerdeki her işaret için kesinlik iddiası değildir.

Bu kontrol, sekiz üründe ortak kullanılan HIWIN kutu fotoğrafına basılmış küçük bir web adresini buldu. Yalnızca adres alanına OpenCV inpaint uygulanır; ürün şekli, marka ve model yazıları korunur. Maske orijinal SHA-256 ve işlem sürümüne bağlıdır. Önceden kullanılan temiz dosya adresi de düzeltilmiş pikselleri sunar. Orijinal kaynak fotoğraf değişmez.

Çapraz filigranlı 924 çıktıda ayrıca 398.621 yalnız-filigran pikseli incelendi; kalan piksel bulunmadı. Metin denetiminin yeniden çalıştırılması:

```sh
python -m pip install -r scripts/image-audit-requirements.txt
python scripts/audit-product-image-text.py
node tests/image-cleanup.test.js
```

OCR modelleri Python paketine dahildir; görseller uzak bir servise gönderilmez. Ara tanıma kayıtları `/workspace/shared/image-text-audit` içinde tutulur. Testler, raporun bütün güncel dosyaları kapsadığını ve rapordaki SHA-256 değerlerinin sunulan dosyalarla aynı olduğunu doğrular.
