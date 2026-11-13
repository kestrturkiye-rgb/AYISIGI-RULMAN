# Rulman Teklif — admin paneli inceleme ve onay paketi

Durum: mimari/şema önerisi. Uygulama kodu değiştirilmedi, yeni migration uygulanmadı, yayın yapılmadı. Bu belge 9 Kasım 2026 tarihindeki çalışma ağacına dayanır. Önceki katalog ve Supabase çalışmalarının değişiklikleri korunur.

## 1. Repoda doğrulanan yapı

- React 19 + Vite 8; mevcut public uygulama JavaScript/JSX ve özel CSS kullanıyor. TypeScript, Tailwind, React Router, Zod ve React Hook Form henüz bağımlılıklarda yok.
- Hash routing `src/routes.js` ve `src/main.jsx` içinde. Mevcut yönetim girişi `#/admin`, ayrı bir uygulama değil.
- Ürünlerin statik tabanı `public/catalog/index.json[.gz]`; son genişletme `additions.json[.gz]`; teknik bilgiler parçalı `details-*.json` dosyalarında. Birleşik katalog 111.952 kayıt. Sayısal stok ve satış fiyatı doğrulanmış veri değil; bilinmeyen alanlar null kalacak.
- Statik metinler/kimlik: `src/company.js`, `src/company` ile ilgili bileşenler, `src/academy-data.js`, `src/academy-additions.js`, `src/main.jsx`. Gezinti: `src/catalog-groups.js`, ek grup JSON'u, `ProductNavigation.jsx`. Stil: `theme.css`, `style.css` ve bileşen CSS'leri.
- Sepet `src/cart.js` ile tarayıcıda tutuluyor; WhatsApp ve metin çıktısı `src/quote.js` üzerinden. `QuoteRequest.jsx` Node API'yi kullanabiliyor; Supabase modunda doğrudan teklif gönderimi özellikle kapalı. Supabase'e talep kaydı tamamlanmış değil.
- `src/supabase/` Supabase Auth, geri dönüş, oturum ve yapılandırma altyapısını içeriyor. `src/admin/SupabaseAdmin.jsx` admin/editör erişimini doğruluyor; tam yönetim modülleri yok. Node tabanlı eski admin ayrıca duruyor.
- `src/data/repository.js` ve `CloudApp.jsx` public Supabase okuma, sunucu sayfalaması, ürün detayları ve içerik yenilemesini içeriyor. `VITE_DATA_SOURCE=static|supabase` var; mevcut statik davranış korunuyor.
- Mevcut SQL 001..004 ürün, kategori, marka, medya, sayfa, akademi, menü, ayar, rol, teklif ve audit tablolarını ve RLS'yi kuruyor. Rol şu an admin/editör; teklif durumu new/in_progress/quoted/closed.
- Önceki çalışmada gerçek Supabase projesi bulunmuyordu. Bu pakette bir bulut projesine bağlantı kurulmadı; canlı kurulum varsayılmıyor.

## 2. Önerilen klasör yapısı

Aşağıdaki ağaç HEDEF yapıdır; bu aşamada uygulama dosyaları oluşturulmadı.

```text
AYISIGI-RULMAN/
├── src/                          # Mevcut public uygulama korunur
│   ├── data/                     # Supabase okuma katmanı
│   ├── supabase/                 # Public, oturum tutmayan istemci
│   └── QuoteRequest.jsx          # 7. adımda yeni teklif servisine bağlanır
├── apps/admin/                   # Ayrı Vite + React + TypeScript uygulaması
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── src/
│       ├── main.tsx
│       ├── app/{router,providers,permissions}.tsx
│       ├── components/{layout,ui,tables,forms}/
│       ├── features/auth/
│       ├── features/dashboard/
│       ├── features/products/
│       ├── features/imports/
│       ├── features/categories/
│       ├── features/brands/
│       ├── features/quotes/
│       ├── features/customers/
│       ├── features/settings/
│       ├── features/users/
│       ├── features/activity/
│       ├── lib/{supabase,errors,dates,files}.ts
│       └── styles.css            # Tailwind + marka tokenları
├── packages/contracts/           # Zod şemaları + üretilen DB tipleri
├── supabase/
│   ├── migrations/               # Mevcut 001..004; onay sonrası ek migration'lar
│   ├── functions/
│   │   ├── submit-quote/         # Anonim, captcha + hız sınırı
│   │   ├── process-media/        # Yetkili yükleme/dönüştürme
│   │   ├── manage-staff/         # Auth daveti + rol değişikliği
│   │   ├── render-quote-pdf/     # Yetkili PDF, özel bucket
│   │   └── send-notifications/   # Outbox işleyicisi
│   └── tests/
├── scripts/supabase/             # Mevcut tek seferlik aktarım korunur
├── tests/admin/                  # Rol, CRUD, teklif, import, mobil testleri
└── docs/admin-proposal/          # Şu an teslim edilen tam dosyalar
```

