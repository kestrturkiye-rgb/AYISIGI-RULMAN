"""Verify unresolved existing SKF designations against the public exact-detail endpoint."""
import concurrent.futures,hashlib,json,pathlib,re,subprocess,urllib.parse
ROOT=pathlib.Path('/workspace/shared/catalog-cache/skf/products')
index=json.loads(pathlib.Path('public/catalog/index.json').read_text())
documents=json.loads((ROOT/'all-products.json').read_text())
norm=lambda value:re.sub(r'[\s-]+','',value.upper())
def alias(value):return re.sub(r'/(?=[A-Z])','',norm(value))
known={norm(p['designation']):p for p in documents}
aliases={}
for p in documents:aliases.setdefault(alias(p['designation']),[]).append(p)
missing=[];alias_matches=[]
for row in index['rows']:
 if index['brands'][row[2]]!='SKF' or norm(row[1])in known:continue
 choices=aliases.get(alias(row[1]),[])
 if len(choices)==1:alias_matches.append({'requested':row[1],'canonical':choices[0]['designation']})
 else:missing.append(row[1])
cache=ROOT/'exact';cache.mkdir(exist_ok=True)
def fetch(code):
 p=cache/(hashlib.sha256(code.encode()).hexdigest()+'.json')
 if p.exists():return code,json.loads(p.read_text())
 query=urllib.parse.urlencode({'designation':code,'language':'tr','system':'metric','locale':'tr-tr'})
 temporary=pathlib.Path(str(p)+'.tmp')
 subprocess.run(['curl','--fail','-sSL','--compressed','--max-time','45','--retry','2','--retry-delay','2','-o',str(temporary),'https://search.skf.com/prod/search-skfcom/rest/apps/skfcom/searchers/details?'+query],check=True,capture_output=True)
 raw=json.loads(temporary.read_text())
 if 'documentList'not in raw:raise ValueError('Invalid exact-detail response')
 fields=['designation','category','contentstack_taxonomy','photo_url','short_description','technical_data','technical_specification']
 clean={'documents':[{k:d[k]for k in fields if k in d}for d in raw['documentList'].get('documents',[])]}
 p.write_text(json.dumps(clean,ensure_ascii=False,separators=(',',':')));temporary.unlink();return code,clean
found=[];not_found=[];failures=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=3)as pool:
 futures={pool.submit(fetch,code):code for code in missing}
 for i,f in enumerate(concurrent.futures.as_completed(futures),1):
  code=futures[f]
  try:
   _,response=f.result();matches=[d for d in response['documents']if norm(d.get('designation',''))==norm(code)]
   if matches:found.extend(matches)
   else:not_found.append(code)
  except Exception as error:failures.append({'code':code,'error':str(error)[:200]})
  if i%25==0 or i==len(missing):print(f'SKF exact checks {i}/{len(missing)}; found {len(found)}; absent {len(not_found)}; errors {len(failures)}',flush=True)
for d in found:known[norm(d['designation'])]=d
(ROOT/'all-products.json').write_text(json.dumps(list(known.values()),ensure_ascii=False,separators=(',',':')))
(ROOT/'exact-report.json').write_text(json.dumps({'formatAliases':alias_matches,'found':len(found),'notFound':not_found,'failures':failures},ensure_ascii=False,indent=2))
print(f'Exact checks finished; separator aliases {len(alias_matches)}; missing in source {len(not_found)}',flush=True)
