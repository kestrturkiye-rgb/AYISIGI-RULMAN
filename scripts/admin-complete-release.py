#!/usr/bin/env python3
import argparse,os,json,pathlib,hashlib,urllib.request,urllib.error,time
ROOT=pathlib.Path(__file__).resolve().parents[1];REF='lptosaejlowasrbcyqnu';DOCS=ROOT/'docs/admin-complete';DOCS.mkdir(exist_ok=True)
parser=argparse.ArgumentParser();parser.add_argument('--confirm-project');parser.add_argument('--migrate',action='store_true');parser.add_argument('--import-catalog',action='store_true');args=parser.parse_args()
if not(args.migrate or args.import_catalog):print('Dry run: --migrate / --import-catalog ve --confirm-project gerekli.');raise SystemExit
if args.confirm_project!=REF:raise SystemExit('Hedef proje doğrulaması gerekli.')
TOKEN=os.environ['SUPABASE_ACCESS_TOKEN']
LAST_REQUEST=0.0
def api(path,body=None,method=None,timeout=60):
 global LAST_REQUEST
 for attempt in range(6):
  delay=max(0,0.35-(time.monotonic()-LAST_REQUEST))
  if delay:time.sleep(delay)
  LAST_REQUEST=time.monotonic()
  req=urllib.request.Request('https://api.supabase.com/v1/projects/'+REF+path,data=None if body is None else json.dumps(body).encode(),headers={'Authorization':'Bearer '+TOKEN,'Content-Type':'application/json'},method=method)
  try:
   with urllib.request.urlopen(req,timeout=timeout) as response:return json.load(response)
  except urllib.error.HTTPError as error:
   if error.code==429 and attempt<5:
    wait=max(1,float(error.headers.get('Retry-After','60')));print('Sağlayıcı hız sınırı; yeniden deneme bekleniyor.',flush=True);time.sleep(min(wait,60));continue
   raw=error.read(3000).decode('utf8',errors='replace');raise RuntimeError('Supabase HTTP '+str(error.code)+': '+raw[:1000]) from None
def query(sql):return api('/database/query',{'query':sql})
if args.migrate:
 existing={r['version']:r['sha256'] for r in query('select version,sha256 from private.schema_migrations')};applied=[]
 for path in sorted((ROOT/'supabase/migrations').glob('*.sql')):
  sha=hashlib.sha256(path.read_bytes()).hexdigest()
  if path.name in existing:
   if existing[path.name]!=sha:raise RuntimeError('Uygulanmış migration değişmiş: '+path.name)
   continue
  query("begin;set local lock_timeout='10s';set local statement_timeout='60s';"+path.read_text()+"\ninsert into private.schema_migrations(version,sha256) values('"+path.name+"','"+sha+"');commit;")
  applied.append(path.name);print('Uygulandı: '+path.name,flush=True)
 (DOCS/'migrations.json').write_text(json.dumps({'applied':applied,'previousMigrationsChanged':False},indent=2)+'\n')
if args.import_catalog:
 folder=ROOT/'data/admin-complete-import';plan=json.loads((folder/'plan.json').read_text());source=plan['sourceSha256'];record=query("insert into private.import_runs(source_sha256,counts) values('"+source+"','"+json.dumps(plan['counts']).replace("'","''")+"'::jsonb) on conflict(source_sha256) do update set source_sha256=excluded.source_sha256 returning id,state,checkpoint") [0]
 if record['state']=='completed':print('Katalog aktarımı daha önce tamamlanmış.');raise SystemExit
 # Existing editor records with colliding slugs retain their IDs and values.
 mappings={};
 for table in ['brands','categories']:
  existing=query('select id,slug from public.'+table);lookup={r['slug']:r['id'] for r in existing};mappings[table]={}
  for chunk in plan['chunks']:
   if chunk['table']=='public.'+table:
    for row in json.loads((folder/chunk['file']).read_text()):
     if row['slug'] in lookup and str(row['id'])!=lookup[row['slug']]:mappings[table][str(row['id'])]=lookup[row['slug']]
 report_path=DOCS/'catalog-import-progress.json';completed=set(record['checkpoint'].get('chunks',[]));inserted={};chunks=plan['chunks']
 def process(chunk):
  rows=[]
  for filename in chunk.get('files',[chunk.get('file')]):rows.extend(json.loads((folder/filename).read_text()))
  table=chunk['table']
  for row in rows:
   if table=='public.brands':row['id']=mappings['brands'].get(str(row['id']),row['id'])
   if table=='public.categories':row['id']=mappings['categories'].get(str(row['id']),row['id'])
   for key in ['brand_id']:
    if key in row and row[key] is not None:row[key]=mappings['brands'].get(str(row[key]),row[key])
   for key in ['category_id','parent_id']:
    if key in row and row[key] is not None:row[key]=mappings['categories'].get(str(row[key]),row[key])
  cols=sorted({k for row in rows for k in row});assert all(k.replace('_','').isalnum() for k in cols);columns=','.join('"'+k+'"' for k in cols);literal=json.dumps(rows,ensure_ascii=False).replace("'","''")
  key='product_id' if table=='private.product_import_metadata' else 'key' if table in ['public.site_settings','public.ui_texts'] else 'id'
  statement='with added as(insert into '+table+'('+columns+') select '+columns+' from jsonb_populate_recordset(null::'+table+",'"+literal+"'::jsonb) on conflict("+key+') do nothing returning 1) select count(*)::int n from added;'
  for retry in range(3):
   try:return query(statement)[0]['n']
   except (urllib.error.URLError,TimeoutError):
    if retry==2:raise
    time.sleep(1+retry)
 ordered=list(dict.fromkeys(c['table'] for c in chunks))
 for table in ordered:
  pending=[c for c in chunks if c['table']==table and c['file'] not in completed]
  # Combine small files within each table, then process sequentially under the provider rate limit.
  bundles=[];group=[];size=0
  for c in pending:
   current=(folder/c['file']).stat().st_size
   if group and size+current>700000:bundles.append(group);group=[];size=0
   group.append(c);size+=current
  if group:bundles.append(group)
  last_checkpoint=len(completed)
  for group in bundles:
   inserted[table]=inserted.get(table,0)+process({'table':table,'files':[c['file'] for c in group]})
   completed.update(c['file'] for c in group)
   if len(completed)-last_checkpoint>=40:
    query("update private.import_runs set checkpoint='"+json.dumps({'chunks':sorted(completed)})+"'::jsonb where id='"+record['id']+"'")
    report_path.write_text(json.dumps({'completedChunks':len(completed),'totalChunks':len(chunks),'inserted':inserted},indent=2));print('Katalog aktarımı: '+str(len(completed))+'/'+str(len(chunks)),flush=True);last_checkpoint=len(completed)
  query("update private.import_runs set checkpoint='"+json.dumps({'chunks':sorted(completed)})+"'::jsonb where id='"+record['id']+"'")
 query("update private.import_runs set state='completed',completed_at=now() where id='"+record['id']+"'")
 counts=query("select (select count(*) from public.products) products,(select count(*) from private.product_import_metadata) importedMetadata,(select count(*) from public.media_assets where external_url is not null) legacyImages,(select count(*) from public.articles) articles")
 (DOCS/'catalog-import.json').write_text(json.dumps({'completed':True,'sourceSha256':source,'expected':plan['counts'],'insertedThisRun':inserted,'counts':counts,'existingValuesOverwritten':False,'originalImagesPreserved':True},indent=2)+'\n');print(json.dumps(counts),flush=True)
