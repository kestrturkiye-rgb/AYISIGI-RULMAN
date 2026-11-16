import React from 'react';
import {useSite} from '../data/SiteContext';
import {translate as t} from '../i18n/core.js';
import {publicHref} from './urls.js';
import {categoryContent,relatedResources} from './content.js';
import './guides.css';
export function RelatedResources({group,product,article}){
 const site=useSite(),links=relatedResources({site,group,product,article,language:site.language});
 if(!links.length)return null;
 return <aside className="seo-resources"><h2>{t('İlgili kategoriler ve teknik rehberler')}</h2><ul>{links.map(link=><li key={link.href}><a href={publicHref(link.href)}>{link.label}</a></li>)}</ul></aside>;
}
export default function CatalogGuide({group}){
 const site=useSite(),copy=categoryContent(group,{language:site.language,siteName:site.company.name,entries:site.settings.localization?.entries});
 return <section className="container catalog-guide"><h2>{copy.heading}</h2>{copy.intro&&<p>{copy.intro}</p>}{copy.paragraphs.map(paragraph=><p key={paragraph}>{paragraph}</p>)}
  {!group&&<ul className="seo-category-links">{site.groups.map(g=><li key={g.id}><a href={publicHref('/urunler/'+g.id)}>{t(g.name)}</a></li>)}</ul>}
  <a className="outline" href={publicHref('/teknik-arama')}>{t('Kod veya ölçüyle ürün ara')}</a><RelatedResources group={group}/>
 </section>;
}
