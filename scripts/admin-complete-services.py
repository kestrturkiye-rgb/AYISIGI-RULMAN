#!/usr/bin/env python3
import os,json,secrets,pathlib,urllib.request,urllib.error,uuid,hashlib
ROOT=pathlib.Path(__file__).resolve().parents[1];REF='lptosaejlowasrbcyqnu';PROJECT='prj_LNMcFN1YPhsnCLVCpiqCJo455nKD';TEAM='team_GtWrfFOm7vyzSGmgM9a66VNs';report={}
def call(url,token,body=None,method=None,content_type='application/json'):
 if body is not None and not isinstance(body,bytes):body=json.dumps(body).encode()
 req=urllib.request.Request(url,data=body,method=method,headers={'Authorization':'Bearer '+token,'Content-Type':content_type})
 try:
  with urllib.request.urlopen(req,timeout=60) as response:
   raw=response.read();return json.loads(raw) if raw else None
 except urllib.error.HTTPError as e:raise RuntimeError('Provider HTTP '+str(e.code)+': '+e.read(1500).decode('utf8',errors='replace')) from None
def supa(path,body=None,method=None):return call('https://api.supabase.com/v1/projects/'+REF+path,os.environ['SUPABASE_ACCESS_TOKEN'],body,method)
def vercel(path,body=None,method=None):return call('https://api.vercel.com'+path+('&' if '?' in path else '?')+'teamId='+TEAM,os.environ['VERCEL_TOKEN'],body,method)
assert vercel('/v9/projects/'+PROJECT)['name']=='rulman-teklif-admin'
vars=vercel('/v9/projects/'+PROJECT+'/env').get('envs',[]);names={e['key'] for e in vars};secret_names={e['name'] for e in supa('/secrets')}
if not({'RT_GATEWAY_HMAC_SECRET','RT_OPS_URL','CRON_SECRET'}<=names and 'RT_GATEWAY_HMAC_SECRET' in secret_names):
 value=secrets.token_hex(32);supa('/secrets',[{'name':'RT_GATEWAY_HMAC_SECRET','value':value}]);variables=[{'key':'RT_GATEWAY_HMAC_SECRET','value':value,'type':'encrypted','target':['production']},{'key':'RT_OPS_URL','value':'https://'+REF+'.supabase.co/functions/v1/rt-admin-operations','type':'plain','target':['production']},{'key':'CRON_SECRET','value':value,'type':'encrypted','target':['production']}];vercel('/v10/projects/'+PROJECT+'/env?upsert=true',variables,'POST');del value,variables;report['gatewayConfigured']=True
else:report['gatewayConfigured']='existing configuration preserved'
config=supa('/config/auth');allowed=[u.strip() for u in config.get('uri_allow_list','').split(',') if u.strip()];new=['https://rulman-teklif-admin.vercel.app/**','https://kestrturkiye-rgb.github.io/AYISIGI-RULMAN/**'];added=[u for u in new if u not in allowed]
if added:supa('/config/auth',{'uri_allow_list':','.join(allowed+added)},'PATCH')
report['authRedirectsAdded']=added;report['sharedAuthSiteUrlChanged']=False
folder=ROOT/'supabase/functions/rt-admin-operations';boundary='rt-ops-'+uuid.uuid4().hex;parts=[]
for field,filename,data,mime in [('metadata',None,json.dumps({'name':'rt-admin-operations','entrypoint_path':'index.ts','verify_jwt':False}).encode(),'application/json'),('file','index.ts',(folder/'index.ts').read_bytes(),'application/typescript')]:
 header=f'--{boundary}\r\nContent-Disposition: form-data; name="{field}"'+(f'; filename="{filename}"' if filename else '')+f'\r\nContent-Type: {mime}\r\n\r\n';parts.append(header.encode()+data+b'\r\n')
parts.append(f'--{boundary}--\r\n'.encode());deployment=call('https://api.supabase.com/v1/projects/'+REF+'/functions/deploy?slug=rt-admin-operations',os.environ['SUPABASE_ACCESS_TOKEN'],b''.join(parts),'POST','multipart/form-data; boundary='+boundary);report['function']={k:deployment.get(k) for k in ['id','name','slug','status','version']};report['functionSHA256']=hashlib.sha256((folder/'index.ts').read_bytes()).hexdigest();(ROOT/'docs/admin-complete/services.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
