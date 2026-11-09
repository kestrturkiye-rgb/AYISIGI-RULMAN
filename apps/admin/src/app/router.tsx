import {HashRouter,Navigate,Outlet,Route,Routes} from 'react-router-dom';
import {AuthProvider,useAuth} from '../features/auth/AuthProvider';
import {AccessPage,Loading,LoginPage,PasswordPage} from '../features/auth/LoginPage';
function Protected(){
 const auth=useAuth();
 if(auth.loading)return <Loading/>;
 if(!auth.session||!auth.member||auth.error)return <Navigate to="/giris" replace/>;
 if(auth.passwordRequired)return <PasswordPage/>;
 return <Outlet/>;
}
export function App(){return <AuthProvider><HashRouter><Routes><Route path="/giris" element={<LoginPage/>}/><Route element={<Protected/>}><Route index element={<AccessPage/>}/></Route><Route path="*" element={<Navigate to="/" replace/>}/></Routes></HashRouter></AuthProvider>;}
