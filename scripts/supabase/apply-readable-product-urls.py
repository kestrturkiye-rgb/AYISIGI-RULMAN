"""Apply only the reviewed product URL migration to the existing Rulman project."""
import os,json,hashlib,pathlib,urllib.request,urllib.error,sys
ROOT=pathlib.Path(__file__).resolve().parents[2]
REF='lptosaejlowasrbcyqnu';NAME='202611160030_readable_product_urls.sql'
def query(sql):
 req=urllib.request.Request('https://api.supabase.com/v1/projects/'+REF+'/database/query',method='POST',headers={'Authorization':'Bearer '+os.environ['SUPABASE_ACCESS_TOKEN'],'Content-Type':'application/json'},data=json.dumps({'query':sql}).encode())
 try:
  with urllib.request.urlopen(req,timeout=120) as r:return json.load(r)
 except urllib.error.HTTPError as e:
  raise RuntimeError('Supabase SQL HTTP '+str(e.code)+': '+e.read(600).decode(errors='replace')) from None
sql=(ROOT/'supabase/migrations'/NAME).read_text();sha=hashlib.sha256(sql.encode()).hexdigest()
previous=query("select version,sha256 from private.schema_migrations where version='"+NAME+"'")
if previous:
 if previous[0]['sha256']!=sha:raise RuntimeError('Uygulanmış migration değişmiş.')
 print(json.dumps({'alreadyApplied':True,'version':NAME}));sys.exit(0)
if '--apply' not in sys.argv:raise SystemExit('--apply gerekli; önce yerel doğrulamayı inceleyin.')
verified=json.loads((ROOT/'docs/readable-product-urls/local-db.json').read_text())
if verified.get('productCount')!=111952 or len(verified.get('checks',[]))!=7:raise RuntimeError('111952 kayıtlı yerel doğrulama tamamlanmamış.')
fingerprint="select count(*) n,md5(string_agg(md5((to_jsonb(p)-'slug'-'updated_at'-'lock_version')::text),'' order by id)) fingerprint from public.products p"
transaction="begin;set local lock_timeout='8s';set local statement_timeout='90s';lock table public.products in share row exclusive mode;create temporary table rt_slug_before on commit drop as "+fingerprint+';'+sql+"""
do $$declare after_data record;before_data record;begin
 select * into before_data from rt_slug_before;
 select count(*) n,md5(string_agg(md5((to_jsonb(p)-'slug'-'updated_at'-'lock_version')::text),'' order by id)) fingerprint into after_data from public.products p;
 if after_data.n<>before_data.n or after_data.fingerprint is distinct from before_data.fingerprint then raise exception 'Ürün içerik doğrulaması başarısız; tüm değişiklikler geri alınıyor.';end if;
end $$;
"""+"insert into private.schema_migrations(version,sha256) values('"+NAME+"','"+sha+"');commit;select (select count(*) from public.products) products,(select count(*) from private.product_slug_snapshot) converted,(select count(*) from private.product_slug_aliases) aliases;"
result=query(transaction)
report={'projectRef':REF,'migration':NAME,'sha256':sha,'result':result,'productDataVerifiedInTransaction':True,'privateReversibleSnapshot':True,'applied':True}
(ROOT/'docs/readable-product-urls/database-apply.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