Admin adresi: `https://kestrturkiye-rgb.github.io/AYISIGI-RULMAN/admin/#/`.
HashRouter giriş, dashboard ve tüm modülleri yönetir. Eski `#/admin` bağlantısı bu adrese uyumluluk yönlendirmesiyle taşınır. İç bağlantılar repository base yolunu kullanır. Auth parola yenileme/davet dönüşü `/AYISIGI-RULMAN/admin/` olur; callback query bilgileri hash yönlendirmesinden önce güvenli biçimde işlenir. Hem sıfırlama hem davet test edilir.

Kök public build korunur; admin ayrı derlenip `dist/admin/` altına eklenir. Vite base publicte `/AYISIGI-RULMAN/`, adminde `/AYISIGI-RULMAN/admin/`. Tailwind yalnızca admin bundle'ında; public CSS'e preflight veya tema sızıntısı olmaz. React Router, Zod, React Hook Form ve tablo/query yardımcıları admin bağımlılıkları olarak eklenir. Excel için çalışma kitabı okuma sınırları bulunan bir kütüphane kullanılır. Dosya sürümleri uygulama adımında lockfile ile sabitlenir.

## 3. Şema ve SQL dosyaları

Mevcut şemayı silip yeniden kurmak yerine genişletiyoruz. Tam SQL içeriği pakette bulunur:

- `sql/001-core-existing.sql`: mevcut 001'in değişmeden kopyası.
- `sql/002-security-existing.sql`: mevcut RLS/rol/yayın politikaları.
- `sql/003-storage-existing.sql`: mevcut medya bucket ve Storage politikaları.
- `sql/004-public-read-existing.sql`: mevcut public okuma RPC'leri.
- `sql/005-role-status.sql`: satış rolü, kazanıldı/kaybedildi enum değerleri. Ayrı transaction.
- `sql/006-commercial-schema.sql`: müşteri, fiyatlandırma, stok, bildirim, PDF, RLS genişletmesi.

001..004 zaten uygulanmış bir projede TEKRAR çalıştırılmaz. 005/006 yalnızca inceleme taslağıdır; aktif migration dizinine konmadı. Onaydan sonraki ilk adımda temiz DB ve mevcut verili DB üzerinde yükseltme/geri dönüş testlerinden geçer. Bu aşamada SQL çalıştırılmadı; production doğrulaması yapılmış migration olarak değerlendirilmemeli.

| Alan | Tablolar / öneri |
|---|---|
| Ürünler | Mevcut `products`, `product_aliases`, `product_relations`, `spec_templates`, `product_media`. Tip/kapak/kafes vb. kategori şablonlu specifications; d/D/B mevcut numeric alanlar. SKU tek başına global unique değildir: aynı kod farklı markada bulunabilir. |
| Kategori/marka | Mevcut `categories` (parent + döngü kontrolü), `brands`; sıra, durum, soft delete, görsel/SEO. |
| Medya | Mevcut `media_assets`, `media_variants`, `media_usages`; PDF mevcut product_media üzerinden MIME'a göre ayrılır. |
| Müşteri | Yeni `private.customers`; teklifler `customer_id` ile bağlanır. Talep anı JSON snapshot korunur. Ortak e-postalar otomatik birleştirilmez; aday eşleşme ve yetkili birleştirme kullanılır. |
| Teklif | Mevcut `quotes`, `quote_items`, `quote_notes`; yeni fiyat, indirim, vergi, para birimi, geçerlilik ve atanan satış sorumlusu. |
| Akış/geçmiş | Yeni `quote_status_history`: Yeni → İnceleniyor → Teklif Gönderildi → Kazanıldı/Kaybedildi. Eski closed kayıtları silinmez, inceleme durumunda gösterilir. |
| Sayısal stok | Yeni `inventory_levels`: miktar/eşik nullable. Veri yoksa “Stok bilgisi girilmedi”; azalan stok metriği uydurulmaz. |
| PDF | Yeni `quote_documents` + özel Storage bucket. Her çıktının sürümü/hash'i; kısa süreli signed URL. |
| Bildirim | Mevcut `notification_outbox` + lease/retry; yeni kullanıcı bazlı `staff_notifications`. |
| Spam | Yeni özel `quote_rate_limits`; HMAC kimlik özeti, atomik sayaç, süreli temizlik. |
| Kullanıcı/log | Mevcut `staff_members`, `audit_log`. Ticari kayıt loglarında PII/fiyat kopyası tutulmaz; kim/ne/zaman kaydedilir. |
| İçerik | Mevcut `pages`, `articles`, `home_sections`, `menus`, `menu_items`, `ui_texts`, `site_settings`, `content_version`. |

