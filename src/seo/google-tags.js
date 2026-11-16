import {stripLanguage} from '../i18n/core.js';
export function googleConfig(value={}){return {analyticsId:/^G-[A-Z0-9]{4,20}$/.test(value.analyticsId||'')?value.analyticsId:'',adsId:/^AW-\d{5,20}$/.test(value.adsId||'')?value.adsId:'',adsLeadLabel:/^[A-Za-z0-9_-]{3,100}$/.test(value.adsLeadLabel||'')?value.adsLeadLabel:''};}
export function createGoogleTags({window,document}){
 let config={},analytics=false,ads=false,script=null;const configured=new Set(),leads=new Set();
 const command=(...args)=>{window.dataLayer??=[];window.dataLayer.push(args);};
 function removeCookies(){for(const entry of String(document.cookie||'').split(';')){const name=entry.split('=')[0].trim();if(!/^(_ga(?:_|$)|_gid$|_gat|_gcl_)/.test(name))continue;for(const domain of ['',window.location.hostname,'.rulmanteklif.com'])document.cookie=name+'=; Max-Age=0; Path=/; Secure; SameSite=Lax'+(domain?'; Domain='+domain:'');}}
 return {
  configure(value,permission){config=googleConfig(value);analytics=permission.analytics===true;ads=permission.ads===true;const canAnalytics=analytics&&!!config.analyticsId,canAds=ads&&!!config.adsId;
   for(const id of [config.analyticsId].filter(Boolean))window['ga-disable-'+id]=!canAnalytics;
   if(!script&&(canAnalytics||canAds)){
    command('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});command('js',new Date());
    script=document.createElement('script');script.async=true;script.id='rt-google-tag';script.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(canAnalytics?config.analyticsId:config.adsId);document.head.append(script);
   }
   if(script){command('consent','update',{analytics_storage:canAnalytics?'granted':'denied',ad_storage:canAds?'granted':'denied',ad_user_data:'denied',ad_personalization:'denied'});}
   if(!canAnalytics&&!canAds)removeCookies();
   for(const [id,allowed]of [[config.analyticsId,canAnalytics],[config.adsId,canAds]])if(id&&allowed&&!configured.has(id)){command('config',id,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false});configured.add(id);}
  },
  page(path,title){if(!analytics||!config.analyticsId||/^\/(hesabim|teklif|admin)(\/|$)/.test(stripLanguage(path)))return;command('event','page_view',{send_to:config.analyticsId,page_location:'https://rulmanteklif.com'+path.split('?')[0],page_referrer:'',page_title:title});},
  lead(id){if(!/^[A-Za-z0-9-]{1,100}$/.test(String(id))||leads.has(id))return;leads.add(id);if(leads.size>100)leads.delete(leads.values().next().value);if(analytics&&config.analyticsId)command('event','generate_lead',{send_to:config.analyticsId});if(ads&&config.adsId&&config.adsLeadLabel)command('event','conversion',{send_to:config.adsId+'/'+config.adsLeadLabel,transaction_id:id});},
 };
}
export function trackGoogleLead(id){globalThis.dispatchEvent?.(new CustomEvent('rt-quote-received',{detail:{id}}));}
