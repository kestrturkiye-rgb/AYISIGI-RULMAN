"""Conservative normalization of the manufacturer's metric product fields."""
import math,re

def clean(value):return '' if value is None else re.sub(r'<[^>]*>','',str(value)).strip()
def normal_label(value):return clean(value).lower().replace('\u0307','')

def extract_manufacturer_data(document):
 dimensions={};specs=[];warnings=[];blocked=set()
 rows=document.get('search_result_nested',[])
 if document.get('technical_data'):
  rows=[{**row,'category':group.get('name'),'category_en':group.get('name_en')} for group in document['technical_data'] for row in group.get('rows',[])]
 for row in rows:
  label=clean(row.get('name',''));unit=clean(row.get('unit',''));value=row.get('real_value',row.get('value',row.get('text_value')))
  if value is None or not label:continue
  specs.append([label+(f' ({unit})' if unit else ''),clean(value)])
  if row.get('category_en')!='Dimensions' or unit!='mm':continue
  if isinstance(value,bool):continue
  if not isinstance(value,(int,float)) or not math.isfinite(value) or value<=0:continue
  name=normal_label(label);key=None
  if name in ['delik çapı','iç çap','bore diameter','inside diameter']:key='inner'
  elif name in ['dış çap','outside diameter','outer diameter']:key='outer'
  elif name in ['genişlik','rulman genişliği','width','bearing width']:key='width'
  if key:
   if key in blocked:continue
   if key in dimensions and dimensions[key]!=value:
    dimensions.pop(key,None);blocked.add(key);warnings.append('Üretici yanıtında aynı ölçü için farklı değerler var: '+key)
   else:dimensions[key]=value
 if dimensions.get('inner') is not None and dimensions.get('outer') is not None and dimensions['inner']>=dimensions['outer']:
  dimensions.pop('inner');dimensions.pop('outer');warnings.append('Üretici yanıtındaki iç/dış çap değerleri tutarsız; bu çaplar aramaya eklenmedi.')
 return dimensions,specs,warnings
