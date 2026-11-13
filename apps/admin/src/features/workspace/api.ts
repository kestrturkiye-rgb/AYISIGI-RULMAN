import {z} from 'zod';import {client,config} from '../../lib/config';import {rpc} from '../catalog/api';
export type Row=Record<string,any>;
const listSchema=z.object({items:z.array(z.record(z.string(),z.unknown())),total:z.number().int().nonnegative().optional()});
export async function list(name:string,args:Record<string,unknown>={}){return listSchema.parse(await rpc(name,args)) as {items:Row[],total?:number};}
export async function operation(action:string,data:Row={}){
 if(!client)throw Error('Bağlantı tanımlanmadı.');const {data:{session}}=await client.auth.getSession();if(!session)throw Error('Giriş gerekli.');
 const response=await fetch(config.url+'/functions/v1/rt-admin-operations',{method:'POST',headers:{apikey:config.key!,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({action,...data}),signal:AbortSignal.timeout(30000)});
 const result=await response.json().catch(()=>({error:'Sunucu yanıt vermedi.'}));if(!response.ok)throw Error(result.error||'İşlem tamamlanamadı.');return result;
}
export function downloadCsv(name:string,columns:[string,string][],rows:Row[]){
 const cell=(value:unknown)=>{let s=String(value??'');if(/^(?:\s|\ufeff)*[=+@-]|^[\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
 const text='\ufeff'+[columns.map(c=>cell(c[1])).join(';'),...rows.map(r=>columns.map(c=>cell(r[c[0]])).join(';'))].join('\r\n');const url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
