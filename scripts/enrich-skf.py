"""Enrich existing catalog membership in place, using retained manufacturer data.

Keeps all product IDs and original supplier codes. Category fallback photos are
explicitly marked as representative and retain their reference product link.
"""
import argparse,collections,gzip,hashlib,importlib.util,json,pathlib,re,shutil,urllib.parse
from datetime import datetime,timezone

ROOT=pathlib.Path('/workspace/shared/catalog-cache');OUT=pathlib.Path('public/catalog')
module_spec=importlib.util.spec_from_file_location('skf_data',pathlib.Path(__file__).with_name('skf-data.py'))
module=importlib.util.module_from_spec(module_spec);module_spec.loader.exec_module(module)
norm=lambda text:re.sub(r'[\s-]+','',text.upper())
alias=lambda text:re.sub(r'/(?=[A-Z])','',norm(text))

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--category-fallbacks',action='store_true');args=parser.parse_args()
 index=json.loads((OUT/'index.json').read_text());report=json.loads((OUT/'manifest.json').read_text())
 before_ids=[r[0]for r in index['rows']]
 if not(ROOT/'catalog-base-before-skf.json').exists():
  shutil.copyfile(OUT/'index.json',ROOT/'catalog-base-before-skf.json')
  shutil.copyfile(OUT/'manifest.json',ROOT/'manifest-base-before-skf.json')
 docs=json.loads((ROOT/'skf/products/all-products.json').read_text());exact={norm(d['designation']):d for d in docs};aliases={}
 for d in docs:aliases.setdefault(alias(d['designation']),[]).append(d)
 images=json.loads((ROOT/'images/manifest.json').read_text());urls={u:i for i,u in enumerate(index['urls'])}
 def intern_url(url):
  if url not in urls:urls[url]=len(index['urls']);index['urls'].append(url)
  return urls[url]
 chunks={};next_chunk=report['detailChunks'];new_count=0
 def set_details(row,specs,warning):
  nonlocal new_count
  if row[9]is None:row[9]=next_chunk+new_count//200;new_count+=1
  chunk=row[9]
  if chunk not in chunks:
   path=OUT/f'details-{chunk}.json';chunks[chunk]=json.loads(path.read_text())if path.exists()else{}
  chunks[chunk][row[0]]={'specs':specs,'warning':warning}
 stats={'matched':0,'formatAliases':0,'withMetricDimensions':0,'withSourceImage':0,'measurementUpdates':[],'notFound':[]}
 extra_path=ROOT/'rt/extra-image-associations.json';extra=json.loads(extra_path.read_text())if extra_path.exists()else{}
 for row in index['rows']:
  row.extend([None]*max(0,13-len(row)))
  additional=extra.get(row[0])
  if (not row[6]or row[10]=='category')and additional and additional['url']in images:
   row[6]='/catalog/images/'+images[additional['url']];row[10]='series'
  if index['brands'][row[2]]!='SKF':continue
  document=exact.get(norm(row[1]));formatted=False
  if document is None:
   choices=aliases.get(alias(row[1]),[])
   if len(choices)==1:document=choices[0];formatted=True
  if document is None:stats['notFound'].append(row[1]);continue
  stats['matched']+=1;stats['formatAliases']+=int(formatted);row[11]=document['designation']
  dimensions,specs,warnings=module.extract_manufacturer_data(document)
  values=list(row[4]or[None,None,None])
  if dimensions:stats['withMetricDimensions']+=1
  for name,value in dimensions.items():
   i=['inner','outer','width'].index(name)
   if values[i]is not None and values[i]!=value:stats['measurementUpdates'].append({'code':row[1],'dimension':name,'reseller':values[i],'manufacturer':value})
   values[i]=value
  if values[0]is not None and values[1]is not None and values[0]>=values[1]:
   values[0]=None;values[1]=None;warnings.append('Kaynaklar arasındaki iç/dış çap değerleri tutarsız; bu çaplar aramaya dahil edilmedi.')
  row[4]=values if any(v is not None for v in values)else None
  if specs or warnings:set_details(row,specs,' '.join(warnings)or None)
  if document.get('short_description'):row[5]=document['short_description']
  photo=document.get('photo_url')
  if photo in images:row[6]='/catalog/images/'+images[photo];row[10]='product';stats['withSourceImage']+=1
  path=document.get('contentstack_taxonomy',{}).get('path')
  if path:
   source='https://www.skf.com/tr'+path+'/productid-'+urllib.parse.quote(document['designation'],safe='')
   ref=['skf',intern_url(source)]
   if ref not in row[7]:row[7].append(ref)

 # These are explicitly category illustrations, not photos attributed to this SKU.
 if args.category_fallbacks:
  representatives={}
  for row in index['rows']:
   if not row[6]or row[10]=='category':continue
   rank=(3 if index['brands'][row[2]]=='SKF'and row[10]=='product'else 2 if row[10]=='series'else 1)
   if row[3]not in representatives or rank>representatives[row[3]][0]:representatives[row[3]]=(rank,row)
  for row in index['rows']:
   if row[6]and row[10]!='category':continue
   candidate=representatives.get(row[3])
   if candidate:
    reference=candidate[1];row[6]=reference[6];row[10]='category'
    manufacturer_refs=[i for key,i in reference[7]if key=='skf'];row[12]=manufacturer_refs[-1]if manufacturer_refs else reference[7][0][1]

 assert before_ids==[r[0]for r in index['rows']],'Catalog membership changed unexpectedly'
 required={pathlib.PurePosixPath(r[6]).name for r in index['rows']if r[6]}
 for filename in required:
  target=OUT/'images'/filename
  if not target.exists():shutil.copyfile(ROOT/'images'/filename,target)
 for number,chunk in chunks.items():(OUT/f'details-{number}.json').write_text(json.dumps(chunk,ensure_ascii=False,separators=(',',':')))
 payload=json.dumps(index,ensure_ascii=False,separators=(',',':')).encode()
 (OUT/'index.json.tmp').write_bytes(payload);(OUT/'index.json.tmp').replace(OUT/'index.json')
 (OUT/'index.json.gz.tmp').write_bytes(gzip.compress(payload,compresslevel=9,mtime=0));(OUT/'index.json.gz.tmp').replace(OUT/'index.json.gz')
 counts=collections.Counter()
 for row in index['rows']:counts.update({key for key,ref in row[7]})
 kinds=collections.Counter(r[10]for r in index['rows']if r[6])
 report.update({'generatedAt':datetime.now(timezone.utc).isoformat(),'totalProducts':len(index['rows']),'withDimensions':sum(bool(r[4])for r in index['rows']),'withBothDiameters':sum(bool(r[4])and r[4][0]is not None and r[4][1]is not None for r in index['rows']),'withImages':sum(bool(r[6])for r in index['rows']),'imageKinds':dict(kinds),'withSourceImages':kinds['product']+kinds['series'],'withoutSourceImages':sum(not r[6]or r[10]=='category'for r in index['rows']),'sourceCounts':dict(counts),'detailChunks':next_chunk+(new_count+199)//200,'skfEnrichment':stats,'skfCoverage':'Official public metric product search, with exact designation matches and unambiguous separator aliases. Supplier catalog membership is unchanged. Category illustrations are explicitly labelled.'})
 (OUT/'manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 print(json.dumps({key:report[key]for key in['totalProducts','withDimensions','withBothDiameters','withImages','imageKinds','withoutSourceImages','detailChunks']},ensure_ascii=False,indent=2))
 print('Manufacturer records matched:',stats['matched'],'; absent:',len(stats['notFound']),'; metric updates:',len(stats['measurementUpdates']))

if __name__=='__main__':main()
