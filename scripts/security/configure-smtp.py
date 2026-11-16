"""Inspect or configure Supabase Auth SMTP without printing credentials.
This Supabase project has shared Auth. Applying SMTP changes its global sender;
review the shared impact before choosing --confirm-shared-auth.
Credentials must be server environment variables, never VITE_ values or CLI arguments.
"""
import os,json,sys,urllib.request
REF='lptosaejlowasrbcyqnu';args=sys.argv[1:]
if '--apply' in args and ('--confirm-project='+REF not in args or '--confirm-shared-auth' not in args):
 raise SystemExit('Uygulama için hedef proje ve paylaşılan Auth etkisi doğrulanmalı.')
url='https://api.supabase.com/v1/projects/'+REF+'/config/auth'
def call(body=None):
 req=urllib.request.Request(url,headers={'Authorization':'Bearer '+os.environ['SUPABASE_ACCESS_TOKEN'],'Content-Type':'application/json'},data=None if body is None else json.dumps(body).encode(),method='GET' if body is None else 'PATCH')
 try:
  with urllib.request.urlopen(req,timeout=30) as r:return json.load(r)
 except Exception:raise SystemExit('SMTP sağlayıcı işlemi başarısız; gizli değerler gösterilmedi.') from None
before=call();report={'project':REF,'sharedAuth':True,'configured':bool(before.get('smtp_host') and before.get('smtp_user')),'emailConfirmationEnabled':not before.get('mailer_autoconfirm',False),'applied':False}
if '--apply' in args:
 names=['RT_SMTP_HOST','RT_SMTP_PORT','RT_SMTP_USER','RT_SMTP_PASSWORD','RT_SMTP_FROM']
 if any(not os.environ.get(name) for name in names):raise SystemExit('Eksik sunucu ortam değişkenleri: '+', '.join(name for name in names if not os.environ.get(name)))
 port=int(os.environ['RT_SMTP_PORT'])
 if port not in [465,587]:raise SystemExit('Sağlayıcının TLS destekli 465 veya 587 portu kullanılmalı.')
 patch={'smtp_host':os.environ['RT_SMTP_HOST'],'smtp_port':str(port),'smtp_user':os.environ['RT_SMTP_USER'],'smtp_pass':os.environ['RT_SMTP_PASSWORD'],'smtp_admin_email':os.environ['RT_SMTP_FROM'],'smtp_sender_name':os.environ.get('RT_SMTP_SENDER_NAME','Rulman Teklif')}
 call(patch);after=call()
 if after.get('site_url')!=before.get('site_url') or after.get('mailer_autoconfirm')!=before.get('mailer_autoconfirm') or after.get('smtp_host')!=patch['smtp_host']:raise SystemExit('SMTP sonrası ayarlar doğrulanamadı; tekrar kontrol edin.')
 report.update(applied=True,configured=True)
print(json.dumps(report,ensure_ascii=False))