## 4. Rol ve RLS matrisi

| İşlem | Ziyaretçi | Editör | Satış | Admin |
|---|---|---|---|---|
| Yayındaki katalog/içerik okuma | Evet | Evet | Evet | Evet |
| Taslak ve katalog/içerik düzenleme | Hayır | Evet | Hayır | Evet |
| Teklif oluşturma | Spam kontrollü Edge Function | Aynı kanal | Aynı kanal | Aynı kanal |
| Teklif/müşteri okuma ve yönetme | Hayır | Hayır | Evet | Evet |
| Stok miktarı düzenleme | Hayır | Evet | Hayır | Evet |
| Stok uyarıları | Hayır | Evet | Evet | Evet |
| Ayarlar/kullanıcı yönetimi/tüm aktivite | Hayır | Hayır | Hayır | Evet |

`private.is_staff()` admin/editör katalog anlamını korur; satış eklenerek yanlışlıkla katalog yazma açılmaz. Yeni `is_sales_staff()` sadece admin/satış içindir. Yetki Auth metadata'dan değil DB'deki etkin üyelikten okunur. Son admini silme/rol düşürme koruması mevcutta var ve korunur.

Tüm uygulama tablolarında RLS vardır. `private` şeması Data API'ye açılmaz. Sınırlı okuma RPC'leri SECURITY INVOKER ve RLS kullanır. Mutation RPC'leri açık rol kontrolü yapan SECURITY DEFINER, boş search_path, dar parametreler ve açık EXECUTE grant'leriyle tanımlanır. RPC'ler bir sonraki onaylı adımda testlerle geliştirilir; 006 tek başına işlevsel admin backend değildir. Public anonim INSERT izni verilmez: talep oluşturma hakkı Edge Function üzerinden sağlanır.

Planlanan API sözleşmeleri:
- `get_admin_dashboard(period, timezone)` rol bazlı metrikler; Türkiye saatiyle gün/hafta sınırları.
- `search_admin_products(filters, page, pageSize)` sunucu arama/sayfalama; sınır <=100.
- `save_product(payload, expectedVersion)`, `bulk_products(action, ids, expectedVersions)` transaction, limit, soft delete; eşzamanlı değişiklikte çakışma mesajı.
- `save_category`, `save_brand`, `reorder_entities`: yetki, döngü ve sıra kontrolü.
- `search_quotes`, `get_quote`, `update_quote(expectedVersion, ...)`, `add_quote_note`, `transition_quote`: satış yetkisi ve geçerli geçiş kontrolü; geçmiş aynı transaction.
- `search_customers`, `get_customer`, `save_customer`, `merge_customers`: kimlik birleştirme yalnızca admin onayıyla.
- `save_settings`, `search_audit`, `list_staff`: admin. Kullanıcı daveti/rol işlemi Edge Function; istemci Auth admin API kullanmaz.

## 5. Teklif güvenliği ve işleyiş

Ziyaretçi → `submit-quote` → CORS allowlist + gövde/uzunluk sınırları + honeypot + captcha sunucu doğrulaması + atomik hız sınırı → tek transaction'da talep/kalemler/outbox → yalnızca talep numarası. Aynı requestKey tekrar gönderildiğinde ikinci kayıt oluşmaz. Aynı key ile farklı payload hata verir. Talep müşterisi tarayıcıdan ürün adı/fiyat/rol enjekte edemez; ürün snapshot'ı sunucudan alınır. Sepetsiz serbest metin talebi de mevcut davranışa uygun desteklenir.

