import {articlesEn} from './i18n/articles-en.js';
import {translate as t} from './i18n/core.js';
import {publicHref} from './seo/urls.js';
import {RelatedResources} from './seo/CatalogGuide';
import React, {useState,useEffect} from 'react';
import {ArrowRight, ArrowLeft, Clock, BookOpen} from 'lucide-react';
import {useSite} from './data/SiteContext';
import RichContent from './data/RichContent';
import {publicAssetPath} from './catalog-utils';

const imageUrl=path=>path?publicAssetPath(path,import.meta.env.BASE_URL):undefined;
export function AcademyCards({featured=false}) {
 const site=useSite();const articles=site.articles;const content=site.home.find(s=>s.kind==='academy')?.content;
 const [category,setCategory]=useState('Tümü');
 const Heading=featured?'h2':'h1';
 const CardHeading=featured?'h3':'h2';
 const shown=featured?articles.slice(0,site.remote?(content?.featuredCount??3):3):articles.filter(article=>category==='Tümü'||article.category===category);
 return <section className={'academy-section '+(featured?'academy-featured':'container')} aria-labelledby="academy-title">
  <div className={featured?'container':undefined}>
   <div className="academy-heading"><div><span className="section-tag">{t("BİLGİYLE DOĞRU SEÇİM")}</span><Heading id="academy-title">{t(site.remote?(content?.title||'Rulman Akademisi'):'Rulman Akademisi')}</Heading><p>{t(site.remote?(content?.description||'Rulman, bakım ve hareket teknolojileri üzerine teknik makaleler.'):'Rulman, bakım ve hareket teknolojileri üzerine teknik makaleler.')}</p></div>{t(featured&&<a className="outline" href="#/akademi">{t("Tüm makaleler ")}<ArrowRight size={18}/></a>)}</div>
   {t(!featured&&<div className="academy-filters" aria-label={t("Makale konuları")}>{t(['Tümü',...new Set(articles.map(a=>a.category))].map(value=><button key={value} aria-pressed={category===value} onClick={()=>setCategory(value)}>{t(value)}</button>))}</div>)}
   <div className="academy-grid">{t(shown.map(article=><a className="article-card" key={article.slug} href={publicHref('/akademi/'+article.slug)}><div className="article-card-image">{t(article.image&&<img src={imageUrl(article.image)} alt={t(article.alt)} loading="lazy" width="600" height="600"/>)}</div><div className="article-card-copy"><div className="article-meta"><span>{t(article.category)}</span><span><Clock size={13}/>{t(article.minutes)}{t(" dk okuma")}</span></div><CardHeading>{t(article.title)}</CardHeading><p>{t(article.description)}</p><span className="article-read">{t("Makaleyi oku ")}<ArrowRight size={18}/></span></div></a>))}</div>
  </div>
 </section>;
}
export default function Academy({slug}) {
 const site=useSite();const articles=site.articles;const [remote,setRemote]=useState(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{if(!site.remote||!slug)return;let active=true;setRemote(null);setError('');site.repository.article(slug,site).then(a=>{if(active)setRemote({slug,article:a})}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[slug,site.repository,site.revision,attempt]);
 if(site.remote&&slug&&remote?.slug!==slug)return <section className="container catalog-status" role={error?'alert':'status'}><p>{t(error||'Makale yükleniyor…')}</p>{t(error&&<button onClick={()=>setAttempt(n=>n+1)}>{t("Tekrar dene")}</button>)}</section>;
 if(!slug)return <><div className="container page-breadcrumb"><a href="#/">{t("Ana sayfa")}</a><span>{t("/")}</span><span>{t("Rulman Akademisi")}</span></div><AcademyCards/></>;
 const original=site.remote?remote?.article:articles.find(a=>a.slug===slug);
 const edition=site.language==='en'?articlesEn[slug]:null;const article=edition&&original?{...original,...edition}:original;
 if(!article)return <section className="container not-found"><h1>{t("Makale bulunamadı")}</h1><a href="#/akademi">{t("Rulman Akademisi’ne dön")}</a></section>;
 return <article className="academy-article container">{site.language==='en'&&!edition&&<p className="language-note">An English edition has not been added yet. Untranslated passages are shown in their original language.</p>}
  <a className="article-back" href="#/akademi"><ArrowLeft size={17}/>{t(" Rulman Akademisi")}</a>
  <header className="article-header"><div><span className="section-tag">{t("TEKNİK MAKALE · ")}{t(article.category)}</span><h1>{t(article.title)}</h1><span className="article-duration"><Clock size={15}/>{t(article.minutes)}{t(" dk okuma")}</span><p className="article-intro">{t(article.intro)}</p></div>{t(article.image&&<img src={imageUrl(article.image)} alt={t(article.alt)} width="600" height="600"/>)}</header>
  <div className="article-body">{t(article.type==='doc'&&<RichContent document={article}/>)}{t((article.sections||[]).map((section,index)=><section key={section.title}><span className="article-section-number">{t("0")}{t(index+1)}</span><h2>{t(section.title)}</h2>{t(section.paragraphs.map(p=><p key={p}>{t(p)}</p>))}</section>))}
   {t(article.type!=='doc'&&<><aside className="article-takeaway"><BookOpen size={25}/><div><h2>{t("Seçim yaparken")}</h2><p>{t(article.takeaway)}</p></div></aside>
   <section className="article-references"><h2>{t("Standartlar ve ileri okuma")}</h2><ul>{t((article.references||[]).map(reference=><li key={reference}>{t(reference)}</li>))}</ul><p>{t("Rulman Teklif teknik rehberidir; hakemli akademik yayın değildir. Hesap ve seçimlerde güncel standartların tam metni ile ilgili ürünün üretici verileri esas alınmalıdır.").replace('Rulman Teklif',site.company.name)}</p></section>
   </>)}<RelatedResources article={{slug}}/><div className="article-cta"><h2>{t("Uygulamanız için doğru ürünü bulalım.")}</h2><p>{t("Tam ürün kodu veya ölçüyle katalogda arayın; teknik bilgilerinizle teklif isteyin.")}</p><a className="primary" href="#/teknik-arama">{t("Teknik aramaya geç ")}<ArrowRight size={18}/></a></div>
  </div>
 </article>;
}
