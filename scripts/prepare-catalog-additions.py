#!/usr/bin/env python3
"""Build an additive, idempotent catalog file from the reviewed comparison snapshot.
No network, source prices, inferred bearing dimensions, or baseline writes.
"""
import argparse,collections,gzip,hashlib,json,re,unicodedata
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def norm(v):return re.sub(r'[\s\u200b\u2010-\u2015-]+','',unicodedata.normalize('NFKC',str(v or '')).upper().replace('İ','I'))
def folded(v):return ''.join(c for c in unicodedata.normalize('NFKD',str(v or '').replace('ı','i').replace('İ','I'))if not unicodedata.combining(c)).lower()
def classify(r):
 t=folded(r['category']+' '+r['name']);has=lambda *words:any(w in t for w in words)
 if r['source']=='eteknik':
  for words,cat in [(['kalip yayi','bordignon'],'Kalıp yayları'),(['mengene'],'Mengeneler ve bağlama'),(['kumpas','mikrometre'],'Ölçüm aletleri'),(['ege','testere'],'Eğeler ve testereler'),(['tungsten','karbur cubuk'],'Karbür çubuklar'),(['capak','piko','kalipci freze'],'Çapak alma frezeleri'),(['karbur freze'],'Karbür frezeler'),(['u-drill','udrill','wcmx','spmg'],'Delik işleme takımları'),(['dis acma'],'Diş açma takımları'),(['frezeleme','blmp','apmt','apkt','tpkn','4nkt','3pkt','sekt','rpmt','rdmw','rdmt'],'Frezeleme uçları'),(['tornalama','torna elmas','kesme elmas','cnmg','ccmt','dcmt','vcgt','vcmt','mgmn','mrmn'],'Tornalama ve kanal uçları'),(['kater','antivibrasyon','tutucu','pens','prop'],'Takım tutucular')]:
   if has(*words):return cat
  return 'Atölye aksesuarları'
 if r['source']in ['tarimgaraj','tarimdeposu']:
  if r['source']=='tarimdeposu':
   if folded(r['brand'])in ['sezer','agromilk']:return 'Sağım ve hayvancılık parçaları'
   if folded(r['brand'])=='global taral':return 'İlaçlama parçaları'
   if folded(r['brand'])in ['antor','lombardini']:return 'Motor yedek parçaları'
  for words,cat in [(['yem karma','yem kirma'],'Yem hazırlama parçaları'),(['sagim','gugum','sut '],'Sağım ve hayvancılık parçaları'),(['ilaclama','holder','pompa','regulator','nozul','meme','pulveriz'],'İlaçlama parçaları'),(['mibzer','ekim','tohum'],'Ekim makinesi parçaları'),(['gubre serp','gubreleme'],'Gübreleme parçaları'),(['traktor','massey','ferguson','kabin','direksiyon','mazot'],'Traktör parçaları'),(['pulluk','saban'],'Pulluk parçaları'),(['sagim','gugum','sut '],'Sağım ve hayvancılık parçaları'),(['balya','bicme','tamburlu','hasat','tirmik','bicer','saman'],'Biçme ve hasat parçaları'),(['kultivator','kultuvator','rotovator','diskaro','goble','capa','toprak','cizel','patlatma'],'Toprak işleme parçaları'),(['civata','somun','pim','kopilya','klips','yayi'],'Tarım bağlantı elemanları')]:
   if has(*words):return cat
  return 'Diğer tarım yedek parçaları'
 if r['source']in ['teknikyapi','hirdavat']:
  if has('toprak burgu')and has('ucu'):return 'Toprak işleme parçaları'
  if has('panc','karot'):return 'Matkap ve keski uçları'
  if has('uc set','ucu set','delici uc','sds-plus','sds plus','keski'):return 'Matkap ve keski uçları'
  if has('aksesuar','kesme seti','parlatma seti'):return 'El aleti aksesuarları'
  if has('kaportaci','balta','cekic','kablo siyir','pense','tornavida'):return 'El aletleri'
  if has('dizlik','koruyucu gozluk','koruyucu eldiven'):return 'İş güvenliği ekipmanları'
  if has('kriko','kaldirma'):return 'Kaldırma ve taşıma ekipmanları'
  if has('takim canta','cekmece','bos canta'):return 'Atölye tezgâhları'
  if has('sicak hava','silikon tabanca','isitici','harc mikser','boya tabanca'):return 'Elektrikli el aletleri'
  if has('su teraz','cetvel'):return 'Ölçüm aletleri'
  if has('seramik')and not has('panc','karot'):return 'Seramik kesme ekipmanları'
  if has('beton kanal'):return 'Kesme ve taşlama makineleri'
  if has('gds 18v'):return 'Akülü el aletleri'
  if has('betoncu vibrator','titresimli tokmak','cok fonksiyonlu','multiset'):return 'Elektrikli el aletleri'
  if has('lazer','kumpas','metre olcum'):return 'Ölçüm aletleri'
  if has('havali civi','havali zimba'):return 'Havalı el aletleri'
  if has('sisleme','ilaclama makin'):return 'İlaçlama makineleri'
  if has('tirpan','hava ufleme'):return 'Bahçe bakım makineleri'
  if has('lokma') and not has('somun sikma','somun sokme','sarjli','akulu'):return 'El aleti takımları'
  if (has('kombo kit','avantajli set','6\'li','6’li','3\'lu','3’lu','setler','seti','takimi')or re.search(r'\bset\b',t)) and not has('pompa','yikama','budama'):return 'El aleti setleri'
  for words,cat in [(['su pompa','su pomp','su motor','hava komp','kompresor','hidrofor','sisirme pompa','lastik sisirme'],'Su ve hava pompaları'),(['yikama','supurge','temizlik'],'Yıkama ve temizlik makineleri'),(['kaynak makin'],'Kaynak makineleri'),(['budama','silkele','agac motor','dal kesme','cay toplama'],'Budama ve hasat makineleri'),(['gonye','daire testere','spiral','taslama','dekupaj','zimpara','parke kesme','testere','sunta kesme','tiraslama'],'Kesme ve taşlama makineleri'),(['katlanir tezgah'],'Atölye tezgâhları'),(['merdiven','vantuz','kelepce','canta'],'Atölye aksesuarları'),(['akulu','sarjli'],'Akülü el aletleri'),(['elektrikli','matkap','kirici','vidalama','somun'],'Elektrikli el aletleri'),(['aku','batarya','sarj cihazi'],'Akü ve şarj cihazları')]:
   if has(*words):return cat
  return 'Yardımcı makineler'
 raise ValueError('İzin verilmeyen kaynak: '+r['source'])