Servis anahtarı, captcha secret, HMAC secret ve mail sağlayıcısı anahtarı yalnızca Supabase Function secrets'ta. Public ve admin `.env` dosyalarında sadece public URL/publishable key bulunur. Servis anahtarı için VITE_ değişkeni yoktur. Yönetim daveti, PDF ve bildirim işlevleri JWT + DB rolü kontrol eder. Kullanıcıya hassas DB hatası gösterilmez.

Bildirim etkinliği gizli integration ayarlarında; e-posta işleyicisi outbox, tekrar deneme ve çifte gönderim kontrolü kullanır. Tarayıcı kapalıyken bildirim garantisi için zamanlanmış sunucu işleyicisi gerekir. WhatsApp/mailto düğmeleri taslak açar; gönderildi bilgisi kendiliğinden yazılmaz. Otomatik e-posta yanıtı ayrı kayıtlı sunucu gönderimi ve kullanıcı işlemiyle olur.

PDF'de şirket logosu, müşteri, satırlar, vergi/iskonto, toplam, para birimi ve geçerlilik bulunur. Türkçe karakterler desteklenir. İstemci toplamına güvenilmez; decimal hesaplama sunucudadır. Fiyatlandırılmamış satır varken kesin teklif PDF'i üretilmez. PDF, müşteri iletişim bilgileriyle birlikte public medyaya konmaz.

## 6. Panel deneyimi ve veri bütünlüğü

Ana yeşil #00893d; mevcut Noto Sans yazı ailesi. Beyaz yüzey, açık gri arka plan, koyu metin, belirgin focus. “Gücün Kesintisiz Hali” panel kimliğinde kullanılır; public slogan bu plan aşamasında değiştirilmez. Sidebar masaüstünde daraltılır, mobilde odak kilitli drawer olur. Üst bar araması rolün erişebildiği ürün/teklif/müşterileri arar. Satış rolünde ürün araması salt okunurdur.

Tablolar sunucuda filtrelenir/sıralanır; 111.952 kayıt tarayıcıya komple indirilmez. Toplu işlemde seçili kayıtlar ve tüm filtre sonuçlarını seçme ayrı ve açık gösterilir. Yükleniyor, boş, hata, tekrar dene, onay ve toast durumları Türkçe. Kaydedilmemiş değişiklik uyarısı, draft kurtarma ve optimistic lock kullanılır. Zod + React Hook Form istemcide, eşdeğer doğrulama sunucuda yapılır.

CSV/Excel: dosya/satır boyutu sınırı, kolon eşleme, önizleme, satır bazında hata ve indirilebilir rapor. Geçerli satırları da kullanıcı onayı olmadan yazmaz. SKU+marka veya mevcut ID ile güncelleme; belirsiz eşleşme reddedilir. Import tekrarında kopya oluşmaz. Export'ta formül enjeksiyonu önlenir. Büyük import partiler/checkpoint/job ile yürür.

Görseller sürükle-bırak ve klavyeli alternatifle sıralanır. Dosya imzası/MIME/boyut kontrol edilir; EXIF temizliği ve gerçek WebP boyutlandırma güvenilir işlemciyle tamamlanmadan yayınlanmaz. SVG/HTML yüklemesi kabul edilmez. Orijinaller özel bucket, yayımlanan türevler ayrı bucket. Mevcut temizlenmiş ürün fotoğrafları korunur; yeni ürünlere alakasız fotoğraf atanmaz.

Dashboard: bugünkü/haftalık talep, bekleyenler, en çok istenen ürünler, son talepler ve düşük stok. Editör müşteri/teklif metrikleri görmez; katalog özeti görür. Veri yokken sıfır/boş durum açık belirtilir. Temel işlerde dekoratif video/3D veya sürekli animasyon kullanılmaz; klavye, azaltılmış hareket, erişilebilirlik ve mobil iş akışları önceliklidir.

## 7. Public site entegrasyonunda gereken değişiklikler

