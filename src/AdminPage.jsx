import React,{useEffect,lazy,Suspense} from 'react';
const LegacyAdmin=lazy(()=>import('./admin/LegacyAdminPage'));
export default function AdminPage(){
 const legacy=import.meta.env.VITE_ADMIN_AUTH_PROVIDER==='legacy';
 const target=import.meta.env.BASE_URL+'admin/#/giris';
 useEffect(()=>{if(!legacy)window.location.replace(target)},[legacy,target]);
 if(legacy)return <Suspense fallback={<p role="status">Giriş ekranı yükleniyor…</p>}><LegacyAdmin/></Suspense>;
 return <section className="admin-page container"><h1>Yönetim paneli</h1><p role="status">Güvenli giriş sayfasına yönlendiriliyorsunuz…</p><a href={target}>Yönetim panelini aç</a></section>;
}
