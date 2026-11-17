// Owned hostnames are code-reviewed. Public CMS settings cannot extend this trust boundary.
export const DOMAIN_BRANDS=Object.freeze([
 {key:'teklif',name:'Rulman Teklif',primary:'rulmanteklif.com',aliases:['rulmanteklif.com.tr','rulmanteklif.online']},
 {key:'teknik',name:'Rulman Teknik',primary:'rulmanteknik.com',aliases:['rulmanteknik.com.tr']},
 {key:'asistan',name:'Rulman Asistan',primary:'rulmanasistan.com',aliases:['rulmanasistan.com.tr']},
 {key:'kodu',name:'Rulman Kodu',primary:'rulmankodu.com',aliases:['rulmankodu.com.tr']},
 {key:'secim',name:'Rulman Seçim',primary:'rulmansecim.com',aliases:[]},
].map(brand=>Object.freeze({...brand,aliases:Object.freeze(brand.aliases),origin:'https://'+brand.primary})));
export const PUBLIC_HOSTS=Object.freeze(DOMAIN_BRANDS.flatMap(b=>[b.primary,...b.aliases].flatMap(host=>[host,'www.'+host])));
const byHost=new Map(DOMAIN_BRANDS.flatMap(b=>[b.primary,...b.aliases].flatMap(host=>[[host,b],['www.'+host,b]])));
export function knownBrand(hostname){return typeof hostname==='string'?byHost.get(hostname.toLowerCase()):undefined;}
export function domainBrand(location=globalThis.location){return knownBrand(location?.hostname)||DOMAIN_BRANDS[0];}
export function canonicalOrigin(location=globalThis.location){return domainBrand(location).origin;}
export function publicHostname(hostname){return Boolean(knownBrand(hostname));}
export function requestBrand(host){return knownBrand(host)||DOMAIN_BRANDS[0];}
export function trustedRequestOrigin(host){return knownBrand(host)?'https://'+host.toLowerCase():DOMAIN_BRANDS[0].origin;}
export const DEFAULT_PROFILES=Object.freeze(Object.fromEntries(DOMAIN_BRANDS.map(brand=>[brand.key,brand.key==='teklif'?{}:{
 name:brand.name,logo:null,favicon:null,
 slogan:{tr:'ENDÜSTRİYEL ÇÖZÜM ORTAĞINIZ',en:'YOUR INDUSTRIAL SOLUTION PARTNER'},
 description:{tr:brand.name+' ile rulman ve endüstriyel güç aktarım ürünlerini kod veya ölçüyle inceleyin; seçtiğiniz ürünler için teklif isteyin.',en:'Explore bearings and industrial power transmission products by code or dimensions with '+brand.name+'. Request a quotation for your selection.'},
 aboutDescription:{tr:brand.name+' üzerinden rulman ve endüstriyel ürünleri karşılaştırabilir, ürün kodu veya ölçülerine göre arama yapabilir ve teklif listenizi oluşturabilirsiniz. Ürün seçimi ve tedarik talepleriniz için ortak iletişim kanallarımızdan bize ulaşabilirsiniz.',en:'Use '+brand.name+' to compare bearings and industrial products, search by product code or dimensions and build your quote list. Contact us through our shared contact channels for product selection and supply enquiries.'},
 aboutTitle:{tr:'Doğru ürün seçimi için teknik çözüm ortağınız.',en:'Your technical partner for product selection.'}
}])));
