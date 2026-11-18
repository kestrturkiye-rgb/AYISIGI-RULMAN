"""Add private per-site analytics attribution; retain existing events, roles and consent checks."""
import os,json,hashlib,pathlib,urllib.request,sys
root=pathlib.Path(__file__).resolve().parents[2];ref='lptosaejlowasrbcyqnu';name='202611180033_domain_analytics.sql';sql=(root/'supabase/migrations'/name).read_text();sha=hashlib.sha256(sql.encode()).hexdigest()
def query(value):
 r=urllib.request.Request('https://api.supabase.com/v1/projects/'+ref+'/database/query',method='POST',headers={'Authorization':'Bearer '+os.environ['SUPABASE_ACCESS_TOKEN'],'Content-Type':'application/json'},data=json.dumps({'query':value}).encode())
 with urllib.request.urlopen(r,timeout=45) as f:return json.load(f)
previous=query("select sha256 from private.schema_migrations where version='"+name+"'")
if previous:
 if previous[0]['sha256']!=sha:raise RuntimeError('Migration sürümü eşleşmiyor.')
 print(json.dumps({'alreadyApplied':True,'version':name}));sys.exit(0)
if '--apply' not in sys.argv:raise SystemExit('--apply gerekli.')
result=query("begin;set local lock_timeout='5s';set local statement_timeout='20s';"+sql+"insert into private.schema_migrations(version,sha256) values('"+name+"','"+sha+"');commit;select count(*) products from public.products;")
report={'projectRef':ref,'migration':name,'sha256':sha,'result':result,'productRowsUpdated':False,'applied':True};(root/'docs/domain-analytics/database-apply.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