GROUPS=[
 {'id':'cutting-tools','name':'Kesici takımlar','description':'Tornalama, frezeleme ve delik işleme takımları','categories':['Tornalama ve kanal uçları','Frezeleme uçları','Diş açma takımları','Karbür frezeler','Delik işleme takımları','Matkap ve keski uçları','Çapak alma frezeleri','Karbür çubuklar']},
 {'id':'workshop','name':'Atölye ekipmanları','description':'Bağlama, ölçüm, kalıp ve el aleti çözümleri','categories':['Takım tutucular','Mengeneler ve bağlama','Ölçüm aletleri','Kalıp yayları','Eğeler ve testereler','El aleti takımları','El aletleri','İş güvenliği ekipmanları','Kaldırma ve taşıma ekipmanları','El aleti aksesuarları','Havalı el aletleri','Atölye tezgâhları','Seramik kesme ekipmanları','Atölye aksesuarları']},
 {'id':'power-tools','name':'Elektrikli el aletleri','description':'Akülü, elektrikli, kesme ve taşlama aletleri','categories':['Akülü el aletleri','Elektrikli el aletleri','El aleti setleri','Kesme ve taşlama makineleri']},
 {'id':'agricultural-parts','name':'Tarım yedek parçaları','description':'Toprak işleme, ekim, hasat ve ilaçlama parçaları','categories':['Pulluk parçaları','Toprak işleme parçaları','Biçme ve hasat parçaları','Ekim makinesi parçaları','İlaçlama parçaları','Gübreleme parçaları','Traktör parçaları','Motor yedek parçaları','Tarım bağlantı elemanları','Yem hazırlama parçaları','Sağım ve hayvancılık parçaları','Diğer tarım yedek parçaları']},
 {'id':'garden-machinery','name':'Bahçe ve yardımcı makineler','description':'Budama, pompa, temizlik ve yardımcı makineler','categories':['Budama ve hasat makineleri','Bahçe bakım makineleri','İlaçlama makineleri','Su ve hava pompaları','Yıkama ve temizlik makineleri','Kaynak makineleri','Akü ve şarj cihazları','Yardımcı makineler']},
]
def clean_specs(r):
 specs=[]
 if r['variant']:specs.append(['Model / seçenek',r['variant']])
 raw=r.get('technical_specs')or{}
 if isinstance(raw,dict):
  for name,value in raw.items():
   if not isinstance(value,(str,int,float))or isinstance(value,bool):continue
   name=str(name).strip();value=str(value).strip()
   if not name or not value or value.startswith('$')or len(name)>140 or len(value)>160:continue
   if re.search(r'fiyat|stok|kargo|garanti|teslim|taksit|kampanya|indirim|price|cost',folded(name)):continue
   if '<'in value or 'http' in value:continue
   if [name,value]not in specs:specs.append([name,value])
 return specs

