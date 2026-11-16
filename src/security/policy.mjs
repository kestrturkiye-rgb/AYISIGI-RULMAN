export const AUTH_ORIGIN='https://rulman-teklif-admin.vercel.app';
export const CUSTOM_ORIGIN='https://rulmanteklif.com';
export const AUTH_ORIGINS=Object.freeze([AUTH_ORIGIN,CUSTOM_ORIGIN,'https://www.rulmanteklif.com']);
export function requestAuthOrigin(host){return AUTH_ORIGINS.find(origin=>new URL(origin).host===host)||null;}
export function publicServiceUrl(path,location=globalThis.location){
 const origin=AUTH_ORIGINS.includes(location?.origin)?location.origin:AUTH_ORIGIN;
 return origin+path;
}
export const PASSWORD_MIN=12;
export const PASSWORD_MAX=128;
export function passwordProblem(value){return typeof value!=='string'||value.length<PASSWORD_MIN?`Parolanız en az ${PASSWORD_MIN} karakter olmalı.`:value.length>PASSWORD_MAX?'Parola çok uzun.':'';}
export function canonicalAuthTarget(location,{admin=false}={}){
 if(location.hostname!=='kestrturkiye-rgb.github.io')return null;
 return AUTH_ORIGIN+(admin?'/admin/':'/')+location.search+location.hash;
}
