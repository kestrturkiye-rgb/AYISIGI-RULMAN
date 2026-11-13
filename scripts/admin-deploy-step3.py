#!/usr/bin/env python3
"""Explicit, scoped release helper. Without flags, only validates local files; never deploys."""
import argparse,hashlib,json,os,pathlib,sys,urllib.request,urllib.error,uuid
ROOT=pathlib.Path(__file__).resolve().parents[1]
REF='lptosaejlowasrbcyqnu'
MIGRATIONS=['202611130008_catalog_admin.sql','202611130009_catalog_conflict_response.sql']
MIGRATION=MIGRATIONS[0]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--confirm-project');parser.add_argument('--apply-database',action='store_true');parser.add_argument('--deploy-media',action='store_true')
args=parser.parse_args()
sql=(ROOT/'supabase/migrations'/MIGRATION).read_text();sha=hashlib.sha256(sql.encode()).hexdigest()
files=['index.ts','processor.mjs','magick.wasm.br'];folder=ROOT/'supabase/functions/rt-catalog-media'
if not (folder/'magick.wasm.br').exists():sys.exit('Önce npm ci ve npm run admin:prepare-media çalıştırın.')
print(json.dumps({'project':REF,'migrations':[{'file':name,'sha256':hashlib.sha256((ROOT/'supabase/migrations'/name).read_bytes()).hexdigest()} for name in MIGRATIONS],'function':'rt-catalog-media','files':files,'mode':'APPLY' if args.apply_database or args.deploy_media else 'DRY RUN'},ensure_ascii=False))
if not args.apply_database and not args.deploy_media:sys.exit(0)
if args.confirm_project!=REF:sys.exit('--confirm-project hedef proje kimliğiyle eşleşmeli.')
key=os.environ.get('SUPABASE_ACCESS_TOKEN')
if not key:sys.exit('SUPABASE_ACCESS_TOKEN güvenli ortam ayarı gerekli; sohbete veya dosyaya yazmayın.')
def request(path,body,content_type='application/json'):
 req=urllib.request.Request('https://api.supabase.com/v1/projects/'+REF+path,data=body,headers={'Authorization':'Bearer '+key,'Content-Type':content_type},method='POST')
 try:
  with urllib.request.urlopen(req,timeout=60) as response:return json.load(response)
 except urllib.error.HTTPError as error:
  raw=error.read(4096).decode('utf8',errors='replace')
  try: reason=json.loads(raw).get('message') or json.loads(raw).get('error') or 'Ayrıntı yok'
  except ValueError: reason='Yanıt JSON değil'
  sys.exit('Supabase işlemi başarısız: HTTP '+str(error.code)+': '+str(reason)[:500])
def query(text):return request('/database/query',json.dumps({'query':text}).encode())
if args.apply_database:
 rows=query("select version,sha256 from private.schema_migrations order by version")
 existing={r['version']:r['sha256'] for r in rows}
 for migration in sorted((ROOT/'supabase/migrations').glob('*.sql')):
  if migration.name<MIGRATIONS[0] and existing.get(migration.name)!=hashlib.sha256(migration.read_bytes()).hexdigest():sys.exit('Önceki migration eksik veya özeti farklı: '+migration.name)
 for name in MIGRATIONS:
  current_sql=(ROOT/'supabase/migrations'/name).read_text();current_sha=hashlib.sha256(current_sql.encode()).hexdigest()
  if name in existing:
   if existing[name]!=current_sha:sys.exit('Migration daha önce farklı içerikle uygulanmış: '+name)
   print('Migration zaten uygulanmış: '+name)
   continue
  query("begin; set local lock_timeout='10s'; set local statement_timeout='60s'; select pg_advisory_xact_lock(hashtext('rt-admin-migrations'));\n"+current_sql+"\ninsert into private.schema_migrations(version,sha256) values('"+name+"','"+current_sha+"'); commit;")
  print('Katalog migration uygulandı: '+name)
if args.deploy_media:
 metadata={'name':'rt-catalog-media','entrypoint_path':'index.ts','static_patterns':['magick.wasm.br'],'verify_jwt':False}
 boundary='rt-catalog-'+uuid.uuid4().hex
 parts=[]
 def part(name,content,filename=None,mime='application/octet-stream'):
  header=f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"'+(f'; filename="{filename}"' if filename else '')+f'\r\nContent-Type: {mime}\r\n\r\n'
  parts.append(header.encode()+content+b'\r\n')
 part('metadata',json.dumps(metadata).encode(),mime='application/json')
 for name in files:part('file',(folder/name).read_bytes(),filename=name)
 parts.append(f'--{boundary}--\r\n'.encode())
 result=request('/functions/deploy?slug=rt-catalog-media',b''.join(parts),'multipart/form-data; boundary='+boundary)
 print(json.dumps({k:result.get(k) for k in ['id','name','slug','status','version']},ensure_ascii=False))
