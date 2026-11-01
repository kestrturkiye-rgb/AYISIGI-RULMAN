"""Retain SKF's public product data, using its returned taxonomy queries for pagination.

Only public product fields are retained. Click tracking payloads, prices, and stock
are discarded. Existing cache pages are reused. TLS verification stays enabled.
"""
import concurrent.futures, hashlib, json, math, pathlib, subprocess, urllib.parse

CACHE=pathlib.Path('/workspace/shared/catalog-cache/skf/products')
BASE='https://search.skf.com/prod/search-skfcom/rest/apps/skfcom/searchers/products'
FIELDS=['designation','category','contentstack_taxonomy','photo_url','short_description','search_result_nested','table_header','table_values','title','url','data_from']

def fetch(params):
 query=urllib.parse.urlencode(sorted(params.items()));key=hashlib.sha256(query.encode()).hexdigest();path=CACHE/(key+'.json')
 if path.exists():return json.loads(path.read_text())
 temporary=CACHE/(key+'.response')
 subprocess.run(['curl','--fail','-sSL','--compressed','--max-time','90','--retry','2','--retry-delay','2','-o',str(temporary),BASE+'?'+query],check=True)
 raw=json.loads(temporary.read_text());documents=raw.get('documentList',{}).get('documents')
 if not isinstance(documents,list):raise ValueError('SKF response has no documents: '+str(raw.get('message',''))[:200])
 result={'total':raw['stats']['totalHits'],'documents':[{k:d[k] for k in FIELDS if k in d} for d in documents],'facets':raw.get('facets',[])}
 path.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')));temporary.unlink();return result

def main():
 CACHE.mkdir(parents=True,exist_ok=True)
 base={'q':'*','language':'tr','system':'metric','locale':'tr-tr','hits':'1000','offset':'0'}
 initial=fetch(base);roots=initial['facets'][0]['filters'];partitions=[]
 def split(node):
  if node['count']<=14000:partitions.append(node)
  else:
   if not node.get('children'):raise ValueError('Cannot safely paginate large leaf: '+node['displayName'])
   for child in node['children']:split(child)
 for root in roots:split(root)
 tasks=[]
 for node in partitions:
  taxonomy=urllib.parse.parse_qs(node['query']).get('taxonomy',[''])[0]
  if not taxonomy:raise ValueError('Missing taxonomy query')
  for offset in range(0,node['count'],1000):tasks.append({**base,'taxonomy':taxonomy,'offset':str(offset)})
 documents={d['designation']:d for d in initial['documents'] if d.get('designation')};failures=[];category_pages={}
 with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
  futures={pool.submit(fetch,p):p for p in tasks}
  for i,future in enumerate(concurrent.futures.as_completed(futures),1):
   params=futures[future]
   try:
    page=future.result()
    expected=min(1000,page['total']-int(params['offset']))
    if len(page['documents'])!=expected:raise ValueError('Unexpected page count')
    for d in page['documents']:
     if d.get('designation'):documents[d['designation']]=d
     else:category_pages[d.get('url') or d.get('title','')]=d
   except Exception as error:failures.append({'params':params,'error':str(error)[:300]})
   if i%5==0 or i==len(tasks):print(f'SKF pages {i}/{len(tasks)}; unique products {len(documents)}; failures {len(failures)}',flush=True)
 # Products absent from taxonomy facets will be checked individually by the follow-up job.
 manifest={'apiTotal':initial['total'],'partitionExpected':sum(n['count'] for n in partitions),'partitions':len(partitions),'pages':len(tasks),'captured':len(documents),'nonSkuCategoryPages':len(category_pages),'failures':failures}
 (CACHE/'all-products.json').write_text(json.dumps(list(documents.values()),ensure_ascii=False,separators=(',',':')))
 (CACHE/'category-pages.json').write_text(json.dumps(list(category_pages.values()),ensure_ascii=False,separators=(',',':')))
 (CACHE/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2));print(json.dumps(manifest,ensure_ascii=False),flush=True)

if __name__=='__main__':main()
