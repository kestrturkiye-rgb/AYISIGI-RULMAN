export const CONSENT_KEY='rt-cookie-consent-v2';
export const POLICY_VERSION='2026-11-14-v1';
export const CONSENT_TTL=180*86400000;
export const CONSENT_EVENT='rt-consent-change';
let memory=null;
export function readConsent({storage,now=Date.now()}={}){
 try{storage??=globalThis.localStorage;const value=JSON.parse(storage?.getItem(CONSENT_KEY)||'null');return validConsent(value,now)?value:null;}catch{return validConsent(memory,now)?memory:null;}
}
export function validConsent(value,now=Date.now()){return !!value&&value.version===POLICY_VERSION&&['yes','no'].includes(value.choice)&&Number.isFinite(value.time)&&value.time<=now&&now-value.time<CONSENT_TTL;}
export function saveConsent(choice,{storage,now=Date.now(),notify=true,ads=false,googleAnalytics=false}={}){
 if(!['yes','no'].includes(choice))throw Error('Geçersiz çerez tercihi.');const value={version:POLICY_VERSION,choice,time:now,ads:ads===true,googleAnalytics:googleAnalytics===true};memory=value;
 try{storage??=globalThis.localStorage;storage?.setItem(CONSENT_KEY,JSON.stringify(value));storage?.removeItem('rt-analysis-consent-v1');}catch{}
 if(notify)globalThis.dispatchEvent?.(new Event(CONSENT_EVENT));return value;
}
export function privacyRequested(navigator=globalThis.navigator){return navigator?.globalPrivacyControl===true||navigator?.doNotTrack==='1';}
export function analyticsConsent(options={}){return !privacyRequested(options.navigator)&&readConsent(options)?.choice==='yes';}
export function openCookiePreferences(){globalThis.dispatchEvent?.(new Event('rt-analysis-preferences'));}

export function marketingConsent(options={}){return !privacyRequested(options.navigator)&&readConsent(options)?.ads===true;}
export function googleAnalyticsConsent(options={}){return !privacyRequested(options.navigator)&&readConsent(options)?.googleAnalytics===true;}
