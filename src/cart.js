export const CART_KEY='rulman-teklif-cart';
const legacy={1:['SKF','6204 2RS'],2:['FAG','6205 ZZ'],3:['TIMKEN','30206'],4:['NSK','UCP 205'],5:['NSK','6306 2RS'],6:['SKF','22210 E'],7:['ENDÜSTRİYEL','08B-1'],8:['FAG','6001 ZZ']};
export function readCart(storage){
 try{const value=JSON.parse((storage||window.localStorage).getItem(CART_KEY)||(storage||window.localStorage).getItem('ayisigi-cart')||'[]');return Array.isArray(value)?value:[]}catch{return []}
}
export function resolveCart(items,byId){
 const resolved=new Map();
 for(const item of items){
  if(!item||!Number.isSafeInteger(item.qty)||item.qty<1)continue;
  let id=item.id;
  if(typeof id==='number'&&legacy[id]){
   const [brand,code]=legacy[id];const normalize=s=>s.replace(/[\s-]/g,'');
   id=[...byId.values()].find(p=>p.brand===brand&&normalize(p.code)===normalize(code))?.id;
  }
  if(!byId.has(id))continue;
  // Align with server quantity validation; corrupt/duplicate storage cannot overflow.
  resolved.set(id,Math.min(1000000,(resolved.get(id)||0)+item.qty));
 }
 return [...resolved].map(([id,qty])=>({id,qty}));
}
export function saveCart(items,storage){try{(storage||window.localStorage).setItem(CART_KEY,JSON.stringify(items));return true}catch{return false}}
