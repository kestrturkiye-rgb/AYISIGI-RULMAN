# Faz 1 — Supabase şeması, RLS, giriş ve ilk aktarım

Bu fazın çıktıları yerel olarak hazırlanmıştır. Gerçek Supabase projesi henüz oluşturulmadığından canlı veritabanına migration, Auth hesabı veya Storage yüklemesi yapılmaz. Ziyaretçi sitesi hâlâ mevcut statik kataloğu kullanır. Supabase'ten site verisi okuma Faz 2'dir; katalog editörleri, teklif uç noktası ve kullanıcı yönetimi sonraki fazlardır.

## Dosyalar

- `supabase/migrations/202611020001_core.sql`: katalog, medya, içerik, özel fiyat/teklif/personel ve aktarım tabloları; ilk migration'dan itibaren kapalı RLS.
- `202611020002_security.sql`: yayın görünürlüğü, rol kontrolleri, son admin koruması, kayıt kimliği/değişiklik geçmişi ve içerik sürümü.
- `202611020003_storage.sql`: özel orijinal dosya ve yayımlanan türev bucket'ları.
- `src/admin/SupabaseAdmin.jsx`: e-posta/şifre girişi, rol doğrulama, oturum yenileme/çıkış ve şifre kurtarma.
- `scripts/supabase/`: migration, ilk admin, dry-run ve kesintiden sürdürülebilen ilk aktarım.

## 1. Proje ve Auth ayarları

Supabase Dashboard'da bir proje oluşturun. Database şifresini/parolalı bağlantı dizesini ve secret/service-role anahtarını sohbete veya Git'e yazmayın. Veritabanı/Storage limitleri ve yedekleme planı gerçek projenin kotasına göre kontrol edilmelidir. İçe aktarım raporu dosya sayısı ve toplam baytı verir; ücretsiz plana kesin sığacağı varsayılmaz.

Auth'ta Email sağlayıcısını açın, herkese açık yeni kullanıcı kaydını kapatın. Önerilen minimum yeni şifre uzunluğu 12 karakterdir. İlk hesabı Dashboard üzerinden oluşturun; herkesin kullanacağı varsayılan bir admin şifresi yoktur.

Site URL ve izin verilen dönüş adresleri, proje tabanını kapsamalıdır:

- `https://kestrturkiye-rgb.github.io/AYISIGI-RULMAN/`
- `https://kestrturkiye-rgb.github.io/AYISIGI-RULMAN/?auth_action=recovery`
- Geliştirmede `http://localhost:5173/` ve aynı adresin `?auth_action=recovery` biçimi.

PKCE dönüşü `?code=…` üzerinden alınır; `#/admin` parçacığı Auth parametreleriyle karıştırılmaz. Kurtarma aynı tarayıcıda tamamlanmalıdır. Projeye özel davet/şifre şablonları token-hash kullanacaksa, invite için `{{ .SiteURL }}?token_hash={{ .TokenHash }}&type=invite`, recovery için `type=recovery` hedefi kullanılabilir. Bağlantı tek sefer doğrulanır ve hassas parametreler uygulama adresinden temizlenir. Eski implicit bağlantılar da Auth `setSession` ile doğrulanır; tokenlar loglanmaz.

## 2. Ortam değişkenleri

`.env.example` dosyasını `.env.local` olarak kopyalayın; örnek dosyadaki sır alanları boş bırakılmıştır. `.env.local` Git tarafından yok sayılır.

```dotenv
VITE_SUPABASE_URL=https://PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=PUBLIC_PUBLISHABLE_KEY

# Yalnızca güvenilir terminal / aktarım:
SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_DB_URL=POSTGRES_CONNECTION_STRING
SUPABASE_SERVICE_ROLE_KEY=SERVER_ONLY_KEY
```

Legacy public anon JWT kullanılıyorsa `VITE_SUPABASE_ANON_KEY`, publishable key yerine kullanılabilir. Public anahtarın tarayıcıda görünmesi normaldir; yetkiyi RLS sağlar. `sb_secret_…`, service-role JWT, veritabanı şifresi ve SMTP sırları **VITE_ değişkeni olamaz**. `npm run build` öncesi kontrol bunları engeller. Anahtarı gizlemek için VITE_ adını kullanmak güvenlik sağlamaz.

Bu fazda `VITE_ADMIN_AUTH_PROVIDER` boş kalır ve Supabase giriş ekranı kullanılır. Eski Node admin sadece açıkça `VITE_ADMIN_AUTH_PROVIDER=legacy` seçilirse çalışır; başarısız Supabase girişi eski şifre sistemine dönmez. Yeni Auth henüz yapılandırılmamışsa panel kurulum durumu gösterir, ziyaretçi sitesi çalışmaya devam eder.

