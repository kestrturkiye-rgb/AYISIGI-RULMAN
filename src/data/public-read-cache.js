// Public anonymous reads only. Nothing is persisted and private sessions never enter this cache.
export function createPublicReadCache({now=Date.now,pause=ms=>new Promise(r=>setTimeout(r,ms)),limit=40}={}){
 const entries=new Map();let generation=0;
 function transient(error){return ['NETWORK','57014','PGRST000','PGRST001','PGRST002'].includes(error?.code)||[502,503,504].includes(error?.status)||error instanceof TypeError||/fetch|network|timeout|timed out/i.test(error?.message||'');}
 return {
  clear(){generation++;entries.clear();},
  async read(key,load,ttl=20000){
   const cached=entries.get(key);if(cached&&(cached.pending||cached.expires>now()))return cached.promise;
   entries.delete(key);const version=generation;
   const entry={pending:true,expires:0,promise:null};
   entry.promise=(async()=>{try{
    let result;for(let attempt=0;attempt<2;attempt++){try{result=await load();break;}catch(error){if(attempt||!transient(error))throw error;await pause(250);}}
    entry.pending=false;entry.expires=now()+ttl;return result;
   }catch(error){if(version===generation&&entries.get(key)===entry)entries.delete(key);throw error;}})();
   entries.set(key,entry);while(entries.size>limit)entries.delete(entries.keys().next().value);
   return entry.promise;
  },
 };
}
