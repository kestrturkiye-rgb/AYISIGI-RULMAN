#!/usr/bin/env python3
"""Read-only audit of every image currently displayed by the catalog.

Requires image-audit-requirements.txt. Models are bundled in the OCR package;
no photograph is sent to a remote service. Candidate text is flagged for human
review and this script never alters a product photo.
"""
import collections,concurrent.futures,hashlib,json,os,re,threading,time
from pathlib import Path
import cv2,numpy as np,onnxruntime as ort
from PIL import Image
from rapidocr_onnxruntime import RapidOCR
from rapidocr_onnxruntime.utils.infer_engine import OrtInferSession
ROOT=Path(__file__).resolve().parents[1];PUBLIC=ROOT/'public';OUTPUT=ROOT.parent/'shared/image-text-audit';OUTPUT.mkdir(exist_ok=True)
ort.disable_telemetry_events();cv2.setNumThreads(1)
def options(config):
 x=ort.SessionOptions();x.intra_op_num_threads=1;x.inter_op_num_threads=1;x.graph_optimization_level=ort.GraphOptimizationLevel.ORT_ENABLE_BASIC;x.log_severity_level=3;return x
OrtInferSession._init_sess_opts=staticmethod(options)
local=threading.local()
URL=re.compile(r'(?:w{2,3}[.：:]|[a-z0-9-]{2,}[.]\s*(?:com|net|org|info|biz|de|tr|ru|cn|co|eu)(?:\b|[.]))',re.I)
MERCHANT=re.compile(r'^sts$|stsrul[mn]an|rulmanhausi|rulmantoptan',re.I)
raw=json.loads((PUBLIC/'catalog/index.json').read_text());mapping=json.loads((ROOT/'src/product-image-map.json').read_text());assets={}
for row in raw['rows']:
 original=row[6];display=mapping.get(Path(original).name,original.lstrip('/'));assets.setdefault(display,{'display':display,'records':0,'examples':[]})['records']+=1
 if len(assets[display]['examples'])<2:assets[display]['examples'].append(row[1])
cache_file=OUTPUT/'progress.json';cache=json.loads(cache_file.read_text()) if cache_file.exists() else {}
by_sha={entry['sha256']:entry for entry in cache.values() if entry.get('sha256') and entry.get('status')=='checked'}
def inspect(item):
 path=PUBLIC/item['display'];sha=hashlib.sha256(path.read_bytes()).hexdigest();old=cache.get(item['display'])
 if not old or old.get('sha256')!=sha:old=by_sha.get(sha)
 if old and old.get('sha256')==sha:
  old={**old,**item};old['candidates']=[entry for entry in old.get('words',[]) if entry['score']>=.5 and (URL.search(re.sub(r'\s+','',entry['text'])) or MERCHANT.search(re.sub(r'\s+','',entry['text'])))];return item['display'],old
 if not hasattr(local,'engine'):local.engine=RapidOCR(intra_op_num_threads=1,inter_op_num_threads=1,use_cls=False,det_limit_side_len=640,det_limit_type='max',text_score=.45)
 with Image.open(path) as im:
  im=im.convert('RGBA');white=Image.new('RGBA',im.size,'white');white.alpha_composite(im);a=np.array(white.convert('RGB'))
 original_height,original_width=a.shape[:2];scale=min(640/max(original_height,original_width),2.)
 if abs(scale-1)>.01:a=cv2.resize(a,None,fx=scale,fy=scale,interpolation=cv2.INTER_CUBIC)
 results,_=local.engine(cv2.cvtColor(a,cv2.COLOR_RGB2BGR));texts=[];candidates=[]
 for box,text,score in results or []:
  normalized=re.sub(r'\s+','',text);entry={'text':text,'score':round(float(score),3),'box':(np.array(box)/scale).round(2).tolist()};texts.append(entry)
  if score>=.5 and (URL.search(normalized) or MERCHANT.search(normalized)):candidates.append(entry)
 return item['display'],{**item,'sha256':sha,'status':'checked','words':texts,'candidates':candidates}
# Verify that the same detector recognizes a known original merchant URL.
control_name='de56464d869f687ecec6109f.jpg'
control_engine=RapidOCR(intra_op_num_threads=1,inter_op_num_threads=1,use_cls=False,det_limit_side_len=640,det_limit_type='max',text_score=.45)
control=np.array(Image.open(PUBLIC/'catalog/images'/control_name).convert('RGB'));control=cv2.resize(control,None,fx=2,fy=2)
control_results,_=control_engine(cv2.cvtColor(control,cv2.COLOR_RGB2BGR))
control_hits=[{'text':text,'score':round(float(score),3)} for _,text,score in control_results or [] if score>=.5 and URL.search(re.sub(r'\s+','',text))]
if not control_hits:raise RuntimeError('OCR calibration failed to detect the known source URL')
calibration={'originalFile':control_name,'recognizedWebsite':control_hits,'knownSourceDetected':True}
start=time.time();total=len(assets);done=0
print('Checking',total,'display assets for',len(raw['rows']),'products',flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
 futures={pool.submit(inspect,item):name for name,item in assets.items()}
 for future in concurrent.futures.as_completed(futures):
  name=futures[future]
  try:key,result=future.result();cache[key]=result
  except Exception as error:cache[name]={**assets[name],'status':'error','error':str(error)}
  done+=1
  if done%100==0 or done==total:
   temporary=cache_file.with_suffix('.tmp');temporary.write_text(json.dumps(cache,ensure_ascii=False));os.replace(temporary,cache_file)
   print(f'{done}/{total}; {time.time()-start:.0f}s; candidates={sum(bool(v.get("candidates")) for k,v in cache.items() if k in assets)}; errors={sum(v["status"]=="error" for k,v in cache.items() if k in assets)}',flush=True)
summary={'totalProducts':len(raw['rows']),'originalImageReferences':len({r[6] for r in raw['rows']}),'displayAssets':total,'checked':sum(cache[k]['status']=='checked' for k in assets),'errors':[cache[k] for k in assets if cache[k]['status']!='checked'],'candidates':[cache[k] for k in assets if cache[k].get('candidates')]}
(OUTPUT/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2));print('COMPLETE',json.dumps({k:v for k,v in summary.items() if k not in ['errors','candidates']}),flush=True)
public_summary={
 'schemaVersion':1,'calibration':calibration,'method':'RapidOCR PP-OCRv4, local CPU inference, qualified website/source-name match, score >= 0.5',
 'totalProducts':summary['totalProducts'],'originalImageReferences':summary['originalImageReferences'],
 'displayAssets':total,'checked':summary['checked'],'errors':summary['errors'],
 'candidateImages':len(summary['candidates']),'unresolvedCandidates':summary['candidates'],
 'files':{name:{'sha256':cache[name]['sha256'],'wordCount':len(cache[name].get('words',[])),'candidateCount':len(cache[name].get('candidates',[])),'status':cache[name]['status']} for name in sorted(assets)}
}
diagonal_path=OUTPUT/'diagonal-pixels.json'
if diagonal_path.exists():public_summary['diagonalPixelCheck']=json.loads(diagonal_path.read_text())
(ROOT/'docs/product-image-text-audit.json').write_text(json.dumps(public_summary,ensure_ascii=False,indent=2)+'\n')
