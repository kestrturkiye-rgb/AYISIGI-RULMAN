import {useEffect,useRef,useState} from 'react';
import {NavLink,Outlet,useLocation} from 'react-router-dom';
import {ArrowUpRight,Bell,BookOpen,Building2,ChevronLeft,ChevronRight,FileText,Image,LayoutDashboard,LogOut,Menu,Package,Settings,ShieldCheck,Tags,Users,X,BarChart3,BadgePercent} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
import {useAuth} from '../../features/auth/AuthProvider';
import {roleNames,permits} from '../../app/permissions';
import {publicUrl} from '../../lib/config';
import logo from '../../../../../public/brand/rulman-teklif.webp';
import './layout.css';
const workspaceModules:{to:string;label:string;icon:LucideIcon;permission:'catalog'|'quotes'|'settings'}[]=[
 {to:'/kampanyalar',label:'Kampanyalı ürünler',icon:BadgePercent,permission:'settings'},
 {to:'/teklifler',label:'Teklif talepleri',icon:FileText,permission:'quotes'},
 {to:'/musteriler',label:'Müşteriler',icon:Users,permission:'quotes'},
 {to:'/medya',label:'Medya kütüphanesi',icon:Image,permission:'catalog'},
 {to:'/icerik',label:'Site içeriği',icon:BookOpen,permission:'catalog'},
 {to:'/ayarlar',label:'Ayarlar',icon:Settings,permission:'settings'},
 {to:'/ziyaretciler',label:'Ziyaretçi analitiği',icon:BarChart3,permission:'settings'},
 {to:'/kullanicilar',label:'Kullanıcılar ve aktivite',icon:ShieldCheck,permission:'settings'},
];
export function AdminLayout(){
 const location=useLocation();const auth=useAuth();const [collapsed,setCollapsed]=useState(()=>{try{return localStorage.getItem('rt-sidebar')==='collapsed';}catch{return false;}});
 const [mobile,setMobile]=useState(false),[profile,setProfile]=useState(false),[logoutError,setLogoutError]=useState(''),[loggingOut,setLoggingOut]=useState(false);
 const dialog=useRef<HTMLDialogElement>(null),profileBox=useRef<HTMLDivElement>(null),profileButton=useRef<HTMLButtonElement>(null);
 const name=String(auth.session?.user.user_metadata?.username||auth.session?.user.email||'Yetkili kullanıcı');
 useEffect(()=>{try{localStorage.setItem('rt-sidebar',collapsed?'collapsed':'expanded');}catch{}},[collapsed]);
 useEffect(()=>{const query=window.matchMedia('(min-width:901px)');const change=()=>{if(query.matches)setMobile(false);};query.addEventListener('change',change);return()=>query.removeEventListener('change',change);},[]);
 useEffect(()=>{if(mobile&&!dialog.current?.open)dialog.current?.showModal();else if(!mobile&&dialog.current?.open)dialog.current.close();},[mobile]);
 useEffect(()=>{
  if(!profile)return;
  const click=(e:PointerEvent)=>{if(!profileBox.current?.contains(e.target as Node))setProfile(false);};
  const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'){setProfile(false);profileButton.current?.focus();}};
  document.addEventListener('pointerdown',click);document.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('pointerdown',click);document.removeEventListener('keydown',escape);};
 },[profile]);
 async function logout(){setLoggingOut(true);setLogoutError('');try{await auth.logout();}catch{setLogoutError('Çıkış yapılamadı. Bağlantınızı kontrol edip tekrar deneyin.');}finally{setLoggingOut(false);}}
 const side=(isMobile=false)=><div className="sidebar-content">
  <a className="panel-brand" href={publicUrl()} aria-label="Rulman Teklif sitesine dön"><img src={logo} alt="" width="34" height="34"/><span>RULMAN <b>TEKLİF</b><small>YÖNETİM MERKEZİ</small></span></a>
  {isMobile&&<button className="icon-button mobile-close" aria-label="Menüyü kapat" onClick={()=>setMobile(false)}><X size={20}/></button>}
  <div className="nav-caption">ÇALIŞMA ALANI</div>
  <nav aria-label={isMobile?'Mobil yönetim menüsü':'Yönetim menüsü'}>
   <NavLink to="/" end className={({isActive})=>`panel-nav ${isActive?'active':''}`} onClick={()=>setMobile(false)} title="Kontrol paneli"><LayoutDashboard size={19}/><span>Kontrol paneli</span></NavLink>
   {auth.member&&permits(auth.member.role,'catalog')&&[{to:'/urunler',label:'Ürünler',icon:Package},{to:'/kategoriler',label:'Kategoriler',icon:Tags},{to:'/markalar',label:'Markalar',icon:Tags}].map(m=><NavLink key={m.to} to={m.to} className={({isActive})=>`panel-nav ${isActive?'active':''}`} title={m.label} onClick={()=>setMobile(false)}><m.icon size={19}/><span>{m.label}</span></NavLink>)}
   {workspaceModules.filter(m=>auth.member&&permits(auth.member.role,m.permission)).map(m=><NavLink key={m.to} to={m.to} className={({isActive})=>`panel-nav ${isActive?'active':''}`} title={m.label} onClick={()=>setMobile(false)}><m.icon size={19}/><span>{m.label}</span></NavLink>)}
  </nav>
  <a className="visit-site" href={publicUrl()} target="_blank" rel="noopener noreferrer"><ArrowUpRight size={18}/><span>Siteyi görüntüle</span></a>
  <div className="sidebar-bottom"><span className="avatar">{name.charAt(0).toLocaleUpperCase('tr')}</span><span><b>{name}</b><small>{auth.member&&roleNames[auth.member.role]}</small></span></div>
 </div>;
 return <div className={`panel-shell ${collapsed?'sidebar-collapsed':''}`}>
  <a className="skip-link" href="#dashboard-main" onClick={e=>{e.preventDefault();document.getElementById('dashboard-main')?.focus();}}>İçeriğe geç</a>
  <aside className="panel-sidebar">{side()}<button className="sidebar-toggle icon-button" onClick={()=>setCollapsed(!collapsed)} aria-label={collapsed?'Menüyü genişlet':'Menüyü daralt'}>{collapsed?<ChevronRight size={18}/>:<ChevronLeft size={18}/>}</button></aside>
  <dialog ref={dialog} className="mobile-sidebar" aria-label="Yönetim menüsü" onClose={()=>setMobile(false)} onClick={e=>{if(e.target===dialog.current)setMobile(false);}}>{side(true)}</dialog>
  <div className="panel-workspace">
   <header className="panel-topbar"><div className="topbar-location"><button className="icon-button mobile-menu-toggle" aria-label="Yönetim menüsünü aç" onClick={()=>setMobile(true)}><Menu size={21}/></button><LayoutDashboard size={17}/><span>Yönetim</span><span aria-hidden="true">/</span><b>{location.pathname==='/'?'Kontrol paneli':location.pathname.startsWith('/urunler')?'Ürünler':location.pathname==='/kategoriler'?'Kategoriler':location.pathname==='/markalar'?'Markalar':workspaceModules.find(m=>location.pathname===m.to||location.pathname.startsWith(m.to+'/'))?.label||'Sayfa bulunamadı'}</b></div>
    <div className="profile-box" ref={profileBox}><button className="profile-button" ref={profileButton} onClick={()=>setProfile(!profile)} aria-expanded={profile} aria-controls="profile-panel"><span className="avatar">{name.charAt(0).toLocaleUpperCase('tr')}</span><span>{name}<small>{auth.member&&roleNames[auth.member.role]}</small></span><ChevronRight size={15}/></button>
     {profile&&<section id="profile-panel" className="profile-popover" aria-label="Hesap işlemleri"><b>{name}</b><p>{auth.member&&roleNames[auth.member.role]} hesabı</p><button onClick={auth.refresh}><ShieldCheck size={16}/>Yetkiyi yenile</button><button onClick={()=>void logout()} disabled={loggingOut}><LogOut size={16}/>{loggingOut?'Çıkış yapılıyor…':'Çıkış yap'}</button>{logoutError&&<p className="field-error" role="alert">{logoutError}</p>}</section>}
    </div>
   </header>
   <main id="dashboard-main" tabIndex={-1} className="dashboard-main"><Outlet/></main>
   <footer className="panel-footer"><span>Rulman Teklif · Gücün Kesintisiz Hali</span><span>{new Date().getFullYear()} · Yönetim merkezi</span></footer>
  </div>
 </div>;
}
