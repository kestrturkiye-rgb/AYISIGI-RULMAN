#!/usr/bin/env python3
"""Create responsive WebP derivatives only from the catalog's audited display images."""
from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
from pathlib import Path
import json
from PIL import Image, ImageOps
ROOT=Path(__file__).resolve().parents[1];PUBLIC=ROOT/'public';OUT=PUBLIC/'catalog/thumbnails';OUT.mkdir(parents=True,exist_ok=True)
catalog=json.loads((PUBLIC/'catalog/index.json').read_text());mapping=json.loads((ROOT/'src/product-image-map.json').read_text())
assets=sorted({mapping.get(Path(row[6]).name,row[6].lstrip('/')) for row in catalog['rows']})
def process(asset):
 source=PUBLIC/asset;name=asset.removeprefix('catalog/').replace('/','_')
 entry={'sourceSha256':sha256(source.read_bytes()).hexdigest(),'outputs':{}}
 with Image.open(source) as original:
  original=ImageOps.exif_transpose(original).convert('RGBA')
  for label,maximum in [('320',320),('full',640)]:
   image=original.copy();image.thumbnail((maximum,maximum),Image.Resampling.LANCZOS)
   target=OUT/(name+'-'+label+'.webp');image.save(target,'WEBP',quality=88,method=4)
   entry['outputs'][label]={'path':str(target.relative_to(PUBLIC)),'width':image.width,'height':image.height,'sha256':sha256(target.read_bytes()).hexdigest()}
 return asset,entry
with ThreadPoolExecutor(max_workers=4) as pool:files=dict(pool.map(process,assets))
report={'method':'Pillow EXIF orientation, Lanczos downsampling, WebP quality 88; no source pixels retouched','files':files}
(ROOT/'docs/product-image-thumbnails.json').write_text(json.dumps(report,indent=2)+'\n')
print(f'Created {len(files)*2} responsive files from {len(files)} audited images.')
