"""Read-only preflight by default. Never rotates an existing cookie encryption key."""
import os,json,sys,urllib.request,secrets
TEAM='team_GtWrfFOm7vyzSGmgM9a66VNs'
PROJECT='prj_LNMcFN1YPhsnCLVCpiqCJo455nKD'
args=sys.argv[1:]
if '--apply' in args and '--confirm-project='+PROJECT not in args:raise SystemExit('Proje kimliğiyle açık --confirm-project gerekli.')
token=os.environ.get('VERCEL_TOKEN')
if not token:raise SystemExit('VERCEL_TOKEN sunucu ortamında gerekli.')
def api(path,body=None):
    req=urllib.request.Request('https://api.vercel.com'+path+('?teamId='+TEAM),headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'},data=None if body is None else json.dumps(body).encode(),method='GET' if body is None else 'POST')
    try:
        with urllib.request.urlopen(req,timeout=30) as r:return json.load(r)
    except Exception:raise SystemExit('Vercel yapılandırması doğrulanamadı; gizli değerler gösterilmedi.') from None
project=api('/v9/projects/'+PROJECT)
if project.get('name')!='rulman-teklif-admin':raise SystemExit('Beklenen Vercel projesi eşleşmedi.')
envs=api('/v9/projects/'+PROJECT+'/env').get('envs',[])
production=[v for v in envs if 'production' in v.get('target',[])]
names={v.get('key') for v in production}
if not {'RT_GATEWAY_HMAC_SECRET','RT_OPS_URL'}.issubset(names):raise SystemExit('Mevcut gateway sunucu ayarları eksik; yayına devam etmeyin.')
exists='RT_AUTH_COOKIE_KEY' in names
applied=False
if '--apply' in args and not exists:
    api('/v10/projects/'+PROJECT+'/env',{'key':'RT_AUTH_COOKIE_KEY','value':secrets.token_hex(32),'type':'encrypted','target':['production']})
    applied=True
print(json.dumps({'project':'rulman-teklif-admin','applied':applied,'cookieKeyExists':exists or applied,'wouldCreateCookieKey':not exists and not applied,'existingKeyRotated':False,'otherProjectsChanged':False}))
