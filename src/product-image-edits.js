import { publicAssetPath } from './catalog-data';

// Reviewed, product-specific edits. Original catalog files remain intact.
const editedImages = {
 '39c900fb29f4c13863766301.webp': 'catalog/edited-images/rbe-bearing-clean.webp',
 '3dc3aa9fdde7a1d16db714c9.webp': 'catalog/edited-images/bearing-series-clean.webp',
 '7a1c76e824282411ce84fedd.webp': 'catalog/edited-images/jesa-bearing-clean.webp',
 '7e1f36924f5a7ebced0aac0a.webp': 'catalog/edited-images/miru-pom-clean.webp',
};
export function displayProductImage(product) {
 const filename=product.image?.split('/').pop();
 return editedImages[filename] ? publicAssetPath(editedImages[filename]) : product.image;
}
