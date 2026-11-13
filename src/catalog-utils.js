export const appBase = import.meta.env?.BASE_URL || '/';
export function publicAssetPath(path, base = appBase) {
 if(/^https:\/\//.test(path))return path;
 return `${base.endsWith('/') ? base : base + '/'}${path.replace(/^\/+/, '')}`;
}

export const sourceNames = { skf: 'SKF', sts: 'STS Rulman', rt: 'Rulman Toptancısı',eteknik:'Eteknik Hırdavat',teknikyapi:'Teknik Yapı Hırdavat',tarimgaraj:'Tarım Garaj',hirdavat:'Hirdavat.com',tarimdeposu:'Tarım Deposu' };
export const formatCount = value => value.toLocaleString('tr-TR');
export function formatDimensions(dimensions) {
 const format=n=>n.toLocaleString('tr-TR',{maximumFractionDigits:4});
 const {inner,outer,width}=dimensions;
 if(inner!==undefined&&outer!==undefined&&width!==undefined)return `${format(inner)} × ${format(outer)} × ${format(width)} mm`;
 const parts=[inner!==undefined&&`İç: ${format(inner)}`,outer!==undefined&&`Dış: ${format(outer)}`,width!==undefined&&`En: ${format(width)}`].filter(Boolean);
 return parts.length?`${parts.join(' · ')} mm`:'Ölçü bilgisi teklif aşamasında doğrulanır';
}