def prepare(snapshot,base):
 existing_ids={row[0]for row in base['rows']};exact=collections.defaultdict(list);titles=collections.defaultdict(list)
 for row in base['rows']:
  b=norm(base['brands'][row[2]])
  for c in [row[1],row[11]if len(row)>11 else None]:
   if c:exact[(b,norm(c))].append(row[0])
  titles[(b,norm(row[5]or''))].append(row[0])
 buckets={};held=[];resolved_duplicates=[]
 brand_display={norm(b):b for b in base['brands']}
 brand_aliases={norm(v):'Bosch'for v in ['Bosch','Bosch Profesyonel','Bosch Profesyonel Seri','Bosch Aksesuarlar','Bosch Professional']}
 def canonical_brand(value):
  value=brand_aliases.get(norm(value),value);return brand_display.setdefault(norm(value),value)

 title_groups=collections.defaultdict(list);barcode_groups=collections.defaultdict(set)
 for r in snapshot['records']:
  title_groups[(norm(r['brand']),norm(r['name']),norm(r['variant']))].append(r)
  if r.get('gtin'):barcode_groups[r['gtin']].add((norm(r['brand']),norm(r['seller_code']),norm(r['variant'])))
 bad_barcodes={code for code,identities in barcode_groups.items()if len(identities)>1}
 conflicting_codes=set()
 for group in title_groups.values():
  if len({norm(r['seller_code'])for r in group})<2:continue
  exact_title=[r for r in group if norm(r['seller_code'])==norm(r['name'])]
  if exact_title:
   conflicting_codes.update((r['source'],r['seller_code'])for r in group if norm(r['seller_code'])!=norm(r['name']))

 for original in snapshot['records']:
  r=dict(original,brand=canonical_brand(original['brand']))
  brand=norm(r['brand']);code=norm(r['seller_code']);variant=norm(r['variant']);key=(brand,code,variant)
  if re.search(r'rulman|bearing',r['name'],re.I) and not r['manufacturer_code']:
   held.append({'source':r['source'],'code':r['seller_code'],'name':r['name'],'reason':'Tam rulman modeli ve üreticisi belirlenemedi; mevcut rulmanlarla mükerrerlik kontrolü tamamlanmadı.'});continue
  if (r['source'],r['seller_code'])in conflicting_codes:
   held.append({'source':r['source'],'code':r['seller_code'],'name':r['name'],'reason':'Başlık başka bir kodla birebir eşleşiyor; bu satıcının kod/başlık çelişkisi çözülemedi.'});continue
  if not brand or not code or len(r['seller_code'])>240 or len(r['name'])>450:
   held.append({'source':r['source'],'name':r['name'],'reason':'Eksik veya geçersiz kimlik bilgisi'});continue
  if exact.get((brand,code))or titles.get((brand,norm(r['name']))):
   held.append({'source':r['source'],'name':r['name'],'reason':'Mevcut katalogda kod/ad çakışması'});continue
  if r.get('canonicalIdentity'):key=(brand,'canonical:'+r['canonicalIdentity'],variant)
  if key in buckets:
   old=buckets[key]
   if r.get('canonicalIdentity')and r.get('canonicalIdentity')==old.get('canonicalIdentity'):
    old['refs'].append((r['source'],r['url']));old.setdefault('mergedSourceIdentities',[]).append((r['source'],r['parent_id'],r['variant_id']));resolved_duplicates.append({'source':r['source'],'name':r['name'],'identity':r['canonicalIdentity'],'keptSource':old['source']});continue
   if norm(old['name'])!=norm(r['name']):
    held.append({'source':r['source'],'name':r['name'],'reason':'Yeni kayıtlarda aynı kod, farklı tanım'});continue
   old['refs'].append((r['source'],r['url']));continue
  item=dict(r,category=classify(r),refs=[(r['source'],r['url'])]);buckets[key]=item
 values=sorted(buckets.values(),key=lambda r:(r['category'],norm(r['brand']),norm(r['seller_code']),norm(r['variant'])))
 used={r['category']for r in values};groups=[dict(g,categories=[c for c in g['categories']if c in used])for g in GROUPS];groups=[g for g in groups if g['categories']]
 grouped={c for g in groups for c in g['categories']};assert used==grouped
 dictionaries={'brands':[],'categories':[],'urls':[]};interns={k:{}for k in dictionaries}
 def intern(key,value):
  if value not in interns[key]:interns[key][value]=len(dictionaries[key]);dictionaries[key].append(value)
  return interns[key][value]
 rows=[];details={};audit=[];source_counts=collections.Counter();base_chunks=json.loads((ROOT/'public/catalog/manifest.json').read_text())['detailChunks']
 for n,r in enumerate(values):
  identity='|'.join(['catalog-addition-v1',norm(r['brand']),norm(r['seller_code']),norm(r['variant'])]);rid='p-'+hashlib.sha256(identity.encode()).hexdigest()[:20];assert rid not in existing_ids;existing_ids.add(rid)
  name=re.sub(r'\b(?:orjinal|orijinal)\b\s*','',r['name'],flags=re.I).strip()
  if r['variant']and norm(r['variant'])not in norm(name):name+=' — '+r['variant']
  chunk=base_chunks+n//256
  metadata={'imageStatus':'pending','codeKind':'reference','variantName':r['variant'],'additionalAliases':list(dict.fromkeys((([r['gtin']]if r['gtin']and r['gtin']not in bad_barcodes else[])+(r.get('additionalSearchCodes')or[])+(['GSB13RE']if r.get('canonicalIdentity')=='reviewed:bosch:GSB13RE:standard'else[]))))}
  refs=[[key,intern('urls',url)]for key,url in sorted(set(r['refs']))]
  row=[rid,r['seller_code'],intern('brands',r['brand']),intern('categories',r['category']),[None,None,None],name,None,refs,None,chunk,None,r['manufacturer_code']or None,None,metadata]
  rows.append(row);details.setdefault(chunk,{})[rid]={'specs':clean_specs(r),'warning':None}
  audit.append({'id':rid,'source':r['source'],'code':r['seller_code'],'name':name,'brand':r['brand'],'category':r['category'],'inputSourceIdentities':[(r['source'],r['parent_id'],r['variant_id'])]+r.get('mergedSourceIdentities',[]),'sourceParentId':r['parent_id'],'sourceVariantId':r['variant_id'],'photoStatus':'pending','sourceUrl':r['url']})
  for key in {ref[0]for ref in refs}:source_counts[key]+=1
 counts=collections.Counter(r['category']for r in values)
 addition={'schemaVersion':1,'revision':'catalog-expansion-2026-11-09-v1',**dictionaries,'rows':rows,'groups':groups,'manifest':{'totalProducts':len(rows),'withDimensions':0,'withBothDiameters':0,'withImages':0,'withSourceImages':0,'withoutSourceImages':0,'pendingPhotos':len(rows),'imageKinds':{},'sourceCounts':dict(source_counts),'detailChunks':len(details)}}
 report={'baselineProducts':len(base['rows']),'selectedCandidates':len(snapshot['records']),'originalCandidateRows':snapshot.get('originalCandidateCount',len(snapshot['records'])),'internalReferenceRows':snapshot.get('manualReferenceCount',0),'addedProducts':len(rows),'totalProducts':len(base['rows'])+len(rows),'heldCandidates':held,'suppressedDuplicateBarcodes':sorted(bad_barcodes),'resolvedCrossSourceDuplicates':resolved_duplicates,'unresolvedComparisonRows':snapshot['unresolvedCount'],'sourceCounts':dict(source_counts),'categoryCounts':dict(counts),'newGroups':[g['id']for g in groups],'pendingPhotos':len(rows),'products':audit,'details':{'chunks':len(details),'specifications':sum(len(v['specs'])for d in details.values()for v in d.values())}}
 return addition,details,report

