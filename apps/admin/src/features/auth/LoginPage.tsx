import {useState} from 'react';
import logo from '../../../../../public/brand/rulman-teklif.webp';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {loginSchema,passwordSchema,type LoginValues,type PasswordValues} from '@rt/contracts';
import {ArrowUpRight,Eye,EyeOff,LockKeyhole,LogOut,Mail,RefreshCw} from 'lucide-react';
import {Navigate} from 'react-router-dom';
import {client,config,publicUrl,returnUrl} from '../../lib/config';
import {authMessage} from '../../lib/errors';
import {useAuth} from './AuthProvider';
import {roleNames} from '../../app/permissions';

export function Brand(){return <a className="brand" href={publicUrl()}><img className="brand-icon" src={logo} alt="" width="40" height="40"/><span>RULMAN <b>TEKLİF</b><small>Gücün Kesintisiz Hali</small></span></a>;}
export function LoginPage(){
 const auth=useAuth();
 const [visible,setVisible]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[resetting,setResetting]=useState(false);
 const {register,handleSubmit,formState:{errors,isSubmitting},getValues,trigger}=useForm<LoginValues>({resolver:zodResolver(loginSchema),defaultValues:{email:'',password:''}});
 const busy=isSubmitting||resetting;
 async function submit(values:LoginValues){
  if(!client)return;setError('');setNotice('');
  try{const {error}=await client.auth.signInWithPassword(values);if(error)throw error;}
  catch(e){setError(authMessage(e));}
 }
 async function reset(){
  if(!client||!await trigger('email'))return;
  setResetting(true);setError('');setNotice('');
  try{const {error}=await client.auth.resetPasswordForEmail(getValues('email').trim(),{redirectTo:returnUrl('recovery')});if(error)throw error;setNotice('Hesap uygunsa şifre yenileme bağlantısı e-posta adresinize gönderilecektir.');}
  catch(e){setError(authMessage(e));}finally{setResetting(false);}
 }
 if(auth.loading)return <Loading/>;
 if(auth.session&&auth.passwordRequired)return <PasswordPage/>;
 if(auth.member&&!auth.error)return <Navigate to="/" replace/>;
 return <AuthFrame>
  <span className="eyebrow">YÖNETİM MERKEZİ</span><h1>{!config.configured?'Panel bağlantısını kurun':auth.session?'Erişim kontrolü':'Yönetim paneline giriş'}</h1>
  <p className="intro">{!config.configured?'Giriş ekranı hazır. Güvenli oturum açmak için Supabase proje bağlantısı gerekiyor.':auth.session?'Bu hesap için yetki doğrulaması gerekiyor.':'Ürünlerinize, içeriklerinize ve teklif süreçlerinize tek yerden erişin.'}</p>
  {(error||auth.error)&&<p className="alert error" role="alert">{error||auth.error}</p>}
  {notice&&<p className="alert success" role="status">{notice}</p>}
  {!config.configured?<><div className="setup"><h2>Bağlantı henüz tanımlanmadı</h2><p>{config.error||'Proje yöneticisi Supabase URL ve public anahtarını .env.local dosyasına eklemeli. Şifre veya service-role anahtarı bu ekrana girilmez.'}</p><ol><li>Supabase projesini oluşturun.</li><li>Migration ve ilk admin kurulumunu çalıştırın.</li><li>Paneli proje ayarlarıyla yeniden derleyin.</li></ol></div><a className="primary" href={publicUrl()}>Siteye dön <ArrowUpRight size={17}/></a></>:auth.session?<><p className="alert">{auth.error?'Bağlantı yeniden doğrulanana kadar panel erişimi kapalı.':'Bu hesapta etkin admin, editör veya satış rolü bulunmuyor. Yöneticinizden erişim isteyin.'}</p><div className="actions"><button className="primary" onClick={auth.refresh}><RefreshCw size={17}/>Tekrar kontrol et</button><button className="secondary" onClick={()=>void auth.logout().catch(e=>setError(authMessage(e)))}><LogOut size={17}/>Çıkış yap</button></div></>:<form onSubmit={handleSubmit(submit)} noValidate>
   <fieldset disabled={busy}>
    <label htmlFor="email">E-posta adresi</label><input id="email" type="email" autoComplete="username" placeholder="adiniz@firma.com" aria-invalid={!!errors.email} aria-describedby={errors.email?'email-error':undefined} {...register('email')}/>
    {errors.email&&<p className="field-error" id="email-error">{errors.email.message}</p>}
    <label htmlFor="password">Şifre</label><div className="password"><input id="password" type={visible?'text':'password'} autoComplete="current-password" aria-invalid={!!errors.password} aria-describedby={errors.password?'password-error':undefined} {...register('password')}/><button type="button" aria-label={visible?'Şifreyi gizle':'Şifreyi göster'} onClick={()=>setVisible(!visible)}>{visible?<EyeOff size={19}/>:<Eye size={19}/>}</button></div>
    {errors.password&&<p className="field-error" id="password-error">{errors.password.message}</p>}
    <button className="primary submit" type="submit">{isSubmitting?'Giriş yapılıyor…':<><LockKeyhole size={18}/>Giriş yap</>}</button>
    <button className="reset" type="button" onClick={()=>void reset()}><Mail size={16}/>{resetting?'Bağlantı gönderiliyor…':'Şifremi unuttum'}</button>
   </fieldset>
  </form>}
  <p className="security-note"><LockKeyhole size={14}/> Erişim, hesabınıza tanımlı görev ve yetkilerle sınırlıdır.</p>
 </AuthFrame>;
}
export function AuthFrame({children}:{children:React.ReactNode}){return <main className="auth-shell">{import.meta.env.VITE_ADMIN_LOCAL_TEST==='true'&&<aside className="local-test-banner" role="note">YEREL TEST ORTAMI · Gerçek müşteri verisi yoktur · E-posta teslimi kapalı</aside>}<section className="auth-story"><Brand/><div><span className="eyebrow">RULMAN TEKLİF / B2B</span><h2>İşin gücü,<br/>kontrolün sizde.</h2><p>Endüstriyel ürünler ve teklif süreçleri için güvenli yönetim alanı.</p><div className="story-lines"><span>01 <b>Katalog</b></span><span>02 <b>Teklifler</b></span><span>03 <b>Müşteriler</b></span></div></div><small>Yalnızca yetkili personel erişimi</small></section><section className="auth-content"><div className="mobile-brand"><Brand/></div><div className="auth-card">{children}</div><a className="back-link" href={publicUrl()}>← Rulman Teklif sitesine dön</a></section></main>;}
export function Loading(){return <main className="loading" role="status"><span className="spinner"/>Oturum ve yetkiniz doğrulanıyor…</main>;}
export function PasswordPage(){
 const auth=useAuth();const [error,setError]=useState('');
 const {register,handleSubmit,formState:{errors,isSubmitting}}=useForm<PasswordValues>({resolver:zodResolver(passwordSchema)});
 async function submit(values:PasswordValues){if(!client)return;setError('');try{const {error}=await client.auth.updateUser({password:values.password});if(error)throw error;auth.passwordDone();auth.refresh();}catch(e){setError(authMessage(e));}}
 return <AuthFrame><span className="eyebrow">GÜVENLİ HESAP</span><h1>Şifrenizi belirleyin</h1><p className="intro">En az 12 karakter kullanın. Şifrenizi başka hesaplarınızda kullanmayın.</p>{error&&<p className="alert error" role="alert">{error}</p>}<form onSubmit={handleSubmit(submit)} noValidate><fieldset disabled={isSubmitting}><label htmlFor="new-password">Yeni şifre</label><input id="new-password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} aria-describedby={errors.password?'new-password-error':undefined} {...register('password')}/>{errors.password&&<p className="field-error" id="new-password-error">{errors.password.message}</p>}<label htmlFor="confirm-password">Şifreyi tekrar girin</label><input id="confirm-password" type="password" autoComplete="new-password" aria-invalid={!!errors.confirmation} aria-describedby={errors.confirmation?'confirmation-error':undefined} {...register('confirmation')}/>{errors.confirmation&&<p className="field-error" id="confirmation-error">{errors.confirmation.message}</p>}<button className="primary submit">{isSubmitting?'Kaydediliyor…':'Şifreyi kaydet'}</button></fieldset></form><button className="reset" onClick={()=>void auth.logout().catch(e=>setError(authMessage(e)))}>Çıkış yap</button></AuthFrame>;
}
export function AccessPage(){
 const auth=useAuth();const [error,setError]=useState('');
 return <AuthFrame><span className="eyebrow">ADIM 1 / GİRİŞ VE YETKİ</span><h1>Oturumunuz doğrulandı</h1><p className="intro">Hesabınız yönetim paneline erişebilir.</p><dl className="account"><div><dt>Hesap</dt><dd>{auth.session?.user.email}</dd></div><div><dt>Yetki</dt><dd>{auth.member&&roleNames[auth.member.role]}</dd></div></dl><div className="alert success" role="status">Giriş ve güvenlik altyapısı hazır. Dashboard ve yönetim modülleri sonraki onaylı adımlarda eklenecek.</div>{error&&<p className="alert error" role="alert">{error}</p>}<div className="actions"><button className="secondary" onClick={auth.refresh}><RefreshCw size={17}/>Yetkiyi yenile</button><button className="primary" onClick={()=>void auth.logout().catch(e=>setError(authMessage(e)))}><LogOut size={17}/>Çıkış yap</button></div></AuthFrame>;
}
