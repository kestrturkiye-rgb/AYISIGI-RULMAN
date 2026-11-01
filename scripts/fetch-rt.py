import concurrent.futures,subprocess,pathlib,json,hashlib,urllib.parse
from bs4 import BeautifulSoup
cache=pathlib.Path('/workspace/shared/catalog-cache/rt');cache.mkdir(parents=True,exist_ok=True)
base='https://rulmantoptancisi.com'
def path_for(url):return cache/(hashlib.sha256(url.encode()).hexdigest()+'.html')
def fetch(url):
 p=path_for(url)
 if not p.exists():
  subprocess.run(['curl','--fail','-sSL','--compressed','--max-time','40','--retry','1','-o',str(p)+'.tmp',url],check=True)
  pathlib.Path(str(p)+'.tmp').replace(p)
 s=BeautifulSoup(p.read_text(),'html.parser');return url,s
pending={base+'/catalog/rulmanKatalog',base+'/beltCatalog/zaman-kayislari'};visited={};failures=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
 while pending:
  batch=sorted(pending);pending=set()
  for future in concurrent.futures.as_completed([pool.submit(fetch,url) for url in batch]):
   try:url,s=future.result()
   except Exception as e:failures.append(str(e));print('RT fetch failure',str(e),flush=True);continue
   visited[url]={'file':path_for(url).name,'title':s.title.get_text(' ',strip=True) if s.title else '', 'headings':[h.get_text(' ',strip=True) for h in s.select('h1,h2,h3')][:12]}
   for a in s.select('a[href]'):
    u=urllib.parse.urljoin(base,a['href']);parsed=urllib.parse.urlsplit(u)
    if parsed.hostname!='rulmantoptancisi.com':continue
    if not parsed.path.startswith(('/catalog/','/beltCatalog/','/hazirSeriler/','/hazirSerilerYatakli/')):continue
    u=urllib.parse.urlunsplit(('https',parsed.netloc,parsed.path,parsed.query,''))
    if u not in visited:pending.add(u)
   if len(visited)%20==0:print(f'RT fetched {len(visited)}; discovered next {len(pending)}',flush=True)
  pending.difference_update(visited)
  (cache/'manifest.json').write_text(json.dumps({'pages':visited,'failures':failures},ensure_ascii=False))
  print(f'RT level complete: {len(visited)} pages; next {len(pending)}',flush=True)
print('RT complete',len(visited),'pages',len(failures),'failures',flush=True)
