import { hashPassword } from '../server/auth.js';
if(!process.stdin.isTTY)throw Error('Run this command in an interactive terminal.');
process.stdout.write('Yeni yönetici şifresi (en az 16 karakter, ekranda görünmez): ');
let password='';process.stdin.setRawMode(true);process.stdin.resume();process.stdin.setEncoding('utf8');
process.stdin.on('data',data=>{
 if(data==='\u0003'){process.stdin.setRawMode(false);process.exit(1)}
 if(/[\r\n]/.test(data)){
  process.stdin.setRawMode(false);process.stdin.pause();
  if(password.length<16){console.error('\nEn az 16 karakter kullanın.');process.exit(1)}
  console.log('\nADMIN_PASSWORD_HASH='+hashPassword(password));return;
 }
 if(data==='\u007f'){password=password.slice(0,-1);return}password+=data;
});
