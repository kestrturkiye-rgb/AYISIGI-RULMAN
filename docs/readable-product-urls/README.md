# Okunabilir ürün adresleri

Adresler tam SKU/model kodundan üretilir: `/urun/6001`, `/urun/6001-2rs`, `/urun/6001-2rs-rbe`. `2RS`, `RBE`, `ZZ` gibi model son ekleri silinmez. Aynı kod birden fazla kayıtta kullanılıyorsa gerçek marka/kategori, gerekirse okunabilir `secenek-N` ekiyle ayrılır. Ürünler birleştirilmez; rastgele veritabanı kimlikleri yeni adreslere eklenmez.

Ürün sayfası yolu **Ürünler → kategori → tam model kodu** biçimindedir. Görünen kod, kategori ve mevcut teknik bilgiler gerçek kayıtlardan alınır.

Migration yalnızca ithal edilen uzun slug biçimini dönüştürür. Elle yazılmış diğer adresler korunur. `private.product_urls` kısa adresi ürün kimliğiyle eşler. Eski adres ürün satırında aynen korunur; büyük ürün tablosu yeniden yazılmaz. `private.product_slug_aliases` eski bağlantıları rezerve eder; RLS aktiftir ve anonim/personel doğrudan erişimi yoktur. Public lookup yalnızca hâlâ yayındaki ürünleri döndürür.

Eski adresler sunucuda 301 ile güncel adrese yönlenir. İngilizce adresler ve sorgu parametreleri korunur. Eski hash bağlantıları tarayıcıda güncellenir. Gelecekte admin'de adres değiştirilince önceki adres de saklanır; başka ürüne atanamaz. Sitemap güncel slug alanından okunur. Teklif sepetindeki ürün kimlikleri değişmez.

Yayın sırası:

1. Yerel test, build ve eski/yeni lookup uyumluluğunu doğrula.
2. Alias yönlendirmelerini destekleyen sunucu/istemci kodunu yayınla.
3. `python scripts/supabase/apply-readable-product-urls.py --apply` ile yalnız bu migration'ı uygula. Script transaction içinde ürün adedini ve tüm ürün alanlarının parmak izini karşılaştırır. Ürün satırları birebir aynı kalır; yalnız private adres eşlemesi eklenir. Yerel testin migration SHA değeri doğrulanır ve son boyut 500 milyon baytı aşarsa transaction geri alınır.
4. Eski URL → yeni URL → tam model → breadcrumb → canonical → sitemap ve mobil görünümü canlıda doğrula.

Test: `node tests/seo/readable-slugs-db.test.mjs`. Test 111952 kayıtlı yerel veritabanı kullanır; URL dışındaki arama indeksinin pahalı fixture yüklemesi sırasında yerel tetikleyicisi kapatılıp yeniden açılır. Migration sırasında canlı arama veya güvenlik tetikleyicileri kapatılmaz.

Sorun durumunda slug değerleri `scripts/supabase/rollback-readable-product-urls.sql` ile geri alınabilir. Bu dosya olağan kurulumda çalıştırılmaz. Geri alma, canonical adres çözümlemesini korunmuş eski ürün adreslerine çevirir; yeni adres eşlemeleri silinmediğinden yeni bağlantılar da eski adrese yönlenebilir. Tüm veritabanının doğrulanmış yedeği olduğu anlamına gelmez; eski ürün satırları ve adresleri yerinde korunur.
