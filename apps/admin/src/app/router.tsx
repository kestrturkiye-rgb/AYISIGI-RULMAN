import {lazy,Suspense} from 'react';
import {createHashRouter,RouterProvider,Navigate,Outlet,Route,createRoutesFromElements} from 'react-router-dom';
import {AuthProvider,useAuth} from '../features/auth/AuthProvider';
import {Loading,LoginPage,PasswordPage} from '../features/auth/LoginPage';
import {AdminLayout} from '../components/layout/AdminLayout';
const ProductList=lazy(()=>import('../features/catalog/ProductList')); 
const ProductEditor=lazy(()=>import('../features/catalog/ProductEditor')); 
const TaxonomyPage=lazy(()=>import('../features/catalog/TaxonomyPage')); 
const ContentPage=lazy(()=>import('../features/workspace/ContentPage'));
const SettingsPage=lazy(()=>import('../features/workspace/SettingsPage'));
const MediaPage=lazy(()=>import('../features/workspace/MediaPage'));
const CampaignsPage=lazy(()=>import('../features/workspace/CampaignsPage'));
const QuotesPage=lazy(()=>import('../features/workspace/QuotesPage'));
const QuoteDetail=lazy(()=>import('../features/workspace/QuotesPage').then(m=>({default:m.QuoteDetail})));
const CustomersPage=lazy(()=>import('../features/workspace/CustomersPage'));
const UsersPage=lazy(()=>import('../features/workspace/UsersPage'));
const AnalyticsPage=lazy(()=>import('../features/workspace/AnalyticsPage'));
import {permits} from './permissions';
import DashboardPage from '../features/dashboard/DashboardPage';
function Protected(){
 const auth=useAuth();
 if(auth.loading)return <Loading/>;
 if(!auth.session||!auth.member||auth.error)return <Navigate to="/giris" replace/>;
 if(auth.passwordRequired)return <PasswordPage/>;
 return <Outlet/>;
}
function CatalogGuard({permission='catalog'}:{permission?:'catalog'|'quotes'|'settings'}){const {member}=useAuth();return member&&permits(member.role,permission)?<Outlet/>:<section><h1>Erişim yetkiniz yok</h1><p>Hesabınızın bu bölüm için yetkisi bulunmuyor.</p></section>;}
const router=createHashRouter(createRoutesFromElements(<Route><Route path="/giris" element={<LoginPage/>}/><Route element={<Protected/>}><Route element={<AdminLayout/>}><Route index element={<DashboardPage/>}/><Route element={<CatalogGuard/>}><Route path="urunler" element={<ProductList/>}/><Route path="urunler/:id" element={<ProductEditor/>}/><Route path="kategoriler" element={<TaxonomyPage kind="categories"/>}/><Route path="markalar" element={<TaxonomyPage kind="brands"/>}/><Route path="medya" element={<MediaPage/>}/><Route path="icerik" element={<ContentPage/>}/></Route><Route element={<CatalogGuard permission="quotes"/>}><Route path="teklifler" element={<QuotesPage/>}/><Route path="teklifler/:id" element={<QuoteDetail/>}/><Route path="musteriler" element={<CustomersPage/>}/></Route><Route element={<CatalogGuard permission="settings"/>}><Route path="kampanyalar" element={<CampaignsPage/>}/><Route path="ayarlar" element={<SettingsPage/>}/><Route path="kullanicilar" element={<UsersPage/>}/><Route path="ziyaretciler" element={<AnalyticsPage/>}/></Route><Route path="*" element={<section><h1>Sayfa bulunamadı</h1><p>Adres yanlış yazılmış veya kaldırılmış olabilir.</p><a className="primary" href="#/">Kontrol paneline dön</a></section>}/></Route></Route><Route path="*" element={<Navigate to="/" replace/>}/></Route>));
export function App(){return <AuthProvider><Suspense fallback={<Loading/>}><RouterProvider router={router}/></Suspense></AuthProvider>;}
