import React,{useEffect,useState} from 'react';
import {LockKeyhole,LogOut,RefreshCw,Mail} from 'lucide-react';
import {configuration,getSupabaseClient} from '../supabase/client';
import {consumeAuthCallback} from '../supabase/callback';
import {authRedirectUrl} from '../supabase/config';
import {authError,staffAccess,signIn} from '../supabase/auth-service';
import '../admin.css';
import './auth.css';

export default function SupabaseAdmin(){
 const client=getSupabaseClient();
 const [callback]=useState(consumeAuthCallback);
 const [session,setSession]=useState(null),[member,setMember]=useState(null),[checking,setChecking]=useState(Boolean(client));
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[newPassword,setNewPassword]=useState('');
 const [error,setError]=useState(callback.error),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[recovery,setRecovery]=useState(Boolean(callback.kind)&&!callback.error),[retry,setRetry]=useState(0);
 useEffect(()=>{
  if(!client)return;let active=true;
  const {data}=client.auth.onAuthStateChange((event,value)=>{if(active){setSession(value);setChecking(Boolean(value));if(event==='PASSWORD_RECOVERY')setRecovery(true)}});
  client.auth.getSession().then(({data,error})=>{if(active){if(error)setError(authError(error));setSession(data.session);if(!data.session)setChecking(false)}}).catch(()=>{if(active){setError('Oturum kontrol edilemedi. Tekrar deneyin.');setChecking(false)}});
  return()=>{active=false;data.subscription.unsubscribe()};
 },[client,retry]);
 useEffect(()=>{
  if(!session){setMember(null);return}let active=true;setChecking(true);setError(current=>callback.error&&current===callback.error?current:'');
  staffAccess(client).then(value=>{if(active)setMember(value)}).catch(e=>{if(active){setMember(null);setError(e.status===401?'Oturumunuz sona erdi. Tekrar giriş yapın.':'Yetki doğrulanamadı. Bağlantınızı kontrol edip tekrar deneyin.')}}).finally(()=>{if(active)setChecking(false)});
  return()=>{active=false};
 },[session,client,retry]);
 // Check current DB roles on refocus, so a removed editor is not left with stale UI access.
 useEffect(()=>{const refresh=()=>{if(document.visibilityState==='visible'&&session)setRetry(x=>x+1)};document.addEventListener('visibilitychange',refresh);return()=>document.removeEventListener('visibilitychange',refresh)},[session]);
 async function submit(event){event.preventDefault();setBusy(true);setError('');setNotice('');try{await signIn(client,email,password);setPassword('')}catch(e){setError(authError(e))}finally{setBusy(false)}}
 async function logout(){setBusy(true);setError('');try{const {error}=await client.auth.signOut();if(error)throw error;setSession(null);setMember(null);setRecovery(false);setPassword('')}catch(e){setError(authError(e))}finally{setBusy(false)}}
 async function reset(){if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){setError('Şifre bağlantısı için geçerli e-posta adresinizi yazın.');return}setBusy(true);setError('');try{const {error}=await client.auth.resetPasswordForEmail(email.trim(),{redirectTo:authRedirectUrl(window.location,import.meta.env.BASE_URL,'recovery')});if(error)throw error;setNotice('Hesap uygunsa şifre yenileme bağlantısı e-posta adresinize gönderilecektir.')}catch(e){setError(authError(e))}finally{setBusy(false)}}
 async function savePassword(event){event.preventDefault();setBusy(true);setError('');try{if(newPassword.length<12)throw Error('minimum');const {error}=await client.auth.updateUser({password:newPassword});if(error)throw error;setNewPassword('');setRecovery(false);setNotice('Şifreniz güncellendi.')}catch(e){setError(newPassword.length<12?'En az 12 karakterli bir şifre seçin.':authError(e))}finally{setBusy(false)}}
 if(!configuration.configured)return <section className="admin-login container"><div><LockKeyhole size={30}/><h1>Yönetim paneli kurulumu</h1><p>{configuration.error||'Supabase proje bağlantısı henüz tanımlanmadı. Ziyaretçi sitesi mevcut katalogla çalışmaya devam ediyor.'}</p>{callback.error&&<p role="alert" className="quote-error">{callback.error}</p>}<p>Kurulum adımları README ve Faz 1 kılavuzunda yer alıyor.</p><a className="primary" href="#/">Ana sayfaya dön</a></div></section>;
 if(checking)return <section className="container admin-page" role="status"><h1>Yönetim paneli</h1><p>Oturum ve yetkiniz doğrulanıyor…</p></section>;
 return <section className="admin-login container"><div><LockKeyhole size={30}/><span className="section-tag">RULMAN TEKLİF</span><h1>{session?(recovery?'Şifrenizi belirleyin':member?'Yetkili oturum':'Erişim yetkisi bulunamadı'):'Yönetici girişi'}</h1>
 {error&&<p className="quote-error" role="alert">{error}</p>}{notice&&<p className="admin-auth-notice" role="status">{notice}</p>}
 {!session?<form onSubmit={submit}><fieldset disabled={busy}><label>E-posta<input type="email" autoComplete="username" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Şifre<input type="password" autoComplete="current-password" required maxLength={256} value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="primary" disabled={busy}>{busy?'Giriş yapılıyor…':'Giriş yap'}</button><button className="admin-auth-secondary" type="button" onClick={reset}><Mail size={16}/> Şifremi unuttum</button></fieldset></form>:<>
  {recovery?<form onSubmit={savePassword}><label>Yeni şifre<input type="password" autoComplete="new-password" minLength={12} maxLength={256} required value={newPassword} onChange={e=>setNewPassword(e.target.value)}/></label><button className="primary" disabled={busy}>Şifreyi kaydet</button></form>:member?<><p><b>{member.role==='admin'?'Admin':'Editör'}</b> yetkisi doğrulandı.</p><p>Faz 1: giriş ve güvenlik altyapısı hazır. Yönetim modülleri sonraki onaylı fazlarda eklenecek.</p></>:<p>Bu hesapta etkin admin veya editör rolü yok. Yetkili bir yöneticinin erişim tanımlaması gerekiyor.</p>}
  <div className="admin-auth-actions"><button onClick={()=>setRetry(x=>x+1)} disabled={busy}><RefreshCw size={16}/> Yetkiyi tekrar kontrol et</button><button onClick={logout} disabled={busy}><LogOut size={16}/> Çıkış yap</button></div>
 </>}
 <a href="#/">Ana sayfaya dön</a></div></section>;
}