GitHub Pages'in ilerideki yayını için repository **Variables** içinde `VITE_SUPABASE_URL` ve `VITE_SUPABASE_PUBLISHABLE_KEY` tanımlanabilir. Bunlar public değerlerdir. Workflow'da service-role veya DB bağlantısı bulunmaz. Bu bağlantının ilk kez kodda etkinleşmesi bir deploy gerektirir; sonraki içerik güncellemelerinin deploy gerektirmemesi Faz 2'de sağlanacaktır.

## 3. Migration uygulama

Önce üç SQL dosyasını inceleyin ve proje kimliğini doğrulayın. Bu kılavuz güvenilir terminaldeki migration runner'ı kullanır:

```sh
npm ci --no-audit --no-fund
npm run supabase:migrate -- --apply --confirm-project PROJECT_REF
```

Bağlantı türü **Direct** veya **Session Pooler (5432)** olmalıdır. Transaction Pooler (6543), aktarımın oturum kilidi için kullanılmaz ve araç tarafından reddedilir.

Araç `SUPABASE_DB_URL` hedefinin proje adresiyle eşleşmesini ister; uzak bağlantıda TLS sertifika doğrulaması açıktır. Migration başına transaction ve dosya hash kaydı vardır. Aynı dosyaları yeniden çalıştırmak zararsızdır; uygulanmış migration'ın içeriği değişmişse durur. Supabase CLI/SQL Editor ile aynı migration'ları ayrıca uygulayıp iki migration kaydını karıştırmayın. `supabase/tests/bootstrap.sql` yalnızca test ortamı içindir, **gerçek projede çalıştırılmaz**.

Gerçek projede RLS politikaları mevcut Supabase `auth` ve `storage` şemalarını kullanır. `private` şemasını API'nin exposed schemas listesine eklemeyin. İçerik Realtime bildirimi yalnızca `public.content_version` tablosuyla yapılır; teklif ve personel tabloları yayına alınmaz.

## 4. İlk admin

Dashboard'da oluşturulan Auth hesabının UUID değerini alın:

```sh
npm run supabase:bootstrap -- --apply --confirm-project PROJECT_REF --user-id AUTH_USER_UUID
```

Bu komut hesap/şifre oluşturmaz, e-posta göndermez. Yalnızca mevcut hesabı ilk admin yapar. İkinci kez admin başlatamaz; son etkin admin düşürülemez veya devre dışı bırakılamaz. Faz 7'ye kadar diğer roller Dashboard SQL Editor gibi güvenilir yönetim kanalıyla atanır; tarayıcıdan rol seçimi veya kendi kendine yükseltme yoktur.

Admin ve editörlük `private.staff_members` kaydıyla belirlenir. Auth `user_metadata.role` bir yetki kaynağı değildir. Giriş yapmış ama aktif personel rolü olmayan kullanıcı panele alınmaz.

## 5. Dry-run ve tek seferlik aktarım

```sh
npm run supabase:dry-run
```

Bu komut ağ isteği yapmaz; DB/Storage'a yazmaz. `data/supabase-import/<hash>/report.json` üretir. Kimlikler, kategori eşlemeleri, ölçüler ve güncel temiz görsel/türev hash'leri kontrol edilir. Rapordaki marka belirsizliklerini inceleyin. Marka/kod tekrarları otomatik birleştirilmez.

Gerçek uygulama, migration'dan sonra ve rapor incelenince:

```sh
npm run supabase:import -- --apply --upload-media --confirm-project PROJECT_REF
```

- Ürünlerin mevcut `p-…` kimlikleri, kodları, üretici/temel kodları ve sırası korunur. Slug'a kimlik eklenir; aynı kodlu kayıtlar kaybolmaz.
- Kaynak 109.417 ürün, 32 marka değeri ve 26 kategoriden oluşur. Yedi ana grup da kategori ağacına eklenir: toplam 33 kategori düğümü.
- 342.504 teknik özellik ad–değer–birim olarak aktarılır. Kaynakta açıkça ayrılmayan birimler tahmin edilmez; d/D/B sayısal kolonlarda korunur. Bilinmeyen ölçü NULL'dır.
- Fiyat uydurulmaz; başlangıç `price_mode=quote`, stok `on_order` ve özel kalite kaydında `stock_verified=false` olur. Bu alan stok varlığı teyidi değildir.
- Temiz görsel eşlemesi uygulanır. Ham/filigranlı görseller tekrar yayımlanmaz. Dosyalar SHA-256 ile tekilleştirilir; aynı türev farklı boyut/ürün ilişkilerinde paylaşılabilir.
- 10 makale, mevcut üç sabit sayfa, ana sayfa bölümleri, menüler, genel ayarlar ve kaynak JSX'ten çıkarılan arayüz metinleri aktarılır. Ürün sayısı gibi göstergeler ileride veritabanından türetilir.
- Veri kaynağı izleri özel tabloda saklanır; halka açık ürün sorgusunda bulunmaz.
- Storage yükleme tekrarında mevcut dosya üzerine yazılmaz; içerik hash'i doğrulanır. SQL 500 satırlık transaction'larla ilerler. Checkpoint ile kesilen işlem sürer.
- Tamamlanan aynı aktarım tekrarlandığında kayıt çoğalmaz ve sonraki admin düzenlemeleri ezilmez. Tamamlanmış aktarım üzerine farklı kaynak otomatik birleştirilmez.