1. Mevcut Supabase repository ve published-only RPC'ler korunur; şema alanlarıyla tip sözleşmeleri eşleştirilir.
2. `QuoteRequest.jsx` Node `/api/quotes` yerine Supabase `submit-quote` endpoint'ini seçer; mevcut WhatsApp, indirme ve sepet davranışı korunur.
3. Müşteri adı ve firma ayrı alanlar yapılır; telefon/e-posta doğrulaması, captcha, KVKK metni ve açık gönderim durumları eklenir.
4. Admin bağlantıları ayrı `/admin/` uygulamasına gider; eski hash bağlantısı yönlendirilir. Auth callback allowlist buna göre ayarlanır.
5. Mevcut tek seferlik importer yeni katalog dahil çalışmaya devam eder. Canlıya aktarılmış veriye baştan seed uygulanmaz; artımlı değişiklikler ayrı job ile.
6. `VITE_DATA_SOURCE=supabase` ancak proje kurulup aktarım/doğrulama tamamlandıktan sonra açılır. Mod seçiminin ilk değişimi deploy gerektirir; sonrasında içerik değişiklikleri deploy gerektirmez.
7. İçerik revizyonu/polling aboneliği korunur; kapalı sekmeden dönüşte yenileme yapılır. Yönetici oturumu public okuma istemcisine taşınmaz.
8. Pages workflow iki uygulamayı paketler; DB migration otomatik public deploy'da çalıştırılmaz.

## 8. Onaylı adımlar ve kabul ölçütleri

Her adım sonunda tam dosya içerikleri dosya olarak ve dosya listesiyle teslim edilir; eksik snippet verilmez. Kullanıcı onayı olmadan sonraki adıma geçilmez.

1. **Şema + Auth:** 005/006'yı test edilmiş migration'a dönüştürme, rol ve RPC altyapısı, ayrı admin uygulamasında giriş/koruma, ilk admin CLI, ortam kılavuzu. Anonim/editör/satış/admin olumsuz RLS testleri, son admin, parola dönüşü ve oturum iptali.
2. **Layout + dashboard:** sidebar/topbar, Türkçe durumlar, gerçek veri metrikleri. Mobil/klavye ve tarih sınırı testleri.
3. **Ürünler:** CRUD, teknik alanlar, medya/PDF, arama/filtre, toplu işlem ve CSV/Excel. Çakışma, bozuk dosya, import tekrar/geri alma testleri.
4. **Kategori/marka:** ağaç/sıralama, logo; döngü ve kullanımda silme koruması.
5. **Teklifler:** güvenli public kayıt backend'i, satış akışı, not/fiyat/PDF, iletişim ve bildirim. Idempotency, spam, rol ve müşteri gizliliği testleri. Public bileşenin bağlanması 7. adımda.
6. **Müşteri/ayar/log/kullanıcı:** geçmiş, aday eşleştirme, içerik ayarları, rol yönetimi ve audit; yetkisiz erişim testleri.
7. **Public entegrasyon:** form/okuma/menü geçişi; eski rotalar, sepet, ürün kimlikleri ve mevcut tasarım regresyonu.
8. **Deploy:** önce staging, yedek ve geri dönüş; kullanıcı onayıyla Pages+Supabase kurulum/yayın, canlı doğrulama. Supabase projesi ve captcha/e-posta hesabı bu aşamaya kadar gerekir; sırlar sohbete yazılmaz.

## 9. Beceri kullanımı

Yüklenen becerilerin tüm ana talimatları gözden geçirildi. Bu işte cloud runtime ile repo incelemesi; premium-web-experience-director tasarım sistemi, mimari ve kalite kontrolü uygulanır. KIVANC ve premium-brand yönergelerinin tutarlılık/ürün doğruluğu ilkeleri korunur. Onboarding becerisi yeni ortam kurulumu gerektirmedi; cloud desktop bu şema incelemesinde tarayıcı etkileşimi gerektirmedi. İtfaiyeci reklamı, kıyafet animasyonu, dikey klip ve sinematik video üretimi becerileri bu işin kapsamına uymuyor; kredi harcanmaz, medya üretilmez veya hosting değiştirilmez. Beceri önerileri kullanıcının React/TypeScript, adım adım onay ve mevcut tasarımı koruma talimatlarını değiştirmez.

## İnceleme / test sınırı

Bu teslim yalnızca doküman ve SQL taslağıdır. SQL dosyaları uygulanmadı, yeni UI üretilmedi, yeni test sonucu veya production-ready bitmiş panel iddiası yoktur. Mevcut SQL kopyalarının kaynaklarla birebir eşliği ve diff whitespace kontrolü doğrulanır. 1. adıma geçmek için bu mimari ve rol matrisinin onayı beklenir.
