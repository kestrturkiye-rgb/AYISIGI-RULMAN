import React from 'react';
import {createRoot} from 'react-dom/client';
import {App} from './app/router';
import './styles.css';
class ErrorBoundary extends React.Component<{children:React.ReactNode},{failed:boolean}>{
 state={failed:false};static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<main className="loading"><h1>Panel yüklenemedi</h1><p>Sayfayı yenileyip tekrar deneyin.</p><button onClick={()=>location.reload()}>Yeniden yükle</button></main>:this.props.children;}
}
createRoot(document.getElementById('root')!).render(<ErrorBoundary><App/></ErrorBoundary>);
