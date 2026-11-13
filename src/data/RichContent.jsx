import React from 'react';import {safeLink} from './repository';import {useSite} from './SiteContext';
export default function RichContent({document}){
 const site=useSite();
 function node(value,key){
  if(!value||typeof value!=='object')return null;const children=value.content?.map((child,index)=>node(child,index));
  switch(value.type){
   case 'doc':return <React.Fragment key={key}>{children}</React.Fragment>;
   case 'text':{let text=value.text||'';for(const mark of value.marks||[]){if(mark.type==='bold')text=<strong>{text}</strong>;else if(mark.type==='italic')text=<em>{text}</em>;else if(mark.type==='underline')text=<u>{text}</u>;else if(mark.type==='link')text=<a href={safeLink(mark.attrs?.href)} rel="noopener noreferrer">{text}</a>}return <React.Fragment key={key}>{text}</React.Fragment>}
   case 'paragraph':return <p key={key}>{children}</p>;
   case 'heading':{const Heading='h'+Math.max(2,Math.min(4,Number(value.attrs?.level)||2));return <Heading key={key}>{children}</Heading>}
   case 'bulletList':return <ul key={key}>{children}</ul>;case 'orderedList':return <ol key={key}>{children}</ol>;case 'listItem':return <li key={key}>{children}</li>;case 'blockquote':return <blockquote key={key}>{children}</blockquote>;case 'hardBreak':return <br key={key}/>;
   case 'image':{const media=site.media.get(value.attrs?.mediaId);return media?<img key={key} src={media.full} alt={value.attrs?.alt||media.alt} loading="lazy" style={{maxWidth:'100%',height:'auto'}}/>:null}
   default:return null;
  }
 }
 return <div className="rich-content">{node(document,0)}</div>;
}
