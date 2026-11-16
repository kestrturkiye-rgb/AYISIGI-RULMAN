import {messages,taxonomy} from './messages-en.js';
import {contentMessages} from './content-en.js';
const taxonomyFolded=new Map(Object.entries(taxonomy).map(([k,v])=>[k.toLocaleLowerCase('tr-TR'),v]));
let technicalPatterns;const technicalCache=new Map();
const own=(record,key)=>Object.hasOwn(record,key)?record[key]:undefined;
const validEntries=value=>(Array.isArray(value)?value:[]).filter(x=>x&&typeof x.source==='string'&&typeof x.translation==='string'&&x.source.trim()&&x.translation.trim());
const listeners=new Set();let overrides=new Map(),customUi=new Map(),version=0;
export function stripLanguage(path){return path==='/en'||path.startsWith('/en/')?path.slice(3)||'/':path;}
export function languageFromLocation(location=globalThis.location){const path=location?.hash?.startsWith('#/')?location.hash.slice(1).split('?')[0]:location?.pathname||'/';return path==='/en'||path.startsWith('/en/')?'en':'tr';}
let snapshot={language:languageFromLocation(),version};
export const getLanguage=()=>snapshot.language;
export const getSnapshot=()=>snapshot;
export function subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);}
function notify(){snapshot={language:snapshot.language,version:++version};for(const fn of listeners)fn();}
export function syncLanguage(location=globalThis.location){const next=languageFromLocation(location);if(next!==snapshot.language){snapshot={language:next,version:++version};for(const fn of listeners)fn();}if(globalThis.document)document.documentElement.lang=next;}
export function localePath(path,language=getLanguage()){if(!path.startsWith('/')||path.startsWith('//'))return path;const raw=stripLanguage(path.split('?')[0])+(path.includes('?')?'?'+path.split('?').slice(1).join('?'):'');return language==='en'?'/en'+(raw==='/'?'/':raw):raw;}
export function switchLanguage(language,route,location=globalThis.location){if(!['tr','en'].includes(language))return;try{globalThis.localStorage?.setItem('rt-language',language)}catch{}const path=localePath((route.publicPath||route.path)+(route.params.size?'?'+route.params.toString():''),language);if(['rulmanteklif.com','www.rulmanteklif.com'].includes(location.hostname)){history.pushState(null,'',path);globalThis.dispatchEvent(new PopStateEvent('popstate'));}else{location.hash=path;syncLanguage(location);}}
export function configureMessages(entries=[],uiTexts={},defaults={}){const next=new Map(validEntries(entries).map(x=>[x.source.trim(),x.translation]));const ui=new Map(Object.entries(uiTexts).filter(([k,v])=>defaults[k]&&typeof v==='string').map(([k,v])=>[defaults[k],v]));const serial=m=>JSON.stringify([...m]);if(serial(next)===serial(overrides)&&serial(ui)===serial(customUi))return;overrides=next;customUi=ui;notify();}
const patterns=[
 [/^(\d[\d.,]*) ürün bulundu$/,(_,n)=>`${n} products found`],
 [/^(\d[\d.,]*) ürünlük keşif seçkisi$/,(_,n)=>`A discovery selection of ${n} products`],
 [/^(\d[\d.,]*) ürün gösteriliyor; diğer sonuçlar sonraki sayfalarda$/,(_,n)=>`${n} products shown; more results on the following pages`],
 [/^(\d[\d.,]*) ürün$/,(_,n)=>`${n} products`],
 [/^(.*) teklif listenize eklendi$/,(_,code)=>`${code} added to your quote list`],
 [/^(.*) eklendi\. Sepet yalnızca bu oturumda saklanabiliyor\.$/,(_,code)=>`${code} added. Your list can only be stored for this session.`],
 [/^Tüm markaları göster \((\d+)\)$/,(_,n)=>`Show all brands (${n})`],
 [/^(.*) alt kategorileri$/,(_,name)=>`${translate(name,'en')} subcategories`],
 [/^(.*) detayını görüntüle$/,(_,code)=>`View details: ${code}`],
 [/^Özellikleri incele: (.*)$/,(_,code)=>`View specifications: ${code}`],
 [/^(.*) teklif sepetine ekle$/,(_,code)=>`Add ${code} to quote list`],
 [/^(.*) azalt$/,(_,code)=>`Decrease quantity: ${code}`],[/^(.*) artır$/,(_,code)=>`Increase quantity: ${code}`],[/^(.*) kaldır$/,(_,code)=>`Remove ${code}`],
 [/^(.*) ürün ayrıntıları$/,(_,code)=>`${code} product details`],
 [/^(.*) ürün bilgileri$/,(_,code)=>`${code} product details`],
 [/^Kod: (.*)$/,(_,value)=>`Code: ${value}`],
 [/^(İç|Dış|En): (.*)$/,(_,label,value)=>`${({İç:'Bore',Dış:'Outside',En:'Width'})[label]}: ${value}`],
];
export function translate(value,language=getLanguage(),entries){if(typeof value!=='string'||!value.trim())return value;if(language!=='en')return customUi.get(value)||value;const trimmed=value.trim();const extra=entries?new Map(validEntries(entries).map(x=>[x.source.trim(),x.translation])):overrides;const mapped=extra.get(trimmed)||own(messages,trimmed)||own(contentMessages,trimmed)||own(taxonomy,trimmed)||taxonomyFolded.get(trimmed.toLocaleLowerCase('tr-TR'));if(mapped)return value.replace(trimmed,mapped);for(const [pattern,render]of patterns)if(pattern.test(trimmed))return value.replace(trimmed,trimmed.replace(pattern,render));return value;}
export function technicalText(value,language=getLanguage()){if(language!=='en'||typeof value!=='string')return value;const exact=translate(value,language);if(exact!==value)return exact;if(technicalCache.has(value))return technicalCache.get(value);technicalPatterns??=Object.entries(taxonomy).filter(([k])=>k.length>3).sort((a,b)=>b[0].length-a[0].length).map(([source,target])=>[new RegExp('(?<![\\p{L}])'+source.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?![\\p{L}])','giu'),target]);let result=value;for(const [pattern,target]of technicalPatterns)result=result.replace(pattern,target);technicalCache.set(value,result);if(technicalCache.size>300)technicalCache.delete(technicalCache.keys().next().value);return result;}
export function installLanguageNavigation(){if(!globalThis.window)return()=>{};try{if(!location.hash&&!location.search&&(location.pathname==='/'||location.pathname==='/AYISIGI-RULMAN/')&&localStorage.getItem('rt-language')==='en'){if(['rulmanteklif.com','www.rulmanteklif.com'].includes(location.hostname))history.replaceState(null,'','/en/');else location.hash='/en/';}}catch{}const sync=()=>syncLanguage();window.addEventListener('popstate',sync);window.addEventListener('hashchange',sync);sync();const click=event=>{if(event.defaultPrevented||event.button||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;const a=event.target.closest?.('a[href]');if(!a||a.target||a.hasAttribute('download'))return;const href=a.getAttribute('href');let path;if(href.startsWith('#/'))path=href.slice(1);else if(href.startsWith('/')&&!href.startsWith('//'))path=href;else return;if(path.startsWith('//'))return;if(/^\/(admin|api)(\/|$)/.test(stripLanguage(path)))return;path=localePath(path);event.preventDefault();if(['rulmanteklif.com','www.rulmanteklif.com'].includes(location.hostname)){history.pushState(null,'',path);window.dispatchEvent(new PopStateEvent('popstate'));}else{location.hash=path;sync();}};document.addEventListener('click',click);return()=>{window.removeEventListener('popstate',sync);window.removeEventListener('hashchange',sync);document.removeEventListener('click',click);};}

export function localizeSearch(value,language=getLanguage()){if(language!=='en'||typeof value!=='string'||/^[A-Za-z0-9./_-]+$/.test(value)&&/\d/.test(value))return value;const words={'ball bearings':'bilyalı rulmanlar','ball bearing':'bilyalı rulman','roller bearings':'makaralı rulmanlar','roller bearing':'makaralı rulman','linear guides':'lineer kılavuzlar','linear guide':'lineer kılavuz','bearings':'rulmanlar','bearing':'rulman','housings':'yatak','housing':'yatak','belts':'kayışlar','belt':'kayış','pulleys':'kasnaklar','pulley':'kasnak','chains':'zincirler','chain':'zincir','couplings':'kaplinler','coupling':'kaplin','seals':'sızdırmazlık','bushings':'burçlar','bushing':'burç'};const pattern=new RegExp('\\b('+Object.keys(words).join('|')+')\\b','gi');return value.replace(pattern,word=>words[word.toLowerCase()]);}
