import React,{createContext,useContext,useEffect} from 'react';
import {company} from '../company';import {productGroups} from '../catalog-groups';import {articles} from '../academy-data';
export const staticSite={remote:false,company,groups:productGroups,articles,pages:[],home:[],menus:[],settings:{},identity:{},media:new Map(),uiTexts:{}};
const Context=createContext(staticSite);
export const useSite=()=>useContext(Context);
const darken=(color,factor)=>'#'+color.slice(1).match(/../g).map(v=>Math.round(parseInt(v,16)*factor).toString(16).padStart(2,'0')).join('');
export function SiteProvider({value,children}){
 useEffect(()=>{
  if(!value.remote)return;
  const root=document.documentElement,previous=root.style.cssText;const theme=value.settings.theme||{};
  if(/^#[a-f0-9]{6}$/i.test(theme.primary)){root.style.setProperty('--green',theme.primary);root.style.setProperty('--red',theme.primary);root.style.setProperty('--primary-hover',darken(theme.primary,.78));root.style.setProperty('--primary-text',darken(theme.primary,.8))}
  if(/^#[a-f0-9]{6}$/i.test(theme.dark))root.style.setProperty('--navy',theme.dark);
  const fonts={'Noto Sans':"'Noto Sans',Arial,sans-serif",Arial:'Arial,sans-serif','system-ui':'system-ui,sans-serif'};if(fonts[theme.font])root.style.setProperty('--site-font',fonts[theme.font]);
  const favicon=document.querySelector('link[rel="icon"]'),oldIcon=favicon?.href;if(favicon&&value.identity.faviconUrl)favicon.href=value.identity.faviconUrl;
  return()=>{root.style.cssText=previous;if(favicon&&oldIcon)favicon.href=oldIcon};
 },[value]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
