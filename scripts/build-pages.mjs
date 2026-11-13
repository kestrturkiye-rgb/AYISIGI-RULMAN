import {spawnSync} from 'node:child_process';
const base=process.argv.find(a=>a.startsWith('--base='))?.slice(7)||'/AYISIGI-RULMAN/';
if(!/^\/[a-zA-Z0-9_/-]*\/$/.test(base)&&base!=='/')throw Error('Geçersiz base yolu.');
function run(args,env={}){const result=spawnSync('npm',args,{stdio:'inherit',env:{...process.env,...env}});if(result.status!==0)process.exit(result.status||1);}
run(['run','build','--','--base='+base]);
run(['run','build:admin'],{VITE_ADMIN_BASE:base+'admin/'});
