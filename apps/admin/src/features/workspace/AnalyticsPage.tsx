import {useState} from 'react';
import {rpc} from '../catalog/api';
import {Page,Pager,State,useResource} from './common';
import type {Row} from './api';
const siteLabel=(host:string|null|undefined)=>host||'Eski kayıt / site bilinmiyor';
export default function AnalyticsPage(){
 const [from,setFrom]=useState(''),[to,setTo]=useState(''),[page,setPage]=useState(1),[session,setSession]=useState(''),[site,setSite]=useState('');
 const resource=useResource<Row>(()=>rpc('admin_analytics',{p_filters:{from,to,page,session,site}}),[from,to,page,session,site]);
 const d=resource.data;
 function changeSite(value:string){setSite(value);setSession('');setPage(1);}
 return <Page title="Ziyaretçi analitiği" description="Sitelerinizde analiz izni veren ziyaretçilerin yaklaşık konum, sayfa ve ürün görüntülemeleri.">
  <p className="workspace-info">Konum, IP’ye göre tahmindir; kesin adres değildir. Ham IP tutulmaz: maskelenmiş ağ ve günlük oturum özeti gösterilir. Veriler 90 gün saklanır. Geçmiş kayıtların site bilgisi sonradan tahmin edilmez. Bu rapor sayfa ve ürün görüntülemelerini kapsar; her buton tıklamasını kaydetmez.</p>
  <div className="workspace-tools">
   <label>Site / domain<select aria-label="Site / domain" value={site} onChange={e=>changeSite(e.target.value)}><option value="">Tüm siteler</option>{site&&!(d?.domains||[]).some((entry:Row)=>(entry.site_host||'__legacy__')===site)&&<option value={site}>{site==='__legacy__'?siteLabel(null):site}</option>}{(d?.domains||[]).map((entry:Row)=><option key={entry.site_host||'__legacy__'} value={entry.site_host||'__legacy__'}>{siteLabel(entry.site_host)} · {entry.views} görüntüleme</option>)}</select></label>
   <label>Başlangıç<input type="date" value={from} onChange={e=>{setFrom(e.target.value);setPage(1);}}/></label>
   <label>Bitiş<input type="date" value={to} onChange={e=>{setTo(e.target.value);setPage(1);}}/></label>
   {session&&<button className="secondary" onClick={()=>{setSession('');setPage(1);}}>Tüm oturumlar</button>}
   <button className="secondary" onClick={resource.refresh}>Yenile</button>
  </div>
  <State {...resource} retry={resource.refresh}/>
  {d&&<>
   <div className="workspace-metrics">{[['Oturum',d.sessions],['Sayfa görüntüleme',d.views],['Ürün görüntüleme',d.productViews]].map(([n,v])=><article className="catalog-card" key={String(n)}><span>{n}</span><strong>{Number(v).toLocaleString('tr-TR')}</strong></article>)}</div>
   <div className="workspace-columns">
    <section className="catalog-card form-section"><h2>En çok bakılan ürünler</h2>{d.products.length?d.products.map((p:Row)=><p key={p.product_id}><b>{p.name||p.product_id}</b><small>{p.views} görüntüleme</small></p>):<p>Henüz ürün görüntülemesi yok.</p>}</section>
    <section className="catalog-card form-section"><h2>Yaklaşık konumlar</h2>{d.locations.length?d.locations.map((l:Row,i:number)=><p key={i}>{l.city||'Şehir sağlanmadı'} · {l.country||'Ülke sağlanmadı'}<small>{l.visits} oturum</small></p>):<p>Henüz ziyaret kaydı yok.</p>}</section>
   </div>
   <div className="catalog-card table-scroll"><table><thead><tr><th>Zaman</th><th>Site / domain</th><th>Yaklaşık konum / IP ağı</th><th>Sayfa / ürün</th><th>Cihaz</th><th>Oturum</th></tr></thead><tbody>{d.items.map((event:Row)=><tr key={event.id}>
    <td>{new Date(event.occurred_at).toLocaleString('tr-TR')}</td><td>{siteLabel(event.site_host)}</td>
    <td>{[event.city,event.region,event.country].filter(Boolean).join(' · ')||'Konum sağlanmadı'}<small>{event.ip_mask}</small></td>
    <td><b>{event.kind==='product_view'?event.product_name||event.product_id:'Sayfa görüntüleme'}</b><span>{event.path}</span>{event.referrer_host&&<small>Kaynak: {event.referrer_host}</small>}</td>
    <td>{({mobile:'Mobil',desktop:'Masaüstü',tablet:'Tablet',unknown:'Bilinmiyor'} as Row)[event.device]}</td>
    <td><button className="secondary" onClick={()=>{setSite(event.site_host||'__legacy__');setSession(event.session_hash);setPage(1);}}>Geçmişi gör</button></td>
   </tr>)}</tbody></table>{d.items.length===0&&<p className="catalog-empty">Seçili filtrelerde ziyaret kaydı yok. Veriler kullanıcı analiz izni verdikten sonra toplanır.</p>}</div>
   <Pager page={page} total={d.total} onChange={setPage}/>
  </>}
 </Page>;
}
