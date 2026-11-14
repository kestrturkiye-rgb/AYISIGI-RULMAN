"""Encrypted, narrow rollback snapshot for additive Rulman releases; no customer records exported."""
import os,json,urllib.request,urllib.error,secrets,hashlib,gzip,datetime
from pathlib import Path
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
REF='lptosaejlowasrbcyqnu';PROJECT='prj_LNMcFN1YPhsnCLVCpiqCJo455nKD';TEAM='team_GtWrfFOm7vyzSGmgM9a66VNs';ROOT=Path(__file__).resolve().parents[2]
def call(url,token,body=None,method=None,key=None):
 headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'}
 if key:headers['apikey']=key
 binary=isinstance(body,bytes)
 if body is not None and not binary:body=json.dumps(body).encode()
 if binary and key:headers['Content-Type']='application/octet-stream'
 req=urllib.request.Request(url,headers=headers,data=body,method=method)
 try:
  with urllib.request.urlopen(req,timeout=60) as r:
   raw=r.read();return json.loads(raw) if 'json' in r.headers.get('Content-Type','') else raw
 except urllib.error.HTTPError as e:
  raise RuntimeError('Provider HTTP '+str(e.code)) from None
base='https://api.supabase.com/v1/projects/'+REF
supa=lambda path,body=None:call(base+path,os.environ['SUPABASE_ACCESS_TOKEN'],body)
query="""select jsonb_build_object('scope','additive-release-functions-settings-only','createdAt',now(),'functions',(select jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'definition',pg_get_functiondef(p.oid))) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('my_account','admin_set_staff','admin_member_profile','submit_site_quote','prune_site_events')),'settings',(select jsonb_agg(to_jsonb(t)) from public.site_settings t),'settingsConstraint',(select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.site_settings'::regclass and conname='site_settings_key_check'),'migrations',(select jsonb_agg(to_jsonb(t) order by version) from private.schema_migrations t),'catalogFingerprint',(select jsonb_build_object('rows',count(*),'hash',md5(string_agg(md5(to_jsonb(p)::text),'' order by p.id))) from public.products p)) snapshot"""
snapshot=supa('/database/query',{'query':query})[0]['snapshot']
auth=supa('/config/auth');snapshot['authPolicy']={k:auth.get(k) for k in ['password_min_length','uri_allow_list','site_url']}
key=secrets.token_bytes(32);nonce=secrets.token_bytes(12);aad=('rt-release-snapshot-v1:'+REF).encode();plain=gzip.compress(json.dumps(snapshot).encode());packet=b'RTSNP001'+nonce+AESGCM(key).encrypt(nonce,plain,aad)
stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d%H%M%S');key_name='RT_RELEASE_BACKUP_KEY_'+stamp
vbase='https://api.vercel.com/v10/projects/'+PROJECT+'/env?teamId='+TEAM
call(vbase,os.environ['VERCEL_TOKEN'],{'key':key_name,'value':key.hex(),'type':'encrypted','target':['production']})
keys=supa('/api-keys');service=next(item['api_key'] for item in keys if item.get('name')=='service_role')
store='https://'+REF+'.supabase.co/storage/v1';bucket='rt-release-backups'
buckets=call(store+'/bucket',service,key=service)
if not any(item['id']==bucket for item in buckets):
 call(store+'/bucket',service,{'id':bucket,'name':bucket,'public':False,'file_size_limit':2097152,'allowed_mime_types':['application/octet-stream']},method='POST',key=service)
name=stamp+'-rollback.rtsnapshot'
call(store+'/object/'+bucket+'/'+name,service,packet,method='POST',key=service)
received=call(store+'/object/authenticated/'+bucket+'/'+name,service,key=service)
assert received==packet and AESGCM(key).decrypt(received[8:20],received[20:],aad)==plain
folder=ROOT/'backups';folder.mkdir(exist_ok=True,mode=0o700);path=folder/name;path.write_bytes(packet);path.chmod(0o600)
report={'scope':snapshot['scope'],'privateBucket':bucket,'object':name,'encrypted':True,'cipher':'AES-256-GCM','keyStoredIn':'Vercel encrypted server environment','keyName':key_name,'downloadAndDecryptVerified':True,'sha256':hashlib.sha256(packet).hexdigest(),'functionCount':len(snapshot['functions']),'catalogRows':snapshot['catalogFingerprint']['rows'],'fullDatabaseBackup':False,'storageFilesBackup':False,'customerRecordsExported':False}
(ROOT/'docs/full-release/snapshot.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
