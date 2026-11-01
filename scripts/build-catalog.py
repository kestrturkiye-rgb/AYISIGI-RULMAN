"""Build the local, source-traceable catalog from retained public source responses.

Usage: PYTHONPATH=/tmp/catalog-python python scripts/build-catalog.py --cache /workspace/shared/catalog-cache
Requires beautifulsoup4. Does not make network requests or copy source prices/stock.
"""
import argparse, collections, gzip, hashlib, html, importlib.util, json, pathlib, re, shutil, urllib.parse, xml.etree.ElementTree as ET
from datetime import datetime, timezone
from bs4 import BeautifulSoup, SoupStrainer
_skf_spec=importlib.util.spec_from_file_location('skf_data',pathlib.Path(__file__).with_name('skf-data.py'))
_skf_data=importlib.util.module_from_spec(_skf_spec);_skf_spec.loader.exec_module(_skf_data)

BRANDS = ['SKF','FAG','INA','NSK','NTN','TIMKEN','KOYO','JTEKT','IKO','THK','HIWIN','SNR','NACHI','URB','ZKL','ORS','CSK','RLX','CMSA','CNR','KREX','GRW','NSC','KOLBEN','SONG','EZO','NMB','RHP','Schaeffler','INA/FAG','FYH','ASAHI','KBC','NIS','ZEN','SFK','BDR','KWC']
BRAND_PATTERN=re.compile(r'(?<![A-Z0-9])('+'|'.join(map(re.escape,sorted(BRANDS,key=len,reverse=True)))+r')(?![A-Z0-9])',re.I)
UNKNOWN='Belirtilmemiş'
def text(value):return re.sub(r'\s+',' ',html.unescape(value or '')).strip()
def normalize(value):return re.sub(r'[\s-]+','',value.upper())
def number(value):
 value=text(value)
 if re.fullmatch(r'\d+(?:[.,]\d+)?',value):
  value=float(value.replace(',','.'))
  return value if value>0 else None
 return None
def classify(path):
 p=path.lower()
 if any(w in p for w in ['industrial-seals','yağ keçe','yag-kece','sızdırmaz','sizdirmaz','nilos','segman']):return 'Sızdırmazlık elemanları'
 if any(w in p for w in ['condition-monitor','durum izleme','analizör','microlog']):return 'Durum izleme'
 if any(w in p for w in ['lubric','yağlar','yaglar','yağlama','yaglama']):return 'Yağlama'
 if any(w in p for w in ['maintenance','montaj','tamir bakım','hırdavat','hirda','aletleri']):return 'Montaj ve demontaj'
 if any(w in p for w in ['kaplin','coupling']):return 'Kaplinler'
 if any(w in p for w in ['sprocket','dişli','disli']):return 'Dişliler'
 if any(w in p for w in ['pulley','pulleys','kasnak']):return 'Kasnaklar'
 if any(w in p for w in ['belt','kayış','kayis']):return 'Kayışlar'
 if any(w in p for w in ['chain','zincir']):return 'Zincirler'
 if any(w in p for w in ['yataklı','yatakli','yatak ünite','yatak-unite','bearing-units','insert-bearings','mounted-bearings/roller-bearing-units']):return 'Yataklı rulmanlar'
 if any(w in p for w in ['bearing-housings','yatak-yuva','rulman yatak','yatakları','yataklari']):return 'Rulman yatakları'
 if any(w in p for w in ['plain-bearings/spherical','rod-end','mafsal']):return 'Mafsallı yataklar'
 if any(w in p for w in ['bushing','burç','burc']):return 'Burçlar'
 if any(w in p for w in ['vidalı mil','vidali-mil','vidalı somun','vidali-somun','trapez']):return 'Vidalı miller'
 if any(w in p for w in ['mil tutucu','mil-tutucu','destek mil','destek-mil']):return 'Mil tutucular'
 if any(w in p for w in ['lineer arabalar','lineer-arabalar','lineer ray','lineer-ray','kızak','kizak']):return 'Lineer kılavuzlar'
 if any(w in p for w in ['lineer rulman','lineer-rulman','linear-bearing']):return 'Lineer rulmanlar'
 if any(w in p for w in ['accessories','somun','manşon','manson','yedek parça','yedek-parca','aksesu','parcalari']):return 'Aksesuarlar'
 if 'super-precision' in p:return 'Hassas rulmanlar'
 if any(w in p for w in ['iğne','igne','needle']):return 'İğneli rulmanlar'
 if any(w in p for w in ['thrust','eksenel']):return 'Eksenel rulmanlar'
 if any(w in p for w in ['roller-bearing','makaralı','makarali','silindirik','konik','masura']):return 'Makaralı rulmanlar'
 if any(w in p for w in ['ball-bearing','bilyalı','bilyali','misket','minyatür','minyatur','6000-serisi','6200-serisi','6300-serisi','61800-serisi','61900-serisi','16000-serisi','7000-serisi','7200-serisi']):return 'Bilyalı rulmanlar'
 if any(w in p for w in ['özel rulman','ozel-rulman','thin-section','otomotiv','makinaları','makinalari','rulmanlar']):return 'Özel rulmanlar'
 if 'power-transmission' in p or 'aktarma' in p:return 'Güç aktarım'
 return 'Diğer ürünler'

