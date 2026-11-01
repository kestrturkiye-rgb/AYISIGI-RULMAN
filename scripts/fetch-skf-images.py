"""Download manufacturer photo assets associated with official public product records."""
import concurrent.futures,hashlib,json,pathlib,subprocess,urllib.parse

root=pathlib.Path('/workspace/shared/catalog-cache');products=json.loads((root/'skf/products/all-products.json').read_text())
cache=root/'images';cache.mkdir(parents=True,exist_ok=True)
manifest=json.loads((cache/'manifest.json').read_text()) if (cache/'manifest.json').exists() else {}
urls=sorted({p['photo_url'] for p in products if p.get('photo_url') and urllib.parse.urlsplit(p['photo_url']).hostname=='cdn.skfmediahub.skf.com'})
failures=[]
def fetch(url):
 ext=pathlib.PurePosixPath(urllib.parse.urlsplit(url).path).suffix.lower()
 if ext not in ['.png','.jpg','.jpeg','.webp','.gif']:return url,None,'unsupported image type'
 name=hashlib.sha256(url.encode()).hexdigest()[:24]+ext;p=cache/name
 if p.exists():return url,name,None
 response=subprocess.run(['curl','--fail','-sSL','--max-time','50','--max-filesize','10485760','--retry','2','--retry-delay','2','-o',str(p)+'.tmp',url],capture_output=True)
 if response.returncode:return url,None,response.stderr.decode(errors='replace')[:250]
 temp=pathlib.Path(str(p)+'.tmp');data=temp.read_bytes()
 if not(data.startswith((b'\xff\xd8',b'\x89PNG',b'GIF8')) or(data.startswith(b'RIFF')and data[8:12]==b'WEBP')):
  temp.unlink();return url,None,'invalid image bytes'
 temp.replace(p);return url,name,None

with concurrent.futures.ThreadPoolExecutor(max_workers=4)as pool:
 for i,(url,name,error)in enumerate(pool.map(fetch,urls),1):
  if name:manifest[url]=name
  if error:failures.append({'url':url,'error':error})
  if i%100==0 or i==len(urls):
   (cache/'manifest.json').write_text(json.dumps(manifest));print(f'SKF images {i}/{len(urls)}; failures {len(failures)}',flush=True)
(cache/'skf-image-report.json').write_text(json.dumps({'expected':len(urls),'retained':sum(url in manifest for url in urls),'failures':failures},ensure_ascii=False,indent=2))
print('SKF photos retained:',sum(url in manifest for url in urls),flush=True)
