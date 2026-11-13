import React, { useState } from 'react';
import { Search, Flame, Ruler, Database, FileText } from 'lucide-react';
import { emptyTechnicalQuery, parseTechnicalQuery } from './technical-search';
import './technical-search.css';
import {useSite} from './data/SiteContext';
import {formatCount} from './catalog-utils';

const popularCodes = ['6204', '6205', '30206', '6306', '22210', '6001'];

export default function TechnicalSearch({ onSearch, productCount, standalone=false }) {
  const site=useSite();const popularCodes=site.remote?(site.settings.search?.popularCodes||[]):['6204','6205','30206','6306','22210','6001'];
  const content=site.home.find(s=>s.kind==='technical_search')?.content;
  const [fields, setFields] = useState({ ...emptyTechnicalQuery });
  const [error, setError] = useState('');
  function submit(event) {
    event.preventDefault();
    const result = parseTechnicalQuery(fields);
    setError(result.error || '');
    if (result.query) onSearch(result.query);
  }
  function popular(code) {
    setFields({ ...emptyTechnicalQuery, code });
    setError('');
    onSearch({ code });
  }
  const Heading=standalone?'h1':'h2';
  return <section className="technical-section" aria-labelledby="technical-title">
    <div className="container">
      <div className="technical-card">
        <Heading id="technical-title">{site.remote?(content?.title||'TEKNİK ARAMA'):<>TEKNİK <span>ARAMA</span></>}</Heading>
        <p className="technical-subtitle">{site.remote?(content?.subtitle||'KATALOGDA TAM KOD VEYA ÖLÇÜYE GÖRE SORGULAYIN'):'KATALOGDA TAM KOD VEYA ÖLÇÜYE GÖRE SORGULAYIN'}</p>
        <form onSubmit={submit} noValidate aria-label="Teknik rulman arama">
          <div className="technical-fields">
            <label className="technical-code">TAM RULMAN NO<input value={fields.code} onChange={e=>setFields({...fields,code:e.target.value})} placeholder="Örn: 6204" autoComplete="off" aria-describedby="technical-help technical-error"/></label>
            {[{key:'inner',label:'d (İÇ)',name:'İç çap (mm)'},{key:'outer',label:'D (DIŞ)',name:'Dış çap (mm)'},{key:'width',label:'B (EN)',name:'En (mm)'}].map(field=><label key={field.key}>{field.label}<input aria-label={field.name} inputMode="decimal" value={fields[field.key]} onChange={e=>setFields({...fields,[field.key]:e.target.value})} placeholder="mm" aria-describedby="technical-help technical-error"/></label>)}
          </div>
          <p id="technical-help" className="technical-help">Ölçüler milimetre cinsindedir. Birden fazla alan doldurursanız tüm koşullar birlikte eşleştirilir.</p>
          <p id="technical-error" className="technical-error" role="alert">{error}</p>
          <button className="technical-submit" type="submit"><Search size={19}/> SİSTEMDE SORGULA</button>
        </form>
        <div className="popular-codes"><span><Flame size={17}/> POPÜLER</span>{popularCodes.map(code=><button key={code} type="button" onClick={()=>popular(code)} aria-label={`${code} kodunu sorgula`}>{code}</button>)}</div>
      </div>
      <div className="technical-features">
        <div><strong>{formatCount(productCount)}</strong><span>KATALOG ÜRÜNÜ<br/>KOD VE ÖLÇÜ İLE ARAMA</span><Database size={24}/></div>
        <div><strong><FileText size={42}/></strong><span>ÜRÜNÜNÜZÜ SEÇİN<br/>TEKLİF LİSTESİ OLUŞTURUN</span></div>
        <div><strong><Ruler size={43}/></strong><span>İÇ ÇAP, DIŞ ÇAP VE EN<br/>ÖLÇÜLERİYLE ARAMA</span></div>
      </div>
    </div>
  </section>;
}