def extract_specs(markup):
 soup=BeautifulSoup(markup or '', 'html.parser');specs=[];dims={}
 for row in soup.select('tr'):
  cells=row.find_all(['td','th'],recursive=False)
  if len(cells)!=2:continue
  label,value=[text(c.get_text(' ',strip=True)) for c in cells]
  if not label or not value or len(label)>140 or len(value)>160:continue
  if [label,value] not in specs:specs.append([label,value])
  label_lower=label.lower().replace('\u0307','')
  # Only explicit outer/inner diameters and B/bearing width become search dimensions.
  # Housing center/height, shaft diameters and similarly named dimensions are not substituted.
  key=None
  if re.search(r'^i[çc]\s*[çc]ap',label_lower):key='inner'
  elif re.search(r'^d[ıişi]+[şs]?\s*[çc]ap',label_lower) and not re.search(r'd[123]|D[123]',label):key='outer'
  elif re.fullmatch(r'geni[şs]lik\s*(?:[Øø]\s*)?\(mm\)\s*:\s*[Bb]?\s*',label_lower):key='width'
  val=number(value)
  if key and val is not None and key not in dims:dims[key]=val
 return specs,dims

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--cache',default='/workspace/shared/catalog-cache');parser.add_argument('--out',default='public/catalog');args=parser.parse_args()
 cache=pathlib.Path(args.cache);out=pathlib.Path(args.out);out.mkdir(parents=True,exist_ok=True)
 image_manifest=json.loads((cache/'images/manifest.json').read_text()) if (cache/'images/manifest.json').exists() else {}
 if image_manifest:
  (out/'images').mkdir(exist_ok=True)
  for filename in set(image_manifest.values()):shutil.copyfile(cache/'images'/filename,out/'images'/filename)
 records={};raw_counts=collections.Counter();conflicts=[];invalid_dimensions=[]
 def add(p):
  raw_counts[p['sourceKey']]+=1
  key=(p['brand'].upper(),normalize(p['code'])) if p['brand']!=UNKNOWN else (p['sourceKey'],p['nativeId'])
  if key in records:
   old=records[key]
   for ref in p['refs']:
    if ref not in old['refs']:old['refs'].append(ref)
   for dim,val in p.get('dimensions',{}).items():
    if dim in old['dimensions'] and old['dimensions'][dim]!=val:
     conflicts.append({'code':p['code'],'brand':p['brand'],'dimension':dim,'kept':old['dimensions'][dim],'other':val,'source':p['refs'][0]})
    else:old['dimensions'][dim]=val
   if p.get('specs') and not old.get('specs'):old['specs']=p['specs']
   if p.get('image') and not old.get('image'):
    old['image']=p['image'];old['imageKind']=p.get('imageKind','product')
   if p.get('title') and not old.get('title'):old['title']=p['title']
   return
  p['id']='p-'+hashlib.sha256('|'.join(key).encode()).hexdigest()[:20];records[key]=p

 # Detailed public STS API: never retain supplier prices, stock or checkout fields.
 sts_manifest=json.loads((cache/'sts/manifest.json').read_text())
 for page in range(1,sts_manifest['pages']+1):
  for p in json.loads((cache/f'sts/page-{page}.json').read_text()):
   name=text(p['name']);markup=p.get('short_description','')+'\n'+p.get('description','')
   specs,dims=extract_specs(markup)
   brand_match=BRAND_PATTERN.search(name.translate(str.maketrans('İı','Ii')))
   brand=brand_match.group().upper() if brand_match else UNKNOWN
   if not brand_match:
    for label,val in specs:
     if 'marka' in label.lower() and len(val)<35:brand=val.upper();break
   # Keep original title for display and a conservative, suffix-preserving designation.
   code=name[:brand_match.start()].strip() if brand_match and brand_match.start()>0 else name
   code=re.split(r'\b(?:Rulman|Lineer|Flanşlı|Flaşlı|Segman|Kanallı|Oynak|Sabit|Yataklı|Minyatür|Emniyet|Sıkma|Sikma|Sac|Kayış|Kasnak|Zincir|Teflon|Burç|Burc|Paslanmaz|Kaplin|Tamir|Keçe|Kece)\b',code,flags=re.I)[0].strip(' -_') or name
   category_path=' '.join(c['name'] for c in p.get('categories',[]))
   # Deepest category paths distinguish linear carriages from linear ball bushings.
   category_links=' '.join(c.get('link','') for c in p.get('categories',[]))
   category=classify(category_links+' '+category_path+' '+name)
   images=p.get('images') or [];image=(images[0].get('thumbnail') or images[0].get('src')) if images else None
   if image and urllib.parse.urlsplit(image).hostname!='stsrulman.com.tr':image=None
   add({'code':code,'brand':brand,'category':category,'title':name,'dimensions':dims,'specs':specs,'image':image,'sourceKey':'sts','nativeId':str(p['id']),'refs':[['sts',p['permalink']]],'baseCode':code.split()[0] if re.match(r'^\d{3,6}(?:\s|$)',code) else None})
 print('Normalized STS',raw_counts['sts'],flush=True)

 # SKF publishes designation + product family URLs. Sitemap data contains no dimensions.
 skf_urls=[]
 for f in sorted((cache/'skf').glob('tr-*.xml')):
  skf_urls.extend(n.text for n in ET.parse(f).iter() if n.tag.endswith('loc') and n.text and '/productid-' in n.text)
 for url in dict.fromkeys(skf_urls):
  code=urllib.parse.unquote(url.split('/productid-',1)[1]);path=url.split('/productid-',1)[0]
  if urllib.parse.urlsplit(url).hostname!='www.skf.com':continue
  add({'code':code,'brand':'SKF','category':classify(path),'title':'','dimensions':{},'specs':[],'image':None,'sourceKey':'skf','nativeId':code,'refs':[['skf',url]],'baseCode':re.match(r'^(\d{3,6})(?:[\s/\-]|$)',code)[1] if re.match(r'^(\d{3,6})(?:[\s/\-]|$)',code) else None})
 print('Normalized SKF',raw_counts['skf'],flush=True)

 # Rulman Toptancisi exposes technical tables on series/category pages.
 rt_manifest=json.loads((cache/'rt/manifest.json').read_text()) if (cache/'rt/manifest.json').exists() else {'pages':{},'failures':[]}
 for page_number,(url,meta) in enumerate(sorted(rt_manifest['pages'].items()),1):
  soup=BeautifulSoup((cache/'rt'/meta['file']).read_text(),'html.parser',parse_only=SoupStrainer(['table','ol','img']))
  if page_number%500==0:print(f'Normalized RT tables: {page_number}/{len(rt_manifest["pages"])}',flush=True)
  breadcrumbs=[a.get_text(' ',strip=True) for a in soup.select('.breadcrumb a')]
  category_hint=' '.join(breadcrumbs+meta.get('headings',[]))+' '+url
  category=classify(category_hint)
  series_image=next((im.get('src') for im in soup.select('img[src]') if '/uploads/catalog/200x200/' in im['src'] or '/uploads/belt/' in im['src']),None)
  if series_image and urllib.parse.urlsplit(series_image).hostname!='rulmantoptancisi.com':series_image=None
  for table in soup.select('table'):
   headers=[text(c.get_text(' ',strip=True)) for c in table.select('thead th')]
   if not headers:continue
   dim_columns={}
   for i,label in enumerate(headers):
    if 'İç' in label or 'İÇ' in label:dim_columns['inner']=i
    elif 'Dış' in label or 'DIŞ' in label:dim_columns['outer']=i
    elif 'En' in label or label in ['B','B (mm)']:dim_columns['width']=i
   for row in table.select('tbody tr'):
    cells=row.find_all('td',recursive=False)
    if not cells:continue
    belt=cells[0].select_one('a[href*="/beltCatalog/"]')
    if belt and '/beltCatalog/' in url:
     code=text(belt.get_text(' ',strip=True));specs=[]
     for i,label in enumerate(headers[1:],1):
      if i<len(cells) and 'fiyat' not in label.lower():specs.append([label,text(cells[i].get_text(' ',strip=True))])
     add({'code':code,'brand':UNKNOWN,'category':'Kayışlar','title':code+' zaman kayışı','dimensions':{},'specs':specs,'image':series_image,'imageKind':'series','sourceKey':'rt','nativeId':belt['href'],'refs':[['rt',belt['href']],['rt',url]],'baseCode':None})
    if headers[0].upper()=='YATAK KODU':
     code=text(cells[0].get_text(' ',strip=True))
     add({'code':code,'brand':UNKNOWN,'category':'Yataklı rulmanlar','title':code+' yataklı rulman','dimensions':{},'specs':[],'image':None,'sourceKey':'rt','nativeId':url+'#'+code,'refs':[['rt',url]],'baseCode':None})
    # Brand variants explicitly listed by the source (price values are discarded).
    if headers[0].upper()=='SERİ':
     for i,cell in enumerate(cells[1:],1):
      variant=cell.select_one('a[href*="/i/"]')
      if not variant or i>=len(headers):continue
      brand=headers[i].upper();label=variant.get('title','');code=re.sub(r'\s+Rulman.*$','',label,flags=re.I)
      if code.upper().startswith(brand+' '):code=code[len(brand)+1:]
      if not code:continue
      add({'code':code,'brand':brand,'category':category,'title':code+' · '+category,'dimensions':{},'specs':[],'image':None,'sourceKey':'rt','nativeId':variant['href'],'refs':[['rt',variant['href']],['rt',url]],'baseCode':code.split()[0] if re.match(r'^\d{3,6}(?:\s|$)',code) else None})
    anchor=cells[0].select_one('a[href*="/c/"],a[href*="/i/"]')
    if not anchor:continue
    product_url=anchor['href']
    # Prefer the linked designation (the source sometimes appends '00' to display labels).
    title=anchor.get('title','');code=re.sub(r'\s+Rulman.*$','',title,flags=re.I).strip() if title else text(anchor.get_text(' ',strip=True))
    brand=UNKNOWN
    if '/i/' in product_url:
     brand_match=BRAND_PATTERN.match(code)
     if brand_match:brand=brand_match.group().upper();code=code[brand_match.end():].strip()
    dims={}
    for key,index in dim_columns.items():
     if index<len(cells):
      val=number(re.sub(r'\s*mm\s*$','',cells[index].get_text(' ',strip=True)))
      if val is not None:dims[key]=val
    if not dims:continue
    add({'code':code,'brand':brand,'category':category,'title':code+' · '+category,'dimensions':dims,'specs':[],'image':series_image,'imageKind':'series','sourceKey':'rt','nativeId':product_url,'refs':[['rt',product_url],['rt',url]],'baseCode':code.split()[0] if re.match(r'^\d{3,6}(?:\s|$)',code) else None})

 # Remove ambiguous dimensions rather than making exact technical search return a false match.
 for conflict in conflicts:
  key=(conflict['brand'].upper(),normalize(conflict['code']))
  records[key]['dimensions'].pop(conflict['dimension'],None)
  records[key]['warning']='Kaynak kayıtlarında farklı ölçüler var. Çelişen ölçüler teknik aramaya dahil edilmedi; sipariş öncesi doğrulayın.'
 for p in records.values():
  d=p['dimensions']
  if d.get('inner') is not None and d.get('outer') is not None and d['inner']>=d['outer']:
   invalid_dimensions.append({'code':p['code'],'dimensions':dict(d),'source':p['refs'][0]})
   d.pop('inner');d.pop('outer')
   p['warning']='Kaynak kayıttaki iç/dış çap değerleri tutarsız. Bu ölçüler teknik aramaya dahil edilmedi; kaynak sayfadan doğrulayın.'
 # Manufacturer fields override reseller measurements only for the exact SKF designation.
 skf_enrichment={'matched':0,'formatAliases':0,'withMetricDimensions':0,'withSourceImage':0,'measurementUpdates':[]}
 manufacturer_file=cache/'skf/products/all-products.json'
 if manufacturer_file.exists():
  manufacturer_docs=json.loads(manufacturer_file.read_text())
  exact_docs={normalize(d.get('designation','')):d for d in manufacturer_docs}
  format_docs={}
  for document in manufacturer_docs:
   alias=re.sub(r'/(?=[A-Z])','',normalize(document.get('designation','')))
   format_docs.setdefault(alias,[]).append(document)
  for key,p in records.items():
   if p['brand']!='SKF':continue
   document=exact_docs.get(normalize(p['code']))
   if document is None:
    aliases=format_docs.get(re.sub(r'/(?=[A-Z])','',normalize(p['code'])),[])
    if len(aliases)!=1:continue
    document=aliases[0];skf_enrichment['formatAliases']+=1
   skf_enrichment['matched']+=1;p['manufacturerCode']=document['designation']
   category_path=document.get('contentstack_taxonomy',{}).get('path')
   if category_path:
    manufacturer_url='https://www.skf.com/tr'+category_path+'/productid-'+urllib.parse.quote(document['designation'],safe='')
    if ['skf',manufacturer_url] not in p['refs']:p['refs'].append(['skf',manufacturer_url])
   dimensions,specs,warnings=_skf_data.extract_manufacturer_data(document)
   if dimensions:skf_enrichment['withMetricDimensions']+=1
   for name,value in dimensions.items():
    if name in p['dimensions'] and p['dimensions'][name]!=value:skf_enrichment['measurementUpdates'].append({'code':p['code'],'dimension':name,'reseller':p['dimensions'][name],'manufacturer':value})
    p['dimensions'][name]=value
   if specs:p['specs']=specs
   if document.get('short_description'):p['title']=text(document['short_description'])
   image=document.get('photo_url');host=urllib.parse.urlsplit(image or '').hostname
   if image and host in ['cdn.skfmediahub.skf.com','www.skf.com'] and image in image_manifest:
    p['image']=image;p['imageKind']='product';skf_enrichment['withSourceImage']+=1
   if warnings:p['warning']=' '.join(warnings)
 values=list(records.values())
 # Products with real technical data/photos first; source identity remains stable across refreshes.
 order=['Bilyalı rulmanlar','Makaralı rulmanlar','İğneli rulmanlar','Eksenel rulmanlar','Yataklı rulmanlar','Lineer rulmanlar']
 values.sort(key=lambda p:(order.index(p['category']) if p['category'] in order else len(order),not p['code'].startswith(('6204','6205','6001')),not bool(p['dimensions']),not bool(p['image']),p['code']))
 dictionaries={'brands':[],'categories':[],'urls':[]};indexes={k:{} for k in dictionaries}
 def intern(key,value):
  if value not in indexes[key]:indexes[key][value]=len(dictionaries[key]);dictionaries[key].append(value)
  return indexes[key][value]
 rows=[];details={};detail_files={};counts=collections.Counter();dimensions=0
 for p in values:
  source_keys=sorted(set(k for k,u in p['refs']));counts.update(source_keys)
  dims=[p['dimensions'].get(k) for k in ['inner','outer','width']]
  if any(v is not None for v in dims):dimensions+=1
  refs=[[k,intern('urls',u)] for k,u in p['refs']]
  detail_chunk=None
  if p.get('specs') or p.get('warning'):
   detail_chunk=len(details)//200
   details[p['id']]={'specs':p['specs'],'warning':p.get('warning')}
   detail_files.setdefault(detail_chunk,{})[p['id']]=details[p['id']]
  image='/catalog/images/'+image_manifest[p['image']] if p.get('image') in image_manifest else None
  rows.append([p['id'],p['code'],intern('brands',p['brand']),intern('categories',p['category']),dims if any(v is not None for v in dims) else None,p.get('title') or None,image,refs,p.get('baseCode'),detail_chunk,p.get('imageKind','product') if image else None,p.get('manufacturerCode')])
 index={'schemaVersion':1,**dictionaries,'rows':rows}
 (out/'index.json').write_text(json.dumps(index,ensure_ascii=False,separators=(',',':')))
 (out/'index.json.gz').write_bytes(gzip.compress((out/'index.json').read_bytes(),compresslevel=9,mtime=0))
 for chunk,content in detail_files.items():(out/f'details-{chunk}.json').write_text(json.dumps(content,ensure_ascii=False,separators=(',',':')))
 report={'generatedAt':datetime.now(timezone.utc).isoformat(),'totalProducts':len(values),'withDimensions':dimensions,'withBothDiameters':sum(bool(r[4]) and r[4][0] is not None and r[4][1] is not None for r in rows),'withImages':sum(bool(r[6]) for r in rows),'imageKinds':dict(collections.Counter(r[10] for r in rows if r[6])),'withoutSourceImages':sum(not r[6] for r in rows),'sourceCounts':dict(counts),'rawSourceCounts':dict(raw_counts),'stsExpected':sts_manifest['total'],'rtPages':len(rt_manifest['pages']),'rtFailures':rt_manifest['failures'],'skfCoverage':'Official public product search: exact-designation metric dimensions, descriptions and manufacturer photo associations. Original catalog membership retained.', 'skfEnrichment':skf_enrichment,'dimensionConflicts':conflicts,'invalidDimensions':invalid_dimensions,'detailChunks':len(detail_files)}
 (out/'manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 print(json.dumps({k:v for k,v in report.items() if k not in ['dimensionConflicts','rtFailures']},ensure_ascii=False,indent=2))

if __name__=='__main__':main()
