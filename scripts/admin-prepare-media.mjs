import {readFile,writeFile} from 'node:fs/promises';
import {brotliCompressSync,constants} from 'node:zlib';
// Binary comes from the integrity-locked npm package; keep it out of source control.
await writeFile(new URL('../supabase/functions/rt-catalog-media/magick.wasm.br',import.meta.url),brotliCompressSync(await readFile(new URL('../node_modules/@imagemagick/magick-wasm/dist/magick.wasm',import.meta.url)),{params:{[constants.BROTLI_PARAM_QUALITY]:11}}));
console.log('ImageMagick 0.0.35 WASM hazırlandı.');
