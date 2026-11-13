import {useCallback,useEffect,useRef,useState} from 'react';
import type {Dashboard,DashboardPeriod} from '@rt/contracts';
import {useAuth} from '../auth/AuthProvider';
import {loadDashboard} from './api';
export function useDashboard(period:DashboardPeriod){
  const {member}=useAuth();const [data,setData]=useState<Dashboard|null>(null);
  const [error,setError]=useState(''),[loading,setLoading]=useState(true);
  const [revision,setRevision]=useState(0);const generation=useRef(0);
  const refresh=useCallback(()=>setRevision(v=>v+1),[]);
  useEffect(()=>{
    let active=true;const id=++generation.current;setLoading(true);setError('');
    // A range/role change must never leave the previous range's rows on screen.
    setData(null);
    loadDashboard(period).then(value=>{
      if(value.role!==member?.role)throw Error('Yetki değişti. Oturumunuzu yeniden doğrulayın.');
      if(active&&id===generation.current)setData(value);
    }).catch(e=>{if(active&&id===generation.current)setError(e.message);})
      .finally(()=>{if(active&&id===generation.current)setLoading(false);});
    return()=>{active=false;};
  },[period,member?.role,revision]);
  useEffect(()=>{const id=window.setInterval(()=>{if(document.visibilityState==='visible')refresh();},60000);return()=>clearInterval(id);},[refresh]);
  const visibleData=data&&data.role===member?.role&&data.period===period?data:null;
  return {data:visibleData,error,loading:loading||(!visibleData&&!error),refresh};
}
