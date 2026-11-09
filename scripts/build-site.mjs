// Existing Pages workflow still calls: npm run build -- --base=/repository/
// Build the unchanged public site, then append the separately isolated admin app.
import {spawnSync} from 'node:child_process';
const args=process.argv.slice(2);
const equal=args.find(a=>a.startsWith('--base='));const index=args.indexOf('--base');
const base=equal?.slice(7)||(index>=0?args[index+1]:'/');
if(!base || (base!=='/'&&!/^\/[A-Za-z0-9_/-]*\/$/.test(base)))throw Error('Geçersiz base yolu.');
const vite=new URL('../node_modules/vite/bin/vite.js',import.meta.url).pathname;
const publicBuild=spawnSync(process.execPath,[vite,'build',...args],{stdio:'inherit',env:process.env});
if(publicBuild.status!==0)process.exit(publicBuild.status||1);
const adminBuild=spawnSync('npm',['run','build:admin'],{stdio:'inherit',env:{...process.env,VITE_ADMIN_BASE:base+'admin/'}});
process.exit(adminBuild.status||0);
