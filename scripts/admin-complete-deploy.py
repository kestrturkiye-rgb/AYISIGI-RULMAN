import os,json,urllib.request,urllib.error,base64,hashlib,datetime
from pathlib import Path
TEAM='team_GtWrfFOm7vyzSGmgM9a66VNs';PROJECT='prj_LNMcFN1YPhsnCLVCpiqCJo455nKD';TOKEN=os.environ['VERCEL_TOKEN']
def api(path,body=None):
 sep='&' if '?' in path else '?';req=urllib.request.Request('https://api.vercel.com'+path+sep+'teamId='+TEAM,data=None if body is None else json.dumps(body).encode(),headers={'Authorization':'Bearer '+TOKEN,'Content-Type':'application/json'},method=None if body is None else 'POST')
 try:
  with urllib.request.urlopen(req,timeout=60) as r:return json.load(r)
 except urllib.error.HTTPError as e:
  d=json.loads(e.read()).get('error',{});raise RuntimeError(str(e.code)+' '+str(d.get('code'))+' '+str(d.get('message'))[:200]) from None
project=api('/v9/projects/'+PROJECT);assert project['name']=='rulman-teklif-admin'
old=api('/v6/deployments?projectId='+PROJECT+'&target=production&limit=1')['deployments'][0]
previous=old.get('uid') or old.get('id');files=[];hashes=[]
for p in sorted(Path('dist').rglob('*')):
 if p.is_file():
  raw=p.read_bytes()
  path=str(p.relative_to('dist'));files.append({'file':path,'data':base64.b64encode(raw).decode(),'encoding':'base64'});hashes.append({'path':path,'sha256':hashlib.sha256(raw).hexdigest()})
assert files and any(f['file']=='admin/index.html' for f in files)
for p in sorted(Path('api').glob('*.mjs')):
 raw=p.read_bytes();files.append({'file':str(p),'data':base64.b64encode(raw).decode(),'encoding':'base64'});hashes.append({'path':str(p),'sha256':hashlib.sha256(raw).hexdigest()})
files.append({'file':'package.json','data':json.dumps({'private':True,'type':'module','engines':{'node':'>=24'}}),'encoding':'utf-8'})
files.append({'file':'vercel.json','data':Path('deploy/admin-vercel/vercel.json').read_text(),'encoding':'utf-8'})
d=api('/v13/deployments',{'name':'rulman-teklif-admin','project':PROJECT,'target':'production','files':files,'meta':{'stage':'complete-admin-approved'},'projectSettings':{'framework':None,'buildCommand':None,'installCommand':None,'outputDirectory':None}})
report={'project':PROJECT,'teamId':TEAM,'deploymentId':d['id'],'target':'production','readyState':d.get('readyState'),'url':'https://'+d['url']+'/admin/#/','productionUrl':'https://rulman-teklif-admin.vercel.app/admin/#/','previousProductionDeployment':previous,'hashes':hashes,'requestedAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'otherProjectsChanged':False,'schemaReapplied':False}
Path('docs/admin-complete/production-deployment.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if k!='hashes'}))
