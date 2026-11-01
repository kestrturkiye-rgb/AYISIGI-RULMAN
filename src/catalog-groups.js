// Turkish product families mapped from the three retained public catalogs.
export const productGroups = [
  {id:'bearings',name:'Rulmanlar',description:'Bilyalı, makaralı, iğneli ve hassas rulmanlar',categories:['Bilyalı rulmanlar','Makaralı rulmanlar','İğneli rulmanlar','Eksenel rulmanlar','Hassas rulmanlar','Özel rulmanlar']},
  {id:'housings',name:'Yataklar ve üniteler',description:'Yataklı rulmanlar, yataklar ve mafsallı çözümler',categories:['Yataklı rulmanlar','Rulman yatakları','Mafsallı yataklar','Burçlar']},
  {id:'linear',name:'Lineer hareket',description:'Doğrusal hareket ve hassas konumlandırma',categories:['Lineer kılavuzlar','Lineer rulmanlar','Vidalı miller','Mil tutucular']},
  {id:'maintenance',name:'Bakım ve aksesuarlar',description:'Montaj, yağlama ve durum izleme çözümleri',categories:['Montaj ve demontaj','Yağlama','Durum izleme','Aksesuarlar']},
  {id:'transmission',name:'Güç aktarım',description:'Kayış, kasnak, zincir, dişli ve kaplin ürünleri',categories:['Kayışlar','Kasnaklar','Zincirler','Dişliler','Kaplinler','Güç aktarım']},
  {id:'seals',name:'Sızdırmazlık',description:'Endüstriyel sızdırmazlık çözümleri',categories:['Sızdırmazlık elemanları']},
  {id:'other',name:'Diğer ürünler',description:'Kaynak kataloglardaki diğer ürünler',categories:['Diğer ürünler']},
];

export function matchesCategory(product, selection) {
  if (selection === 'Tüm ürünler') return true;
  const group=productGroups.find(group=>`group:${group.id}`===selection);
  return group ? group.categories.includes(product.category) : product.category===selection;
}

export function selectionName(selection) {
  return productGroups.find(group=>`group:${group.id}`===selection)?.name || selection;
}
