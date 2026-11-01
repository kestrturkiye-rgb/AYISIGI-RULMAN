export const apiUrl=path=>`${import.meta.env.BASE_URL}api${path}`;
export async function api(path,options={}) {
 let response;try{response=await fetch(apiUrl(path),{credentials:'same-origin',signal:AbortSignal.timeout(20000),...options,headers:{'Content-Type':'application/json',...options.headers}})}catch{throw Error('Sunucuya ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.')}
 if(!response.headers.get('content-type')?.includes('application/json'))throw Error('Teklif hizmeti henüz kullanıma açılmadı. WhatsApp veya telefonla bize ulaşabilirsiniz.');
 const body=await response.json();if(!response.ok){const error=Error(body.error||'İşlem tamamlanamadı.');error.status=response.status;throw error}return body;
}
let status;
export function quoteServiceStatus(){return status ||= api('/status').catch(()=>({quotesEnabled:false}))}
