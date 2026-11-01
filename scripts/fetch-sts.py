import concurrent.futures, subprocess, pathlib, json, re
cache=pathlib.Path('/workspace/shared/catalog-cache/sts');cache.mkdir(parents=True,exist_ok=True)
def fetch(page):
 p=cache/f'page-{page}.json';h=cache/f'page-{page}.headers'
 if p.exists():
  try:
   if isinstance(json.loads(p.read_text()),list):return page
  except Exception:pass
 command=['curl','--fail','-sSL','--max-time','50','--retry','2','--retry-delay','2','-D',str(h),'-o',str(p)+'.tmp',f'https://stsrulman.com.tr/wp-json/wc/store/v1/products?per_page=100&page={page}&orderby=id&order=asc']
 subprocess.run(command,check=True)
 data=json.loads(pathlib.Path(str(p)+'.tmp').read_text());assert isinstance(data,list)
 pathlib.Path(str(p)+'.tmp').replace(p)
 return page
fetch(1)
head=(cache/'page-1.headers').read_text()
total=int(re.search(r'x-wp-total:\s*(\d+)',head,re.I)[1]);pages=int(re.search(r'x-wp-totalpages:\s*(\d+)',head,re.I)[1]);print(f'STS: {total} products, {pages} pages',flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
 for index,page in enumerate(pool.map(fetch,range(2,pages+1)),2):
  if index%5==0 or index==pages:print(f'STS pages: {index}/{pages}',flush=True)
all_products=[p for page in range(1,pages+1) for p in json.loads((cache/f'page-{page}.json').read_text())]
ids={p['id'] for p in all_products};assert len(ids)==len(all_products)==total,(len(ids),len(all_products),total)
(cache/'manifest.json').write_text(json.dumps({'total':total,'pages':pages,'uniqueIds':len(ids)}))
print(f'STS complete: {len(ids)} unique products',flush=True)