def main():
 p=argparse.ArgumentParser();p.add_argument('--write',action='store_true');args=p.parse_args()
 baseline=ROOT/'public/catalog/index.json';before=baseline.read_bytes();base=json.loads(before);snapshot=json.loads((ROOT/'docs/catalog-expansion/reviewed-input.json').read_text());assert hashlib.sha256(before).hexdigest()==snapshot['baselineSha256'],'Ana katalog değişmiş; karşılaştırmayı yenileyin.'
 addition,details,report=prepare(snapshot,base)
 if args.write:
  data=(json.dumps(addition,ensure_ascii=False,separators=(',',':'))+'\n').encode('utf-8')
  (ROOT/'public/catalog/additions.json').write_bytes(data)
  (ROOT/'public/catalog/additions.json.gz').write_bytes(gzip.compress(data,mtime=0))
  for key,data in details.items():(ROOT/f'public/catalog/details-{key}.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n')
  (ROOT/'src/catalog-addition-groups.json').write_text(json.dumps(addition['groups'],ensure_ascii=False,indent=2)+'\n')
  (ROOT/'src/catalog-summary.json').write_text(json.dumps({'totalProducts':report['totalProducts']})+'\n')
  (ROOT/'docs/catalog-expansion/result.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
  assert baseline.read_bytes()==before
 print(json.dumps({k:v for k,v in report.items()if k!='products'},ensure_ascii=False,indent=2))
if __name__=='__main__':main()
