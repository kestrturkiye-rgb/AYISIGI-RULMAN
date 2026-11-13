import React, {createContext,useCallback,useContext,useEffect,useRef,useState} from 'react';
import type {Session} from '@supabase/supabase-js';
import {staffSchema,type StaffMember} from '@rt/contracts';
import {client} from '../../lib/config';
import {completeCallback} from '../../lib/callback';
type State = {
  session: Session|null; member: StaffMember|null; loading: boolean; error: string;
  passwordRequired: boolean; refresh:()=>void; logout:()=>Promise<void>; passwordDone:()=>void;
};
const Context = createContext<State|null>(null);
export function useAuth() { const value=useContext(Context); if(!value)throw Error('AuthProvider');return value; }
export function AuthProvider({children}:{children:React.ReactNode}) {
  const [session,setSession]=useState<Session|null>(null),[member,setMember]=useState<StaffMember|null>(null);
  const [loading,setLoading]=useState(true),[error,setError]=useState(''),[passwordRequired,setPasswordRequired]=useState(false);
  const generation=useRef(0),alive=useRef(true),sessionRef=useRef<Session|null>(null);
  const verify=useCallback(async(next:Session|null,background=false)=>{
    const version=++generation.current;const silent=background&&next?.user.id===sessionRef.current?.user.id;sessionRef.current=next;setSession(next);if(!silent)setMember(null);setError('');
    if(!next || !client){setLoading(false);return;}
    if(!silent)setLoading(true);
    try {
      // getUser verifies the token with Auth; cached storage is not authority.
      const {data:user,error:userError}=await client.auth.getUser();
      if(userError || !user.user || user.user.id!==next.user.id)throw Error('user');
      const {data,error:roleError}=await client.rpc('get_staff_access');
      if(roleError)throw roleError;
      const result=staffSchema.safeParse(data?.[0]);
      if(alive.current&&version===generation.current)setMember(result.success&&result.data.user_id===user.user.id?result.data:null);
    } catch {
      if(alive.current&&version===generation.current)setError('Oturum veya yetki doğrulanamadı. Bağlantınızı kontrol edip tekrar deneyin.');
    } finally {if(alive.current&&version===generation.current)setLoading(false);}
  },[]);
  useEffect(()=>{
    alive.current=true;
    if(!client){setLoading(false);return ()=>{alive.current=false;};}
    let ready=false;
    const {data}=client.auth.onAuthStateChange((event,next)=>{
      if(event==='PASSWORD_RECOVERY')setPasswordRequired(true);
      // No awaited Supabase operation inside the Auth callback (avoids SDK lock).
      if(ready)queueMicrotask(()=>{if(alive.current)void verify(next,event==='TOKEN_REFRESHED');});
    });
    void (async()=>{
      const callback=await completeCallback();if(!alive.current)return;
      setPasswordRequired(callback.password);
      const {data,error}=await client.auth.getSession();if(!alive.current)return;
      ready=true;await verify(data.session);
      if(callback.error)setError(callback.error);
      else if(error)setError('Oturum yüklenemedi. Tekrar giriş yapın.');
    })().catch(()=>{if(alive.current){setLoading(false);setError('Giriş sistemi başlatılamadı. Tekrar deneyin.');}});
    const refresh=()=>{if(document.visibilityState==='visible')void verify(sessionRef.current,true);};
    const interval=window.setInterval(refresh,60000);
    window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
    return()=>{alive.current=false;generation.current++;data.subscription.unsubscribe();clearInterval(interval);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
  },[verify]);
  async function logout(){
    if(!client)return;
    const {error}=await client.auth.signOut();if(error)throw error;
    setPasswordRequired(false);await verify(null);
  }
  return <Context.Provider value={{session,member,loading,error,passwordRequired,refresh:()=>void verify(sessionRef.current),logout,passwordDone:()=>setPasswordRequired(false)}}>{children}</Context.Provider>;
}
