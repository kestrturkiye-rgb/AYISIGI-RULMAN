"""Register only owned domains on the existing project; preserve email/DNS and other apps' Auth settings."""
import os,json,urllib.request,urllib.error,sys,datetime
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];PROJECT='prj_LNMcFN1YPhsnCLVCpiqCJo455nKD';TEAM='team_GtWrfFOm7vyzSGmgM9a66VNs';REF='lptosaejlowasrbcyqnu'
DOMAINS=['rulmanteklif.com','rulmanteklif.com.tr','rulmanteklif.online','rulmanteknik.com','rulmanteknik.com.tr','rulmanasistan.com','rulmanasistan.com.tr','rulmankodu.com','rulmankodu.com.tr','rulmansecim.com']
HOSTS=[host for domain in DOMAINS for host in [domain,'www.'+domain]]
apply='--apply' in sys.argv

def call(url,env,body=None,method=None):
 r=urllib.request.Request(url,headers={'Authorization':'Bearer '+os.environ[env],'Content-Type':'application/json'},data=None if body is None else json.dumps(body).encode(),method=method)
 try:
  with urllib.request.urlopen(r,timeout=45) as f:return json.load(f)
 except urllib.error.HTTPError as e:
  raise RuntimeError('Provider HTTP '+str(e.code)+' '+str(json.loads(e.read()).get('message',''))[:800]) from None

def vercel(path,body=None):return call('https://api.vercel.com'+path+('&' if '?' in path else '?')+'teamId='+TEAM,'VERCEL_TOKEN',body)
def auth(body=None):return call('https://api.supabase.com/v1/projects/'+REF+'/config/auth','SUPABASE_ACCESS_TOKEN',body,'PATCH' if body else 'GET')
project=vercel('/v9/projects/'+PROJECT)
if project.get('name')!='rulman-teklif-admin':raise RuntimeError('Yanlış proje; değişiklik yapılmadı.')
existing={d['name'] for d in vercel('/v9/projects/'+PROJECT+'/domains?limit=100')['domains']}
added=[]
for host in HOSTS:
 if host not in existing and apply:
  vercel('/v10/projects/'+PROJECT+'/domains',{'name':host});added.append(host)
report={'projectId':PROJECT,'hosts':HOSTS,'registeredNow':added,'applied':apply,'dnsChanged':False,'mailRecordsChanged':False,'otherProjectsChanged':False,'checkedAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat()}
if apply:
 before=auth();old=set(filter(None,str(before.get('uri_allow_list','')).split(',')))
 targets={'https://'+host+'/**' for host in HOSTS} # Path wildcard only; every hostname remains exact and owned.
 owned_prefixes=['https://'+host+'/' for host in HOSTS]
 redundant={entry for entry in old if any(entry.startswith(prefix) for prefix in owned_prefixes)}
 planned=(old-redundant)|targets
 if planned!=old:auth({'uri_allow_list':','.join(sorted(planned))})
 after=auth();preserved=['site_url','password_min_length','smtp_host','smtp_port','smtp_user','smtp_sender_name','smtp_admin_email','mailer_autoconfirm']
 if any(before.get(k)!=after.get(k) for k in preserved) or not planned.issubset(set(str(after.get('uri_allow_list','')).split(','))):raise RuntimeError('Auth koruma kontrolü başarısız.')
 report['authRedirectsAdded']=len(targets-old);report['equivalentOwnedRedirectsConsolidated']=len(redundant);report['sharedAuthSettingsPreserved']=True;report['previousRedirects']=sorted(old)
 details=[]
 domains=vercel('/v9/projects/'+PROJECT+'/domains?limit=100')['domains']
 for d in domains:
  if d['name'] not in HOSTS:continue
  config=vercel('/v6/domains/'+d['name']+'/config')
  details.append({'name':d['name'],'verified':d.get('verified'),'verification':d.get('verification'),'misconfigured':config.get('misconfigured'),'recommendedIPv4':config.get('recommendedIPv4'),'recommendedCNAME':config.get('recommendedCNAME'),'configuredBy':config.get('configuredBy')})
 report['domains']=details
(ROOT/'docs/domain-brands/provider-setup.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
print(json.dumps(report,ensure_ascii=False))
