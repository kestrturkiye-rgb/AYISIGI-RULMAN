import {createHmac} from 'node:crypto';
export async function callOperations(payload,{signal}={}){
 const key=process.env.RT_GATEWAY_HMAC_SECRET,url=process.env.RT_OPS_URL;
 if(!key||!url)throw Error('service_configuration');
 const body=JSON.stringify(payload),time=String(Date.now());
 const signature=createHmac('sha256',key).update(time+'.'+body).digest('hex');
 const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','x-rt-time':time,'x-rt-signature':signature},body,signal:signal||AbortSignal.timeout(20000)});
 const data=await r.json();return {status:r.status,data};
}