Storage ve Postgres birlikte tek transaction olamaz. SQL'e bağlanmadan önce proje doğrulanır; dosyalar içerik adresli yüklenir. Kesinti sonrası kullanılmayan dosyalar kalabilir; temizlik medya kullanım kontrolüyle sonraki fazda yapılır. Yayımlanan bucket URL'leri herkese açıktır; taslak/orijinaller bu bucket'a yüklenmez. Kullanıcıların doğrudan public bucket'a yazma veya dosya silme yetkisi yoktur.

## 6. Yerel doğrulama

Önce geçici test PostgreSQL'i başlatın. Trust yalnızca localhost test ortamı içindir:

```sh
docker run --rm --name rt-phase1-postgres -p 127.0.0.1:55432:5432 \
  -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17-alpine
```

Ayrı terminal:

```sh
npm run test:supabase
npm run test:supabase:db
npm run test:site
VITE_STATIC_HOST=true npm run build -- --base=/AYISIGI-RULMAN/
```

DB testleri `rt_phase1_…` adlı geçici veritabanlarını yaratıp sonunda kaldırır. `TEST_POSTGRES_URL` verilirse yalnızca localhost kabul edilir. Üretim bağlantısı test çalıştırıcısında kullanılamaz.

Test bootstrap'ı yalnızca Supabase yönetimindeki şemaların asgari SQL karşılığını sağlar. Gerçek PostgreSQL'de RLS, yetki, görünürlük, kod/ölçü, tam veri aktarımı ve tekrar çalıştırma test edilir. GoTrue e-posta hizmeti ve gerçek bulut Storage bu testte çalışmaz.

Tarayıcı Auth testi gerçek hesap/e-posta kullanmaz; Supabase SDK'sına taklit HTTP yanıtları verir. Örnek test derlemesi:

```sh
VITE_SUPABASE_URL=https://phase1-local-test.supabase.co \
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_phase1_local_test_only \
VITE_STATIC_HOST=true npm run build -- --base=/AYISIGI-RULMAN/ --outDir=/tmp/rt-phase1-auth-preview
npm run preview -- --port 4176 --strictPort --base=/AYISIGI-RULMAN/ --outDir=/tmp/rt-phase1-auth-preview
```

Ayrı terminalde `node tests/supabase-auth.browser.mjs` çalıştırılır. Admin/editör girişi, yanlış şifre, yetkisiz hesap, rol doğrulama hatası, oturum yenileme/çıkış ve şifre kurtarma sınanır. Varsayılan Chromium yoksa Playwright'ın tarayıcısını kurun.

`.github/workflows/verify-supabase.yml` PR veya elle çalıştırmada yerel PostgreSQL testlerini yapar; Supabase projesine bağlanmaz ve deploy etmez.

## Faz sonu sınırı

Bu faz siteyi Supabase verisinden okumaya geçirmez; ürün düzenleme, gerçek teklif gönderimi, davet yönetimi ve dashboard henüz açılmaz. Gerçek proje oluşturulduğunda Auth yönlendirmeleri, Storage ve migration bulutta ayrıca doğrulanmalıdır. Bu fazın onayından önce Faz 2'ye geçilmez.

## Yerel test sonucu

11 giriş/yapılandırma testi, 16 RLS/güvenlik testi ve altı tam aktarım/kurtarma testi geçti. Önceki 52 regresyon testi de geçti. Mevcut site tarayıcı kontrolünde beş ekran genişliği ve 20 erişilebilirlik taramasıyla doğrulandı. Ayrı Auth tarayıcı testinde admin/editör, yetkisiz kullanıcı, oturum, yanlış şifre, şifre kurtarma ve açık oturumla süresi dolmuş bağlantının reddi doğrulandı. Bu son testte sağlayıcı yanıtları taklit edildi; gerçek hesap veya e-posta kullanılmadı.

Tam yerel aktarımda 109.417 kimlik ve 342.504 teknik özellik korundu; iç 20 / dış 47 mm sorgusu 331 ürün döndürdü. Kesilen aktarım checkpoint'ten sürdü ve sonraki düzenlemeleri ezmedi. Ham SQL uygulama sonuçları ve dry-run özeti `docs/SUPABASE-FAZ-1-SONUC.json` içinde kayıtlıdır. Bu rapor bulut kurulumu yapılmış olduğunu ifade etmez.
