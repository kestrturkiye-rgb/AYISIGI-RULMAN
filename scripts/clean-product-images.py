#!/usr/bin/env python3
"""Local, resumable image cleanup. Keeps catalog IDs, measurements and originals.

Usage: PYTHONPATH=/tmp/product-image-tools python scripts/clean-product-images.py
No remote image-generation service is called. Source pixels are retained within
foreground masks. The known translucent diagonal overlay is algebraically undone.
"""
import argparse
import collections
import concurrent.futures
import hashlib
import json
import os
from pathlib import Path
import time

import cv2
import numpy as np
import onnxruntime as ort
from PIL import Image, ImageOps

ort.disable_telemetry_events()

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'public'
MODEL_ROOT = ROOT.parent / 'shared/image-models'
VERSION = 'cv-clean-v5'
OVERRIDES = json.loads((ROOT/'scripts/image-cleanup-overrides.json').read_text())
PREVIOUS = {
 '39c900fb29f4c13863766301.webp': 'catalog/edited-images/rbe-bearing-clean.webp',
 '3dc3aa9fdde7a1d16db714c9.webp': 'catalog/edited-images/bearing-series-clean.webp',
 '7a1c76e824282411ce84fedd.webp': 'catalog/edited-images/jesa-bearing-clean.webp',
 '7e1f36924f5a7ebced0aac0a.webp': 'catalog/edited-images/miru-pom-clean.webp',
}

def atomic_json(path,value):
 temporary=path.with_suffix('.tmp')
 temporary.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
 os.replace(temporary,path)

def digest(path):
 return hashlib.sha256(path.read_bytes()).hexdigest()

def is_framed(image):
 if image.size != (300, 300): return False
 rgb = np.asarray(image.convert('RGB'), dtype=np.int16)
 orange = (rgb[:,:,0]>180)&(rgb[:,:,1]>40)&(rgb[:,:,1]<200)&(rgb[:,:,2]<130)&(rgb[:,:,0]>rgb[:,:,1]+35)
 edges = orange[:8,:].sum()+orange[-8:,:].sum()+orange[:,:8].sum()+orange[:,-8:].sum()
 return bool(edges > 60)

def image_inventory():
 catalog = json.loads((PUBLIC/'catalog/index.json').read_text())
 inventory = {}
 for row in catalog['rows']:
  path = row[6]
  item = inventory.setdefault(path, {'image':path,'records':0,'examples':[],'sourceKeys':set()})
  item['records'] += 1
  if len(item['examples'])<3:item['examples'].append(row[1])
  item['sourceKeys'].update(ref[0] for ref in row[7])
 return inventory

def make_rt_template(inventory):
 target=MODEL_ROOT/'rt-watermark.npz'
 if target.exists():return
 arrays=[]
 for file,item in inventory.items():
  if 'rt' not in item['sourceKeys']:continue
  with Image.open(PUBLIC/file.lstrip('/')) as image:
   if image.size==(200,200) and 'A' in image.mode:arrays.append(np.array(image.convert('RGBA')))
 images=np.stack(arrays);alpha=images[:,:,:,3];yy,xx=np.indices((200,200));hist=np.zeros((77,200,200),np.uint16)
 for value in range(1,77):hist[value]=np.sum(alpha==value,axis=0)
 mode=hist.argmax(axis=0).astype(np.uint8);frequency=hist.max(axis=0)
 mask=(mode>=5)&(frequency>=40)&(xx+yy>168)&(xx+yy<200)
 color=np.full((200,200,3),255,np.float32)
 for y,x in np.argwhere(mask):
  values=images[:,y,x];color[y,x]=np.median(values[values[:,3]==mode[y,x],:3],axis=0)
 np.savez(target,alpha=np.where(mask,mode/255.,0).astype(np.float32),color=color)

