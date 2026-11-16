import project from '../apps/admin/src/project-config.json' with {type:'json'};
const cache=new Map();
export async function publicRpc(name,args={},ttl=0){const key=name+JSON.stringify(args),old=cache.get(key);if(ttl&&old?.until>Date.now())return old.value;
 const r=await fetch(project.url+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:project.publicKey,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(12000)});
 if(!r.ok)throw Error('Public data unavailable');const value=await r.json();if(ttl){cache.set(key,{value,until:Date.now()+ttl});while(cache.size>32)cache.delete(cache.keys().next().value);}return value;}
export const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function textFromRich(value){if(!value||typeof value!=='object')return '';if(value.type==='text')return String(value.text||'');return (value.content||[]).map(textFromRich).join(value.type==='paragraph'||value.type==='heading'?'':' ');}
export function xmlResponse(res,xml){res.setHeader('Content-Type','application/xml; charset=utf-8');res.setHeader('Cache-Control','public,max-age=0,s-maxage=300,stale-while-revalidate=600');res.statusCode=200;res.end(xml);}
