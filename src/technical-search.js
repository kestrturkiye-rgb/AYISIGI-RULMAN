export const emptyTechnicalQuery = { code: '', inner: '', outer: '', width: '' };

export function normalizeCode(value) {
  return String(value ?? '').normalize('NFKC').toUpperCase().replace(/İ/g, 'I').replace(/[\s\u200B\u2010-\u2015-]+/g, '');
}

export function matchesProductCode(product, value) {
  const query = normalizeCode(value);
  if (!query) return true;
  const brand = product.brand === 'Belirtilmemiş' ? '' : normalizeCode(product.brand);
  return [product.code, product.baseCode, ...(product.codeAliases || [])].filter(Boolean).some(value => {
    const code = normalizeCode(value);
    return query === code || (brand && (query === brand + code || query === code + brand));
  });
}

export function matchesTextQuery(product, value, normalizedQuery) {
  const query = value.trim();
  if (!query) return true;
  if (product.searchText.includes(query.toLocaleLowerCase('tr'))) return true;
  const codeQuery = normalizedQuery ?? normalizeCode(query);
  const code = product.normalizedCode || normalizeCode(product.code);
  if (code.includes(codeQuery)) return true;
  const brand = product.normalizedBrand || normalizeCode(product.brand);
  if ((brand + code).includes(codeQuery) || (code + brand).includes(codeQuery)) return true;
  return [product.baseCode, ...(product.codeAliases || [])].filter(Boolean).some(value => {
    const alias = normalizeCode(value);
    return alias.includes(codeQuery) || (brand + alias).includes(codeQuery) || (alias + brand).includes(codeQuery);
  });
}

export function parseTechnicalQuery(fields) {
  const query = { code: normalizeCode(fields.code.trim()) };
  if (!query.code && !['inner', 'outer', 'width'].some(key => fields[key].trim())) {
    return { error: 'Bir rulman kodu veya en az bir ölçü girin.' };
  }
  for (const key of ['inner', 'outer', 'width']) {
    const value = fields[key].trim();
    if (!value) continue;
    if (!/^\d+(?:[.,]\d+)?$/.test(value) || !Number.isFinite(Number(value.replace(',', '.'))) || Number(value.replace(',', '.')) <= 0) {
      return { error: 'Ölçüleri sıfırdan büyük bir sayı olarak girin. Örnek: 17,25' };
    }
    query[key] = Number(value.replace(',', '.'));
  }
  if (query.inner !== undefined && query.outer !== undefined && query.inner >= query.outer) {
    return { error: 'Dış çap, iç çaptan büyük olmalıdır.' };
  }
  return { query };
}

export function matchesTechnicalQuery(product, query) {
  if (!query) return true;
  if (query.code && !matchesProductCode(product, query.code)) return false;
  return ['inner', 'outer', 'width'].every(key => query[key] === undefined || product.dimensions?.[key] === query[key]);
}

// Normalize the query once per search rather than once per product.
export function compileTechnicalQuery(query) {
 if(!query)return ()=>true;
 const code=normalizeCode(query.code);
 return product=>{
  if(code){
   const brand=product.brand==='Belirtilmemiş'?'':product.normalizedBrand||normalizeCode(product.brand);
   const codes=product.normalizedCodes||[product.code,product.baseCode,...(product.codeAliases||[])].filter(Boolean).map(normalizeCode);
   if(!codes.some(value=>code===value||(brand&&(code===brand+value||code===value+brand))))return false;
  }
  return ['inner','outer','width'].every(key=>query[key]===undefined||product.dimensions?.[key]===query[key]);
 };
}
export function compileTextQuery(value) {
 const query=value.trim().toLocaleLowerCase('tr');if(!query)return ()=>true;
 const normalized=normalizeCode(query);
 return product=>{
  if(product.searchText.includes(query))return true;
  const brand=product.normalizedBrand||normalizeCode(product.brand);
  const codes=product.normalizedCodes||[product.code,product.baseCode,...(product.codeAliases||[])].filter(Boolean).map(normalizeCode);
  return codes.some(code=>code.includes(normalized)||(brand+code).includes(normalized)||(code+brand).includes(normalized));
 };
}
