"""Read-only by default. Explicit --apply --confirm-project required for Auth policy.
Does not change shared site_url, SMTP, users, or any other application setting.
"""
import os,json,sys,urllib.request
from pathlib import Path
REF='lptosaejlowasrbcyqnu'
args=sys.argv[1:]
if '--apply' in args and '--confirm-project='+REF not in args:
    raise SystemExit('Uygulamak için --apply --confirm-project='+REF+' gerekli.')
token=os.environ.get('SUPABASE_ACCESS_TOKEN')
if not token: raise SystemExit('SUPABASE_ACCESS_TOKEN sunucu ortamında tanımlanmalı.')
url='https://api.supabase.com/v1/projects/'+REF+'/config/auth'
def request(method='GET',data=None):
    req=urllib.request.Request(url,headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'},method=method,data=None if data is None else json.dumps(data).encode())
    try:
        with urllib.request.urlopen(req,timeout=30) as r:return json.load(r)
    except Exception:raise SystemExit('Auth yapılandırma işlemi başarısız. Gizli değerler gösterilmedi.') from None
before=request()
redirects=set(filter(None,str(before.get('uri_allow_list','')).split(',')))
for base in ['https://rulman-teklif-admin.vercel.app','https://rulmanteklif.com','https://www.rulmanteklif.com']:
    redirects.update([base+'/en/',base+'/en/?auth_action=member_signup',base+'/en/?auth_action=member_recovery',base+'/',base+'/admin/',base+'/?auth_action=member_signup',base+'/?auth_action=member_recovery',base+'/admin/?auth_action=recovery',base+'/admin/?auth_action=invite'])
patch={'password_min_length':12,'uri_allow_list':','.join(sorted(redirects))}
report={'project':REF,'applied':False,'currentMinimum':before.get('password_min_length'),'targetMinimum':12,'canonicalRedirectsPlanned':True,'sharedSiteUrlChanged':False}
if '--apply' in args:
    request('PATCH',patch);after=request()
    if after.get('password_min_length')!=12 or after.get('site_url')!=before.get('site_url'):raise SystemExit('Auth ayarları doğrulanamadı; yayına devam etmeyin.')
    report['applied']=True
print(json.dumps(report,ensure_ascii=False))
