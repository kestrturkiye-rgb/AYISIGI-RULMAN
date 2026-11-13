# Admin paneli — 1. adım: şema ve giriş

9 Kasım 2026. Bu adım yerelde tamamlandı; canlıya yayımlanmadı. Dashboard, ürün CRUD ve teklif yönetimi sonraki onaylı adımlardır. Giriş yaptıktan sonra hesabı/rolü gösteren doğrulama ekranı açılır; henüz olmayan modüller çalışıyormuş gibi gösterilmez.

## Şu anda nasıl deneyebilirsiniz?

Bu çalışma ortamında gerçek yerel Supabase Auth + PostgreSQL test servisi başlatıldı:

**Çalışma ortamının tarayıcısında:** `http://127.0.0.1:4180/admin/#/giris`

Geçici hesaplar: `/tmp/rt-admin-local-test/accounts.json`. Admin, editör, satış ve yetkisiz hesapların her birinin ayrı, rastgele üretilmiş şifresi bu dosyadadır. Dosya repoya/ZIP'e eklenmez. Gerçek müşteri verisi yoktur. Bu adres sizin bilgisayarınızdaki localhost veya canlı GitHub Pages adresi değildir; bu çalışma ortamının tarayıcısında açılmalıdır. Ortam kapanınca test servisi durabilir. Bu oturumda paylaşılan Chrome'u açan araç sunulmadığı için tarayıcı paneli otomatik açılamadı; otomatik Chromium testleri gerçek yerel servisi kullandı.

Test edin:

1. `admin@rulman.local` ve dosyadaki şifreyle giriş yapın. “Oturumunuz doğrulandı / Admin” görünmeli.
2. Sayfayı yenileyin; oturum korunmalı. İkinci sekmede paneli açın; bir sekmeden çıkınca diğerinde de giriş ekranına dönmeli.
3. `editor@rulman.local` ve `sales@rulman.local` ile kendi rollerini görün.
4. `unassigned@rulman.local` giriş yapabilir ama panele erişemez.
5. Yanlış şifreyi ve mobil görünümü deneyin.

Sarı “YEREL TEST ORTAMI” çubuğu ortamı ayırt eder. Bu bir arayüzde sahte giriş düğmesi değildir: e-posta/şifre Supabase'in resmi GoTrue servisiyle doğrulanır; rol gerçek PostgreSQL RLS/RPC üzerinden okunur. Yerel ağ geçidi yalnızca Auth + `get_staff_access` akışını destekler, tam Supabase emülatörü değildir. E-posta teslimi yoktur; “Şifremi unuttum” bağlantısı burada gerçek e-posta göndermez. Gerçek recovery token ile şifre değiştirme otomatik test edildi.

## Aynı yerel ortamı yeniden başlatma

Node.js 24+, Docker ve boş 4180/4182/9999/55432 portları gerekir.

```bash
npm ci --no-audit --no-fund
npm run dev:admin:local
```

Script yalnızca `rt-admin-step1-db` ve `rt-admin-local-auth` adlı yerel konteynerleri kullanır; PostgreSQL/GoTrue portları loopback'e bağlanır. `rt_admin_local_auth` veritabanını oluşturur. Aynı `/tmp/rt-admin-local-test/` dururken yeniden başlatma hesapları korur; Ctrl+C Auth ve Vite servislerini durdurur. PostgreSQL test konteyneri sonraki testler için kalır. Yarıda kalmış kurulumda logları inceleyin; bu DB ve dosyalar sadece test verisidir. Başka veritabanlarını silmeyin. `POSTGRES_HOST_AUTH_METHOD=trust` yalnızca bu geçici, loopback'e bağlı test içindir; canlı kurulumda kullanılmaz.

İlk kurulumda resmi `supabase/gotrue:v2.177.0` imajı Docker üzerinden indirilir. Docker daemon çalışır durumda olmalıdır. Linux testinde Chromium yolu `/usr/bin/chromium`; farklı sistemlerde test dosyalarındaki executablePath uyarlanmalıdır.

## Gerçek Supabase projesi kurulumu

1. Supabase projesi oluşturun. Auth içinden yönetici e-postanızı ve güçlü şifrenizi tanımlayın; public signup kapalı olsun. Şifreyi/servis anahtarını sohbete göndermeyin.
2. Repoda `.env.example` dosyasından **`.env.local`** oluşturun. `VITE_SUPABASE_URL` ve `VITE_SUPABASE_PUBLISHABLE_KEY` public ayarlardır. `SUPABASE_URL`, `SUPABASE_DB_URL` ve gerekirse importer için `SUPABASE_SERVICE_ROLE_KEY` yalnızca güvenilir CLI ortamında bulunur. Service key hiçbir VITE_ değişkenine yazılmaz.
3. Supabase redirect allowlist'e `https://kestrturkiye-rgb.github.io/AYISIGI-RULMAN/admin/` ekleyin. Yerel proje testlerinde `http://localhost:4180/admin/` ve `http://127.0.0.1:4180/admin/` eklenebilir. Eski kök callback yerine yeni admin adresini kullanın; eski davet/yenileme bağlantılarını yeniden üretin.
4. Auth e-posta SMTP teslimini sağlayıcınızla yapılandırın; canlıya geçmeden davet/parola yenileme e-postasını gerçek posta kutusunda doğrulayın.
5. Migration'ları uygulayın; önceden uygulanmış dosyalar hash kontrolüyle atlanır:

```bash
npm run supabase:migrate -- --apply --confirm-project PROJE_KIMLIGI
npm run supabase:bootstrap -- --apply --confirm-project PROJE_KIMLIGI --user-id AUTH_KULLANICI_UUID
```

İlk admin bootstrap ikinci kez çalışmaz. Son etkin admin rolü kaldırılamaz. İlk admin oluşturulduktan sonra diğer Auth kullanıcılarına güvenilir operatör CLI ile rol verilebilir:

```bash
node --env-file-if-exists=.env.local scripts/supabase/set-staff-role.mjs --apply --confirm-project PROJE_KIMLIGI --user-id AUTH_KULLANICI_UUID --role sales
```

`--role` admin/editor/sales olabilir. Kullanıcı daveti ve panelden rol yönetimi 6. adımda yapılacak. CLI rol değişikliği audit'e operatör işlemi olarak kaydolur; web kullanıcı kimliği uydurulmaz.

6. `private` şemasını Data API exposed schemas listesine EKLEMEYİN. Supabase varsayılan public/storage yapılandırmasını koruyun. Public site varsayılan static modda kalır; şema kurulması tek başına public veriyi değiştirmez.
7. Build: `npm run build:pages -- --base=/AYISIGI-RULMAN/`. Sonuç `dist/` ve `dist/admin/`. Bu komut deploy yapmaz. Pages workflow iki uygulamayı birleştirecek şekilde güncellendi ama push/yayın yapılmadı.

Vite çalışma komutları kökten çalıştırılır; iki uygulama aynı kök `.env.local` public ayarlarını okur. `npm run dev:admin` gerçek Supabase projesi için normal geliştirme sunucusudur. Proje ayarı yoksa yönlendirici güvenli kurulum ekranı gösterir; giriş/rol yetkisi uydurmaz.

## Neler değişti?

- Ayrı `apps/admin` React/TypeScript/Vite/HashRouter uygulaması, izole Tailwind CSS, mevcut Noto Sans ve logo, #00893d tema, Türkçe giriş ekranı ve mobil düzen.
- Zod + React Hook Form, alan hata açıklamaları, şifre göster/gizle, yükleniyor ve güvenli hata durumları.
- Doğrulanmış Auth kullanıcısı + DB rolü ile korumalı rota. Rol Auth metadata'dan alınmaz. Sekmeler arası çıkış; focus ve periyodik rol yenileme. Ağ/rol hatasında erişim kapanır. İstek zaman aşımı vardır.
- PKCE code, recovery ve invite callback akışları; işlem sonrası URL'den token temizliği. Gerçek recovery ve tekrar kullanılan token reddi test edildi; gerçek e-posta teslimi ve gerçek bulut PKCE/davet e-postası henüz doğrulanmadı.
- Yeni migration 005: sales, won, lost enum değerleri. 006: müşteri, teklif fiyatlandırma alanları, durum geçmişi, stok, bildirim/PDF/spam altyapısı ve RLS. 005 ayrı transaction olarak tamamlanır; çalıştırıcı yönetir. Mevcut 001..004 değiştirilmedi.
- Satış: canlı katalog okuma + ticari kayıt okuma; katalog yazamaz. Editör: katalog/içerik; müşteri/teklif okuyamaz. Admin tüm ilgili okumalar. Ticari mutasyonlar henüz dışarı açılmadı; doğrulamalı backend 5/6. adımda gelir. SQL tek başına CRUD UI değildir.
- Yeni özel PDF bucket ve özel spam tablosu. Ürün fotoğrafları/katalog kimlikleri değişmedi. Public teklif gönderimi bu aşamada Supabase'e açılmadı.
- Eski `#/admin` yeni `/admin/#/giris` adresine yönlenir. Açıkça legacy Node auth seçilmiş kurulumlar eski davranışı korur.
- CI ve Pages build komutu ayrı admin derlemesini içerir. Yerel test modu production build'de reddedilir; test hesapları derlemeye girmez.

## Doğrulama

```bash
npm run test:admin
npm run test:admin:db
npm run test:supabase:db
npm run test:admin:browser
node tests/admin/recovery.browser.mjs
node tests/supabase-auth.browser.mjs
npm run build:pages -- --base=/AYISIGI-RULMAN/
npm run preview -- --port 4173 --strictPort --base=/AYISIGI-RULMAN/
# ayrı terminal:
npm run test:browser
```

`test:admin:db` ve eski Supabase DB testleri yerel 55432 PostgreSQL'de geçici test DB'leri oluşturup siler. Cloud DB üzerinde çalışmaz. Browser gerçek-Auth testleri yerel test servisi açıkken çalıştırılır. Recovery testi yalnızca yerel editör şifresini yeniler ve accounts.json dosyasını günceller.

Sonuçlar `validation.json` dosyasında. `files.json` bu adımda değişen/oluşan tam dosyaları ve hash'lerini listeler. Tam dosya içerikleri ZIP olarak ayrıca teslim edilir; `.env.local`, servis sırları ve geçici hesaplar ZIP'te yoktur.

## Sonraki onay noktası

Bu adım yalnızca şema + Auth'tur. Gerçek bulut bağlantısı, e-posta teslimi ve deploy doğrulanmış değildir. Yerel girişi deneyip onayladığınızda **2. adım: layout + dashboard** başlar.