def deblend(image,template):
 original=np.array(image.convert('RGBA')).astype(np.float32)
 wa,color=template['alpha'],template['color'];oa=original[:,:,3]/255.
 # Recover the original under the known source-over alpha composition.
 denominator=oa-wa
 recovered_alpha=np.clip(denominator/(1-wa),0,1)
 recovered_rgb=np.divide(original[:,:,:3]*oa[:,:,None]-color*wa[:,:,None],denominator[:,:,None],out=original[:,:,:3].copy(),where=denominator[:,:,None]>.01)
 result=np.dstack([np.clip(recovered_rgb,0,255),recovered_alpha*255]).astype(np.uint8)
 result[denominator<=.01,3]=0
 outside=wa==0
 # Do not touch pixels outside the measured watermark support.
 result[outside]=np.asarray(image.convert('RGBA'))[outside]
 return Image.fromarray(result),{'watermarkPixels':int(np.count_nonzero(wa)),'unchangedOutsideMask':bool(np.array_equal(result[outside],np.asarray(image.convert('RGBA'))[outside]))}

def foreground_session():
 model=MODEL_ROOT/'isnet-512.onnx'
 if not model.exists():
  import onnx
  from onnx import numpy_helper
  source=onnx.load(MODEL_ROOT/'isnet-general-use.onnx');nodes={o:n for n in source.graph.node for o in n.output};changed=set()
  for node in source.graph.node:
   if node.op_type!='Resize':continue
   concat=nodes.get(node.input[3])
   if concat is None or concat.op_type!='Concat':continue
   for name in concat.input:
    constant=nodes.get(name)
    if constant is None or constant.op_type!='Constant' or name in changed:continue
    arr=numpy_helper.to_array(constant.attribute[0].t)
    if arr.shape==(2,) and (arr>=8).all():constant.attribute[0].t.CopyFrom(numpy_helper.from_array(arr//2));changed.add(name)
  for dimension in source.graph.input[0].type.tensor_type.shape.dim[2:]:dimension.dim_value=512
  source.graph.ClearField('value_info')
  for output in source.graph.output:
   for dimension in output.type.tensor_type.shape.dim[2:]:
    if dimension.dim_value>=16:dimension.dim_value//=2
  onnx.save(source,model)
 opts=ort.SessionOptions();opts.intra_op_num_threads=1;opts.inter_op_num_threads=1;opts.graph_optimization_level=ort.GraphOptimizationLevel.ORT_ENABLE_BASIC;opts.log_severity_level=3
 return ort.InferenceSession(str(model),sess_options=opts,providers=['CPUExecutionProvider'])

def foreground(image,session,filename):
 # The repeating seller header, frame and URL are outside this inner region.
 original=np.array(image.convert('RGB'))
 restoration=OVERRIDES['labelRestorations'].get(filename)
 if restoration:
  reference=np.array(Image.open(PUBLIC/'catalog/images'/restoration['reference']).convert('RGB'))
  rgb=original.astype(np.int16);orange=(rgb[:,:,0]>180)&(rgb[:,:,1]>65)&(rgb[:,:,1]<190)&(rgb[:,:,2]<100)&(rgb[:,:,0]>rgb[:,:,1]+35);orange[:100]=False;orange[230:]=False;orange[:,:110]=False
  ys,xs=np.where(orange)
  if len(ys):
   y0,y1=max(0,ys.min()-2),min(300,ys.max()+3);x0,x1=max(0,xs.min()-2),min(300,xs.max()+3)
   yy,xx=np.indices((300,300));matching=(((xx-155)/90)**2+((yy-158)/90)**2<1)&(yy>105);matching[max(0,y0-3):y1+3,max(0,x0-3):x1+3]=False
   difference=float(np.abs(original.astype(float)-reference.astype(float))[matching].mean())
   if difference>=3:raise ValueError('Reference image alignment needs review')
   original[y0:y1,x0:x1]=reference[y0:y1,x0:x1]
 rgb=original.astype(np.int16);orange=(rgb[:,:,0]>180)&(rgb[:,:,1]>40)&(rgb[:,:,1]<200)&(rgb[:,:,2]<130)&(rgb[:,:,0]>rgb[:,:,1]+35)
 top_frame=orange[:8,:].sum()+orange[:60,:5].sum()+orange[:60,-5:].sum()>30
 top=55 if top_frame else 0
 bottom=300 if filename in OVERRIDES['separateHeaders'] else 282
 roi=original[top:bottom,6:294]
 cache_dir=MODEL_ROOT/'foreground-cache';cache_dir.mkdir(exist_ok=True)
 key=hashlib.sha256(roi.tobytes()).hexdigest();cache=cache_dir/(key+'.png')
 if cache.exists():prob=np.asarray(Image.open(cache)).astype(np.float32)/255.
 else:
  tensor=cv2.resize(roi,(512,512),interpolation=cv2.INTER_AREA).astype(np.float32)/255.
  tensor=(tensor-.5).transpose(2,0,1)[None].astype(np.float32)
  pred=session.run(None,{session.get_inputs()[0].name:tensor})[0][0,0]
  prob=cv2.resize((pred-pred.min())/max(float(pred.max()-pred.min()),1e-6),(roi.shape[1],roi.shape[0]),interpolation=cv2.INTER_LINEAR)
  import uuid
  temporary=cache.with_suffix('.'+uuid.uuid4().hex+'.tmp')
  Image.fromarray(np.uint8(prob*255)).save(temporary,format='PNG');os.replace(temporary,cache)
  prob=np.uint8(prob*255).astype(np.float32)/255.
 mask=np.uint8(prob>.55)
 n,labels,stats,centroids=cv2.connectedComponentsWithStats(mask,8)
 if n<2:raise ValueError('No foreground found')
 main=1+np.argmax(stats[1:,cv2.CC_STAT_AREA]);main_area=stats[main,cv2.CC_STAT_AREA]
 accepted=[]
 for component in range(1,n):
  x,y,w,h,area=stats[component]
  # Disconnected fragments of a header logo must not enter the product image.
  header_fragment=(component!=main and y<max(30,70-top) and h<65 and centroids[component][1]<max(45,70-top))
  if not header_fragment and (component==main or area>max(35,main_area*.012)):accepted.append(component)
 mask=np.isin(labels,accepted)
 # Remove faint background texture in uncertain edge pixels, not product marks.
 bright=roi.min(axis=2)>226
 low_saturation=(roi.max(axis=2).astype(int)-roi.min(axis=2).astype(int))<30
 mask[bright&low_saturation&(prob<.93)]=False
 # Reviewed white ceramic drawings need their complete white rim while the
 # faint seller background beside the rim must be excluded.
 if filename in OVERRIDES['whiteFrontMasks']:
  yy,xx=np.indices(mask.shape);xx=xx+6;yy=yy+top
  points=np.array(OVERRIDES['whiteFrontPolygon'],np.int32)-np.array([6,top])
  envelope=np.zeros(mask.shape,np.uint8);cv2.fillPoly(envelope,[points],1)
  bore=((xx-155)/16)**2+((yy-155)/27)**2<1
  mask=(envelope>0)&~bore
 if filename in OVERRIDES['whiteFlangeHull']:
  points=cv2.findNonZero(np.uint8(mask))
  if points is not None:
   hull=cv2.convexHull(points);mask=np.zeros(mask.shape,np.uint8);cv2.fillConvexPoly(mask,hull,1);mask=mask>0
 if filename in OVERRIDES['ceramicBall']:
  config=OVERRIDES['ceramicBall'][filename];cx,cy=config['center'];yy,xx=np.indices(mask.shape);mask=(xx+6-cx)**2+(yy+top-cy)**2<=config['radius']**2
 alpha=np.uint8(mask)*255
 fraction=float(mask.mean())
 if fraction<.005:raise ValueError('Foreground too small')
 rgba=np.dstack([roi,alpha]);result=Image.fromarray(rgba)
 # Export original product pixels on white; no product is generated or replaced.
 canvas=Image.new('RGBA',(300,300),'white');bbox=result.getbbox()
 if bbox:
  crop=result.crop(bbox);crop.thumbnail((276,276),Image.Resampling.LANCZOS)
  canvas.alpha_composite(crop,((300-crop.width)//2,(300-crop.height)//2))
 metrics={'foregroundFraction':round(fraction,5),'productPixelsFromOriginal':int(mask.sum()),'roiTop':top,'restoredOverlay':restoration['reference'] if restoration else None,'touchesCrop':bool(mask[0,:].sum()>4 or mask[-1,:].sum()>4 or mask[:,0].sum()>4 or mask[:,-1].sum()>4)}
 return canvas.convert('RGB'),metrics

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--workers',type=int,default=3);parser.add_argument('--limit',type=int);parser.add_argument('--sample',type=int);parser.add_argument('--output',type=Path,default=PUBLIC/'catalog/clean-images');args=parser.parse_args()
 cv2.setNumThreads(1)
 inventory=image_inventory();print(f'Inspecting {len(inventory)} unique files',flush=True)
 args.output.mkdir(parents=True,exist_ok=True);checkpoint=MODEL_ROOT/(args.output.name+'-progress.json');progress=json.loads(checkpoint.read_text()) if checkpoint.exists() else {}
 old_mapping=PREVIOUS.copy();template_needed=False
 classified=[]
 for file,item in inventory.items():
  path=PUBLIC/file.lstrip('/');image=Image.open(path)
  kind='header' if Path(file).name in OVERRIDES['separateHeaders'] else 'framed' if is_framed(image) else 'diagonal' if image.size==(200,200) and 'A' in image.mode and 'rt' in item['sourceKeys'] else 'clean'
  classified.append((file,item,kind));template_needed |= kind=='diagonal'
 print('Classes',dict(collections.Counter(kind for _,_,kind in classified)),flush=True)
 if template_needed:make_rt_template(inventory)
 template=np.load(MODEL_ROOT/'rt-watermark.npz')
 session=foreground_session()
 if args.sample:
  import random
  frames=[item for item in classified if item[2]=='framed'];classified=random.Random(42).sample(frames,min(args.sample,len(frames)))
 if args.limit:classified=classified[:args.limit]
 def process(entry):
  file,item,kind=entry;path=PUBLIC/file.lstrip('/');filename=path.name;original_hash=digest(path)
  base={'file':filename,'records':item['records'],'examples':item['examples'],'inputSha256':original_hash,'processor':VERSION,'kind':kind}
  if filename in PREVIOUS:return filename,{**base,'action':'previously_edited','output':PREVIOUS[filename]}
  if kind=='clean':return filename,{**base,'action':'verified_clean'}
  saved=progress.get(filename)
  if saved and saved.get('inputSha256')==original_hash and saved.get('processor')==VERSION and saved.get('output') and (PUBLIC/saved['output']).exists():return filename,saved
  image=Image.open(path)
  try:
   if kind=='diagonal':cleaned,metrics=deblend(image,template)
   else:cleaned,metrics=foreground(image,session,filename)
   output_name=hashlib.sha256((original_hash+VERSION).encode()).hexdigest()[:24]+'.webp';output=args.output/output_name
   import uuid
   temporary=output.with_suffix('.'+uuid.uuid4().hex+'.tmp');cleaned.save(temporary,'WEBP',lossless=True,method=4);os.replace(temporary,output)
   relative=str(output.relative_to(PUBLIC)) if output.is_relative_to(PUBLIC) else str(output)
   return filename,{**base,'action':'cleaned','output':relative,'outputSha256':digest(output),**metrics}
  except Exception as error:return filename,{**base,'action':'review_required','error':str(error)}
 start=time.time();completed=0
 with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
  for filename,entry in pool.map(process,classified):
   progress[filename]=entry;completed+=1
   if completed%25==0 or completed==len(classified):
    atomic_json(checkpoint,progress);print(f'{completed}/{len(classified)} checked; {time.time()-start:.0f}s; {dict(collections.Counter(x["action"] for x in progress.values()))}',flush=True)
 if not args.sample and not args.limit:
  report=ROOT/'docs/product-image-cleanup-report.json';atomic_json(report,{'processor':VERSION,'totalImages':len(inventory),'totalProducts':sum(x['records'] for x in inventory.values()),'counts':dict(collections.Counter(x['action'] for x in progress.values())),'images':list(progress.values())})
  mapping={name:entry['output'] for name,entry in progress.items() if entry.get('output')}
  atomic_json(ROOT/'src/product-image-map.json',dict(sorted(mapping.items())))
 print('Complete',flush=True)

if __name__=='__main__':main()
