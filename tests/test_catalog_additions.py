import importlib.util,json,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('prepare',ROOT/'scripts/prepare-catalog-additions.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class CategoryReview(unittest.TestCase):
 def row(self,name,source='eteknik',category=''):return {'source':source,'name':name,'category':category}
 def test_mould_burr_is_not_a_die_spring(self):self.assertEqual(module.classify(self.row('SD 20X18X6X45 ELMAS KALIPÇI FREZE',category='Alüminyum')),'Çapak alma frezeleri')
 def test_actual_die_spring(self):self.assertEqual(module.classify(self.row('SARI KALIP YAYI BORDIGNON')),'Kalıp yayları')
 def test_farm_disc_is_not_a_bearing_dimension(self):self.assertEqual(module.classify(self.row('Havalı Mibzer Ekim Diski',source='tarimgaraj')),'Ekim makinesi parçaları')
 def test_milk_machine_component_is_not_a_tool(self):self.assertEqual(module.classify(self.row('Süt Sağım Pompa Aparatı',source='tarimgaraj')),'Sağım ve hayvancılık parçaları')
 def test_laser_instrument(self):self.assertEqual(module.classify(self.row('16 YÖNLÜ TRİPOT AYAKLI LAZER',source='teknikyapi')),'Ölçüm aletleri')
 def test_pneumatic_tool(self):self.assertEqual(module.classify(self.row('Havalı Çivi Ve Zımba Tabancası',source='teknikyapi')),'Havalı el aletleri')
 def test_vendor_commercial_fields_not_specs(self):
  specs=module.clean_specs({'variant':'4 Başlıklı Model','technical_specs':{'Güç':'1250 W','Garanti Süresi':'2 yıl','Fiyat':'100 TL','Stok':'12','Açıklama':'<script>unsafe</script>'}})
  self.assertEqual(specs,[['Model / seçenek','4 Başlıklı Model'],['Güç','1250 W']])
 def test_repeatable_plan_and_all_original_data_unchanged(self):
  baseline=(ROOT/'public/catalog/index.json').read_bytes();base=json.loads(baseline);snapshot=json.loads((ROOT/'docs/catalog-expansion/reviewed-input.json').read_text())
  first=module.prepare(snapshot,base);second=module.prepare(snapshot,base);self.assertEqual(first,second);self.assertEqual(len(first[0]['rows']),2535);self.assertEqual((ROOT/'public/catalog/index.json').read_bytes(),baseline)
if __name__=='__main__':unittest.main()
