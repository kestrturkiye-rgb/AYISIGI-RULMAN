import { publicAssetPath } from './catalog-data';

import editedImages from './product-image-map.json';

export function displayProductImage(product) {
 const filename=product.image?.split('/').pop();
 return editedImages[filename] ? publicAssetPath(editedImages[filename]) : product.image;
}
