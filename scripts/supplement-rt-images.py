"""Retain additional ZKL series figures explicitly present on source catalog pages."""
import concurrent.futures,hashlib,json,pathlib,re,subprocess,urllib.parse
ROOT=pathlib.Path('/workspace/shared/catalog-cache');cache=ROOT/'images'
index=json.loads(pathlib.Path('public/catalog/index.json').read_text());pages=json.loads((ROOT/'rt/manifest.json').read_text())['pages']
association={};checked={}
for row in index['rows']:
 if row[6]:continue
 for key,ref in row[7]:
  url=index['urls'][ref]
  if key!='rt' or url not in pages:continue
  if url not in checked:
   with (ROOT/'rt'/pages[url]['file']).open()as f:head=f.read(160000)
   match=re.search(r'https://rulmantoptancisi\.com/uploads/zkl/200x200/[^\s"<>]+',head)
   checked[url]=match.group()if match else None
  if checked[url]:association[row[0]]={'url':checked[url],'sourcePage':url};break
manifest=json.loads((cache/'manifest.json').read_text());urls=sorted({a['url']for a in association.values()})
print(f'Additional RT figures: {len(urls)} for {len(association)} records',flush=True)
def fetch(url):
 ext=pathlib.PurePosixPath(urllib.parse.urlsplit(url).path).suffix.lower();name=hashlib.sha256(url.encode()).hexdigest()[:24]+ext;p=cache/name
 if p.exists():return url,name
 r=subprocess.run(['curl','--fail','-sSL','--max-time','30','--retry','1','-o',str(p)+'.tmp',url],capture_output=True)
 if r.returncode:return url,None
 temp=pathlib.Path(str(p)+'.tmp');data=temp.read_bytes()
 if not(data.startswith((b'\xff\xd8',b'\x89PNG',b'GIF8'))or(data.startswith(b'RIFF')and data[8:12]==b'WEBP')):temp.unlink();return url,None
 temp.replace(p);return url,name
with concurrent.futures.ThreadPoolExecutor(max_workers=3)as pool:
 for url,name in pool.map(fetch,urls):
  if name:manifest[url]=name
(cache/'manifest.json').write_text(json.dumps(manifest))
(ROOT/'rt/extra-image-associations.json').write_text(json.dumps({key:value for key,value in association.items()if value['url']in manifest},ensure_ascii=False))
print('RT supplemental figure records retained:',sum(a['url']in manifest for a in association.values()),flush=True)
