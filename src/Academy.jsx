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
   <div className="academy-heading"><div><span className="section-tag">BİLGİYLE DOĞRU SEÇİM</span><Heading id="academy-title">{site.remote?(content?.title||'Rulman Akademisi'):'Rulman Akademisi'}</Heading><p>{site.remote?(content?.description||'Rulman, bakım ve hareket teknolojileri üzerine teknik makaleler.'):'Rulman, bakım ve hareket teknolojileri üzerine teknik makaleler.'}</p></div>{featured&&<a className="outline" href="#/akademi">Tüm makaleler <ArrowRight size={18}/></a>}</div>
   {!featured&&<div className="academy-filters" aria-label="Makale konuları">{['Tümü',...new Set(articles.map(a=>a.category))].map(value=><button key={value} aria-pressed={category===value} onClick={()=>setCategory(value)}>{value}</button>)}</div>}
   <div className="academy-grid">{shown.map(article=><a className="article-card" key={article.slug} href={'#/akademi/'+article.slug}><div className="article-card-image">{article.image&&<img src={imageUrl(article.image)} alt={article.alt} loading="lazy" width="600" height="600"/>}</div><div className="article-card-copy"><div className="article-meta"><span>{article.category}</span><span><Clock size={13}/>{article.minutes} dk okuma</span></div><CardHeading>{article.title}</CardHeading><p>{article.description}</p><span className="article-read">Makaleyi oku <ArrowRight size={18}/></span></div></a>)}</div>
  </div>
 </section>;
}
export default function Academy({slug}) {
 const site=useSite();const articles=site.articles;const [remote,setRemote]=useState(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{if(!site.remote||!slug)return;let active=true;setRemote(null);setError('');site.repository.article(slug,site).then(a=>{if(active)setRemote({slug,article:a})}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[slug,site,attempt]);
 if(site.remote&&slug&&remote?.slug!==slug)return <section className="container catalog-status" role={error?'alert':'status'}><p>{error||'Makale yükleniyor…'}</p>{error&&<button onClick={()=>setAttempt(n=>n+1)}>Tekrar dene</button>}</section>;
 if(!slug)return <><div className="container page-breadcrumb"><a href="#/">Ana sayfa</a><span>/</span><span>Rulman Akademisi</span></div><AcademyCards/></>;
 const article=site.remote?remote?.article:articles.find(a=>a.slug===slug);
 if(!article)return <section className="container not-found"><h1>Makale bulunamadı</h1><a href="#/akademi">Rulman Akademisi’ne dön</a></section>;
 return <article className="academy-article container">
  <a className="article-back" href="#/akademi"><ArrowLeft size={17}/> Rulman Akademisi</a>
  <header className="article-header"><div><span className="section-tag">TEKNİK MAKALE · {article.category}</span><h1>{article.title}</h1><span className="article-duration"><Clock size={15}/>{article.minutes} dk okuma</span><p className="article-intro">{article.intro}</p></div>{article.image&&<img src={imageUrl(article.image)} alt={article.alt} width="600" height="600"/>}</header>
  <div className="article-body">{article.type==='doc'&&<RichContent document={article}/>}{(article.sections||[]).map((section,index)=><section key={section.title}><span className="article-section-number">0{index+1}</span><h2>{section.title}</h2>{section.paragraphs.map(p=><p key={p}>{p}</p>)}</section>)}
   {article.type!=='doc'&&<><aside className="article-takeaway"><BookOpen size={25}/><div><h2>Seçim yaparken</h2><p>{article.takeaway}</p></div></aside>
   <section className="article-references"><h2>Standartlar ve ileri okuma</h2><ul>{(article.references||[]).map(reference=><li key={reference}>{reference}</li>)}</ul><p>Rulman Teklif teknik rehberidir; hakemli akademik yayın değildir. Hesap ve seçimlerde güncel standartların tam metni ile ilgili ürünün üretici verileri esas alınmalıdır.</p></section>
   </>}<div className="article-cta"><h2>Uygulamanız için doğru ürünü bulalım.</h2><p>Tam ürün kodu veya ölçüyle katalogda arayın; teknik bilgilerinizle teklif isteyin.</p><a className="primary" href="#/teknik-arama">Teknik aramaya geç <ArrowRight size={18}/></a></div>
  </div>
 </article>;
}
