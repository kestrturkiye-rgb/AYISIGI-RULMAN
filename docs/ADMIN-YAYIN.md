# Ayrı admin adresi

Admin uygulaması `/AYISIGI-RULMAN/admin/#/giris` adresindedir. Eski `#/admin` bağlantısı buraya yönlenir. Bu sürüm mevcut canlı katalog ve içerikleri korur; henüz yayımlanmamış katalog genişletmesi veya public Supabase veri geçişini içermez.

`apps/admin` React/TypeScript/Tailwind/HashRouter kaynağıdır. `npm run build -- --base=/AYISIGI-RULMAN/` önce public uygulamayı, sonra `dist/admin` çıktısını üretir. Mevcut Pages iş akışı değiştirilmeden bu çıktıyı yayınlar.

Supabase projesi henüz bağlı değilse kurulum ekranı görünür; sahte giriş veya gömülü şifre yoktur. Gerçek giriş için Supabase Auth kullanıcısı, DB migration'ları ve ilk admin rolü gerekir. `.env.local` dosyasında public proje URL/key tanımlanır. `private` şeması API'ye açılmaz. Supabase redirect allowlist'e `https://kestrturkiye-rgb.github.io/AYISIGI-RULMAN/admin/` eklenir.

GitHub Actions build aşamasına yalnızca `VITE_SUPABASE_URL` ve `VITE_SUPABASE_PUBLISHABLE_KEY` gibi public ayarlar verilir. Mevcut iş akışında bu env alanları henüz yoktur; gerçek proje bağlanırken eklenecektir. Service-role veya DB şifresi istemciye/Pages'e yazılmaz. Yerel test hesapları canlıya taşınmaz.

Şema dosyaları `supabase/migrations` altındadır; kendiliğinden çalışmaz. `npm run supabase:migrate -- --apply --confirm-project PROJE_KIMLIGI`, ardından Auth içinde önceden oluşturulmuş kullanıcıya `npm run supabase:bootstrap -- --apply --confirm-project PROJE_KIMLIGI --user-id UUID` uygulanır. Veritabanı sırları güvenilir operatör ortamında kalır. Rol verme CLI: `scripts/supabase/set-staff-role.mjs`.

Bu aşama yalnızca giriş ve güvenlik altyapısıdır. Dashboard/CRUD/teklif yönetimi sonraki onaylı adımlardır.
