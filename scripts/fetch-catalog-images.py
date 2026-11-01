import concurrent.futures,subprocess,pathlib,json,hashlib,urllib.parse
catalog=json.loads(pathlib.Path('/workspace/AYISIGI-RULMAN/public/catalog/index.json').read_text())
urls=sorted({r[6] for r in catalog['rows'] if r[6] and r[6].startswith('https://')})
cache=pathlib.Path('/workspace/shared/catalog-cache/images');cache.mkdir(parents=True,exist_ok=True)
def fetch(url):
 ext=pathlib.PurePosixPath(urllib.parse.urlsplit(url).path).suffix.lower()
 if ext not in ['.jpg','.jpeg','.png','.webp','.gif']:return url,None
 name=hashlib.sha256(url.encode()).hexdigest()[:24]+ext;p=cache/name
 if p.exists():return url,name
 response=subprocess.run(['curl','--fail','-sSL','--max-time','20','--retry','1','-o',str(p)+'.tmp',url],capture_output=True)
 if response.returncode:return url,None
 temp=pathlib.Path(str(p)+'.tmp');data=temp.read_bytes()
 if not (data.startswith((b'\xff\xd8',b'\x89PNG',b'GIF8')) or (data.startswith(b'RIFF') and data[8:12]==b'WEBP')):
  temp.unlink();return url,None
 temp.replace(p);return url,name
result=json.loads((cache/'manifest.json').read_text()) if (cache/'manifest.json').exists() else {}
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
 for index,(url,name) in enumerate(pool.map(fetch,urls),1):
  if name:result[url]=name
  if index%100==0:print(f'Images: {index}/{len(urls)}',flush=True)
  if index%50==0:(cache/'manifest.json').write_text(json.dumps(result))
(cache/'manifest.json').write_text(json.dumps(result));print('Images complete:',sum(url in result for url in urls),'/',len(urls),'additional; total retained:',len(result),flush=True)
