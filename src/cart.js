export const CART_KEY='rulman-teklif-cart';
export const legacyCartCodes={1:['SKF','6204 2RS'],2:['FAG','6205 ZZ'],3:['TIMKEN','30206'],4:['NSK','UCP 205'],5:['NSK','6306 2RS'],6:['SKF','22210 E'],7:['ENDÜSTRİYEL','08B-1'],8:['FAG','6001 ZZ']};
export function readCart(storage){
 try{const value=JSON.parse((storage||window.localStorage).getItem(CART_KEY)||(storage||window.localStorage).getItem('ayisigi-cart')||'[]');return sanitizeCart(value)}catch{return []}
}
export function resolveCart(items,byId){
 const resolved=new Map();
 for(const item of items){
  if(!item||!Number.isSafeInteger(item.qty)||item.qty<1)continue;
  let id=item.id;
  if(typeof id==='number'&&legacyCartCodes[id]){
   const [brand,code]=legacyCartCodes[id];const normalize=s=>s.replace(/[\s-]/g,'');
   id=[...byId.values()].find(p=>p.brand===brand&&normalize(p.code)===normalize(code))?.id;
  }
  if(!byId.has(id))continue;
  // Align with server quantity validation; corrupt/duplicate storage cannot overflow.
  resolved.set(id,Math.min(1000000,(resolved.get(id)||0)+item.qty));
 }
 return [...resolved].map(([id,qty])=>({id,qty}));
}
export function saveCart(items,storage){try{(storage||window.localStorage).setItem(CART_KEY,JSON.stringify(items));return true}catch{return false}}

export function sanitizeCart(value){
 if(!Array.isArray(value))return [];
 const items=new Map();for(const item of value){if(!item||!Number.isSafeInteger(item.qty)||item.qty<1||!(typeof item.id==='string'&&item.id.length>0&&item.id.length<=240||Number.isInteger(item.id)&&legacyCartCodes[item.id]))continue;items.set(item.id,Math.min(1000000,(items.get(item.id)||0)+item.qty))}return [...items].map(([id,qty])=>({id,qty}));
}

// Preserve unavailable IDs while migrating resolvable prototype-era numeric IDs.
export function hydrateCart(items,byId){
 return sanitizeCart(sanitizeCart(items).map(item=>typeof item.id==='number'?(resolveCart([item],byId)[0]||item):item));
}
