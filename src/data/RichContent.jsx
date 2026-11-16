import {translate as t} from '../i18n/core.js';
import React from 'react';import {safeLink} from './repository';import {useSite} from './SiteContext';
export default function RichContent({document}){
 const site=useSite();
 function node(value,key){
  if(!value||typeof value!=='object')return null;const children=value.content?.map((child,index)=>node(child,index));
  switch(value.type){
   case 'doc':return <React.Fragment key={key}>{t(children)}</React.Fragment>;
   case 'text':{let text=value.text||'';for(const mark of value.marks||[]){if(mark.type==='bold')text=<strong>{t(text)}</strong>;else if(mark.type==='italic')text=<em>{t(text)}</em>;else if(mark.type==='underline')text=<u>{t(text)}</u>;else if(mark.type==='link')text=<a href={safeLink(mark.attrs?.href)} rel="noopener noreferrer">{t(text)}</a>}return <React.Fragment key={key}>{t(text)}</React.Fragment>}
   case 'paragraph':return <p key={key}>{t(children)}</p>;
   case 'heading':{const Heading='h'+Math.max(2,Math.min(4,Number(value.attrs?.level)||2));return <Heading key={key}>{t(children)}</Heading>}
   case 'bulletList':return <ul key={key}>{t(children)}</ul>;case 'orderedList':return <ol key={key}>{t(children)}</ol>;case 'listItem':return <li key={key}>{t(children)}</li>;case 'blockquote':return <blockquote key={key}>{t(children)}</blockquote>;case 'hardBreak':return <br key={key}/>;
   case 'image':{const media=site.media.get(value.attrs?.mediaId);return media?<img key={key} src={media.full} alt={t(value.attrs?.alt||media.alt)} loading="lazy" style={{maxWidth:'100%',height:'auto'}}/>:null}
   default:return null;
  }
 }
 return <div className="rich-content">{t(node(document,0))}</div>;
}
