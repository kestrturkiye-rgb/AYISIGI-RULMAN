"""Inspect or configure Supabase Auth SMTP without printing credentials.
This project has shared Auth; SMTP changes its global sender.
Only server environment variables supply secrets. No passwords in CLI arguments.
"""
import json,os,re,sys,urllib.request
REF='lptosaejlowasrbcyqnu'
def smtp_patch(env):
 names=['RT_SMTP_HOST','RT_SMTP_PORT','RT_SMTP_USER','RT_SMTP_PASSWORD','RT_SMTP_FROM']
 missing=[name for name in names if not env.get(name)]
 if missing:raise ValueError('Eksik sunucu ortam değişkenleri: '+', '.join(missing))
 host=env['RT_SMTP_HOST'].strip().lower().rstrip('.')
 if len(host)>253 or not re.fullmatch(r'[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?',host):raise ValueError('SMTP alanına yalnızca sunucu adı girilmeli; https:// veya yol eklenmez.')
 try:port=int(env['RT_SMTP_PORT'])
 except (ValueError,TypeError):raise ValueError('Geçerli bir SMTP portu gerekli.') from None
 if port not in [465,587]:raise ValueError('TLS destekli 465 veya 587 portu kullanılmalı.')
 if host=='mail.kurumsaleposta.com' and port!=465:raise ValueError('Natro bu hesap için 587 bağlantısında STARTTLS olmadığını bildirdi. 465 / SSL-TLS kullanılmalı.')
 for key in ['RT_SMTP_USER','RT_SMTP_FROM']:
  if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',env[key]):raise ValueError(key+' için geçerli e-posta adresi gerekli.')
 return {'smtp_host':host,'smtp_port':str(port),'smtp_user':env['RT_SMTP_USER'],'smtp_pass':env['RT_SMTP_PASSWORD'],'smtp_admin_email':env['RT_SMTP_FROM'],'smtp_sender_name':env.get('RT_SMTP_SENDER_NAME','Rulman Teklif')}
def main(args):
 if '--apply' in args and ('--confirm-project='+REF not in args or '--confirm-shared-auth' not in args):raise SystemExit('Hedef proje ve paylaşılan Auth etkisi doğrulanmalı.')
 if not os.environ.get('SUPABASE_ACCESS_TOKEN'):raise SystemExit('SUPABASE_ACCESS_TOKEN sunucu ortamında gerekli.')
 url='https://api.supabase.com/v1/projects/'+REF+'/config/auth'
 def call(body=None):
  req=urllib.request.Request(url,headers={'Authorization':'Bearer '+os.environ['SUPABASE_ACCESS_TOKEN'],'Content-Type':'application/json'},data=None if body is None else json.dumps(body).encode(),method='GET' if body is None else 'PATCH')
  try:
   with urllib.request.urlopen(req,timeout=30) as response:return json.load(response)
  except Exception:raise SystemExit('SMTP sağlayıcı işlemi başarısız; gizli değerler gösterilmedi.') from None
 before=call();report={'project':REF,'sharedAuth':True,'configured':bool(before.get('smtp_host') and before.get('smtp_user')),'emailConfirmationEnabled':not before.get('mailer_autoconfirm',False),'applied':False}
 if '--apply' in args:
  try:patch=smtp_patch(os.environ)
  except ValueError as error:raise SystemExit(str(error)) from None
  call(patch);after=call()
  if any(after.get(key)!=before.get(key) for key in ['site_url','mailer_autoconfirm','uri_allow_list','password_min_length']) or any(str(after.get(key))!=str(patch[key]) for key in ['smtp_host','smtp_port','smtp_user','smtp_admin_email','smtp_sender_name']):raise SystemExit('SMTP sonrası ayarlar doğrulanamadı; tekrar kontrol edin.')
  report.update(applied=True,configured=True)
 print(json.dumps(report,ensure_ascii=False))
if __name__=='__main__':main(sys.argv[1:])
