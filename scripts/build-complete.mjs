import {spawnSync} from 'node:child_process';import {mkdir,copyFile} from 'node:fs/promises';
function run(command,args,extra={}){const result=spawnSync(command,args,{stdio:'inherit',env:{...process.env,...extra}});if(result.status!==0)process.exit(result.status||1);}
run('npm',['run','build'],{VITE_MINIMAL_PUBLIC_BUILD:'true',VITE_DATA_SOURCE:'supabase',VITE_STATIC_HOST:'true'});
for(const [source,target]of [['public/fonts/NotoSans-Turkish.woff2','dist/fonts/NotoSans-Turkish.woff2'],['public/brand/rulman-teklif.webp','dist/brand/rulman-teklif.webp']]){await mkdir(new URL('../'+target,import.meta.url).pathname.split('/').slice(0,-1).join('/'),{recursive:true});await copyFile(source,target);}
run('npm',['run','build:admin'],{VITE_ADMIN_BASE:'/admin/',VITE_PUBLIC_SITE_URL:'https://kestrturkiye-rgb.github.io/AYISIGI-RULMAN/#/'});
