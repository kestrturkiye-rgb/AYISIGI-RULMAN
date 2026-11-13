import {readFileSync} from 'node:fs';
import {parse} from '@babel/parser';
import {company} from '../../src/company.js';
import {productGroups} from '../../src/catalog-groups.js';
const root=new URL('../../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
export const sourceFiles=['src/main.jsx','src/CompanySections.jsx','src/TechnicalSearch.jsx','src/CatalogGrid.jsx','src/QuoteRequest.jsx','src/Academy.jsx','src/ProductSpecs.jsx','src/ProductNavigation.jsx','src/company.js','src/catalog-groups.js','src/academy-data.js','src/academy-additions.js','src/theme.css','index.html'];
export function legacyTexts(){
 const result=[];
 for(const file of sourceFiles.filter(p=>p.endsWith('.jsx'))){
  const ast=parse(read(file),{sourceType:'module',plugins:['jsx']});let count=0;
  function visit(node,parent){
   if(!node||typeof node!=='object')return;
   let value;
   if(node.type==='JSXText')value=node.value;
   if(node.type==='StringLiteral'&&parent?.type==='JSXAttribute'&&['placeholder','alt','aria-label','title'].includes(parent.name?.name))value=node.value;
   if(node.type==='StringLiteral'&&parent?.type==='CallExpression'&&['setError','setToast'].includes(parent.callee?.name))value=node.value;
   if(node.type==='StringLiteral'&&parent?.type==='ObjectProperty'&&['title','text','label','name','description'].includes(parent.key?.name))value=node.value;
   if(typeof value==='string'&&value.trim())result.push({key:`legacy.${file.split('/').pop().replace('.jsx','')}.${++count}`,value:value.replace(/\s+/g,' ').trim()});
   for(const [key,child] of Object.entries(node)){if(['loc','start','end','extra','comments','tokens'].includes(key))continue;if(Array.isArray(child))child.forEach(n=>visit(n,node));else if(child&&typeof child==='object')visit(child,node)}
  }
  visit(ast,null);
 }
 return result;
}
export function legacyContent(mediaId){
 const aboutParagraphs=["Rulman Teklif olarak İstanbul Dolapdere Sanayi Sitesi’nden Türkiye’nin dört bir yanına rulman ve endüstriyel güç aktarım ürünleri tedarik ediyoruz. Rulman, kayış, zincir, redüktör ve elektrik motoru ihtiyaçlarınız için ürün seçimini ve tedarik sürecini kolaylaştırıyoruz.","SKF, FAG, NSK, NTN, Timken, INA, Koyo, SNR, Gates ve ContiTech gibi markalara ait ürün seçenekleri için bize danışabilirsiniz. Rulman kodu veya ölçüleriyle arama yapabilir, seçtiğiniz ürünler için teknik destek ve fiyat teklifi isteyebilirsiniz."];
 const menus=[{id:'header',name:'Üst menü',status:'published'},{id:'footer',name:'Alt menü',status:'published'}];
 const companyLinks=[['markalar','Markalar'],['hakkimizda','Hakkımızda'],['iletisim','İletişim'],['teklif','Teklif al'],['akademi','Akademi']];
 const menuItems=[...productGroups.slice(0,4).map((g,i)=>({id:'header-group-'+g.id,menu_id:'header',label:g.name,href:'#/urunler/'+g.id,sort_order:i,is_visible:true})),...companyLinks.map(([slug,label],i)=>({id:'header-'+slug,menu_id:'header',label,href:'#/'+slug,sort_order:i+4,is_visible:true})),...productGroups.map((g,i)=>({id:'footer-group-'+g.id,menu_id:'footer',label:g.name,href:'#/urunler/'+g.id,sort_order:i,is_visible:true})),...companyLinks.map(([slug,label],i)=>({id:'footer-'+slug,menu_id:'footer',label:slug==='akademi'?'Rulman Akademisi':label,href:'#/'+slug,sort_order:i+productGroups.length,is_visible:true}))];
 return {
  menus,menuItems,
  settings:[
   {key:'identity',value:{name:company.name,slogan:'ENDÜSTRİYEL ÇÖZÜM ORTAĞINIZ',topbar:'Sanayinin gücü, doğru rulmanla başlar.',logo:mediaId('brand/rulman-teklif.webp'),favicon:mediaId('brand/rulman-teklif.webp')}},
   {key:'contact',value:{phone:company.phone,whatsapp:company.whatsapp,email:company.email,address:company.address,weekdayHours:company.weekdayHours,saturdayHours:company.saturdayHours,social:[],mapUrl:null}},
   {key:'theme',value:{primary:'#00893d',dark:'#26332d',font:'Noto Sans',currency:'TRY'}},
   {key:'search',value:{popularCodes:['6204','6205','30206','6306','22210','6001'],pageSize:24,exactTechnicalSearch:true}},
   {key:'footer',value:{description:'Dolapdere’den Türkiye’ye endüstriyel tedarik ve teknik destek.',ctaTitle:'Birlikte başlayalım.',cta:'Teklif sepetimi aç',disclaimer:'Fiyat, stok ve teslimat bilgileri teklif aşamasında teyit edilir.'}},
   {key:'seo',value:{title:'Rulman Teklif | Gücün Kesintisiz Hali',description:'Rulman Teklif: rulman ve endüstriyel güç aktarım ürünleri. Ürünleri keşfedin, teklif listenizi oluşturun.',analyticsId:'',tagId:''}},
   {key:'announcements',value:{enabled:false,text:'',href:null}},
   {key:'maintenance',value:{enabled:false,message:'Sitemiz kısa süreli bakımda. Lütfen daha sonra tekrar deneyin.'}},
   {key:'quote_ui',value:{whatsappEnabled:true,downloadEnabled:true,defaultPriceMode:'quote'}},
  ],
  pages:[
   {id:'hakkimizda',slug:'hakkimizda',title:'Hakkımızda',status:'published',body:{kind:'about',eyebrow:'DOLAPDERE’DEN TÜM TÜRKİYE’YE',title:'Hareketin arkasındaki güvenilir çözüm ortağınız.',paragraphs:aboutParagraphs,values:['İhtiyaca uygun ürün seçimi','Teknik danışmanlık','Çok markalı ürün seçenekleri','Toplu alım için teklif'],cta:'Teklif listemi hazırla'}},
   {id:'iletisim',slug:'iletisim',title:'İletişim',status:'published',body:{kind:'contact',title:'Bir mesaj kadar yakınız.',contactKey:'contact'}},
   {id:'teklif',slug:'teklif',title:'Teklif al',status:'published',body:{kind:'quote',title:'İhtiyacınızı paylaşın, birlikte doğru ürünü bulalım.',description:'Ürünleri teklif sepetinize ekleyin veya aradığınız kodu yazın. Teklif formunu gönderin veya WhatsApp üzerinden fiyat, stok ve teslimat bilgisi isteyin.',steps:[['Ürünü seçin','Kod, marka veya ölçüyle arayın.'],['Adedi belirleyin','Ürünleri teklif sepetinde bir araya getirin.'],['Talebinizi gönderin','Formla veya WhatsApp üzerinden iletin.']]}},
  ],
  home:[
   {id:'technical-search',kind:'technical_search',sort_order:0,content:{title:'TEKNİK ARAMA',subtitle:'KATALOGDA TAM KOD VEYA ÖLÇÜYE GÖRE SORGULAYIN',statistics:'derived-product-count'}},
   {id:'hero',kind:'hero',sort_order:1,content:{eyebrow:'HAREKETİN OLDUĞU HER YERDE',title:'Güçlü hareket.',highlight:'Kesintisiz üretim.',description:'Rulmandan güç aktarımına, endüstrinizin ihtiyaç duyduğu çözümler tek bir adreste.',button:{text:'Ürünleri keşfet',href:'#/urunler'},image:mediaId('catalog/thumbnails/images_396aa49799f72e8af4aecb24.png-full.webp'),imageAlt:'Oynak makaralı rulmanın iç yapısı',caption:'Yüksek hassasiyet. Güvenilir hareket.',tags:['Hassas mühendislik','Güvenilir çözümler']}},
   {id:'benefits',kind:'benefits',sort_order:2,content:{cards:[['ShieldCheck','Güvenilir ürünler','Kalite odaklı ürün seçimi'],['Truck','Türkiye geneli teslimat','İşinizin olduğu her yere'],['Headphones','Teknik destek','Doğru ürün için yanınızdayız'],['PackageCheck','Geniş ürün seçeneği','Endüstriye özel çözümler']]}},
   {id:'catalog',kind:'catalog',sort_order:3,content:{title:'Doğru ürün, güçlü çözüm.',eyebrow:'İŞİNİZE GÜÇ KATAN ÜRÜNLER'}},
   {id:'academy',kind:'academy',sort_order:4,content:{title:'Rulman Akademisi',description:'Rulman, bakım ve hareket teknolojileri üzerine teknik makaleler.',featuredCount:3}},
  ].map(item=>({...item,is_visible:true,status:'published'})),
 };
}
