export function catalogStats(products){
 const categories=new Map(),brands=new Map();
 for(const product of products){categories.set(product.category,(categories.get(product.category)||0)+1);brands.set(product.brand,(brands.get(product.brand)||0)+1)}
 return {categories:Object.fromEntries(categories),brands:[...brands].map(([name,count])=>({name,count})).sort((a,b)=>a.name.localeCompare(b.name,'tr'))};
}
