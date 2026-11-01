import importlib.util,pathlib,unittest

spec=importlib.util.spec_from_file_location('skf_data',pathlib.Path(__file__).resolve().parents[1]/'scripts/skf-data.py')
skf=importlib.util.module_from_spec(spec);spec.loader.exec_module(skf)

class ManufacturerDimensions(unittest.TestCase):
 def test_real_metric_rows_and_main_diameters(self):
  doc={'search_result_nested':[
   {'category_en':'Dimensions','name':'Delik çapı','unit':'mm','real_value':20.0},
   {'category_en':'Dimensions','name':'Dış çap','unit':'mm','real_value':47.0},
   {'category_en':'Dimensions','name':'Genişlik','unit':'mm','real_value':14.0},
   {'category_en':'Dimensions','name':'İç bilezik omuz çapı','unit':'mm','real_value':28.8}]}
  d,s,w=skf.extract_manufacturer_data(doc)
  self.assertEqual(d,{'inner':20.0,'outer':47.0,'width':14.0});self.assertEqual(len(s),4);self.assertEqual(w,[])
 def test_imperial_and_non_dimension_rows_do_not_become_metric_dimensions(self):
  d,_,_=skf.extract_manufacturer_data({'search_result_nested':[
   {'category_en':'Dimensions','name':'Delik çapı','unit':'in','real_value':1},
   {'category_en':'Performance','name':'Dış çap','unit':'mm','real_value':80},
   {'category_en':'Dimensions','name':'Mil çapı','unit':'mm','real_value':30}]})
  self.assertEqual(d,{})
 def test_conflicting_values_stay_excluded_even_after_repeated_rows(self):
  d,_,w=skf.extract_manufacturer_data({'search_result_nested':[{'category_en':'Dimensions','name':'Dış çap','unit':'mm','real_value':v}for v in[47,48,47]]})
  self.assertNotIn('outer',d);self.assertTrue(w)
 def test_invalid_pairs_and_non_numeric_values_are_excluded(self):
  d,_,w=skf.extract_manufacturer_data({'search_result_nested':[
   {'category_en':'Dimensions','name':'Delik çapı','unit':'mm','real_value':50},
   {'category_en':'Dimensions','name':'Dış çap','unit':'mm','real_value':40},
   {'category_en':'Dimensions','name':'Genişlik','unit':'mm','real_value':'14'}]})
  self.assertEqual(d,{});self.assertTrue(w)
 def test_detail_response_structure_and_units_are_preserved(self):
  d,s,w=skf.extract_manufacturer_data({'technical_data':[{'name_en':'Dimensions','rows':[
   {'name':'Delik çapı','unit':'mm','value':12.7},
   {'name':'Dış çap','unit':'mm','value':28.575}]}]})
  self.assertEqual(d,{'inner':12.7,'outer':28.575});self.assertEqual(s[0],['Delik çapı (mm)','12.7']);self.assertEqual(w,[])

if __name__=='__main__':unittest.main()
