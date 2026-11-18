import test from 'node:test';import assert from 'node:assert/strict';
import {analyticsSiteHost,makeHandler} from '../../api/_gateway.mjs';import {PUBLIC_HOSTS} from '../../src/branding/domains.js';
test('trusted browser origins attribute all owned domains and normalize www without changing aliases',()=>{
 for(const host of PUBLIC_HOSTS)assert.equal(analyticsSiteHost({origin:'https://'+host,host:'rulman-teklif-admin.vercel.app'}),host.replace(/^www\./,''));
 assert.equal(analyticsSiteHost({host:'www.rulmankodu.com.tr'}),'rulmankodu.com.tr');assert.equal(analyticsSiteHost({origin:'https://kestrturkiye-rgb.github.io'}),'kestrturkiye-rgb.github.io');
 for(const headers of [{origin:'https://attacker.test'},{host:'rulmanteklif.com.attacker.test'},{host:'rulmanteklif.com:444'},{'x-forwarded-host':'rulmankodu.com'}])assert.equal(analyticsSiteHost(headers),null);
});
test('gateway derives site from approved request context, ignores spoofed JSON fields and retains consent, masking and event limits',async()=>{
 const saved={fetch:globalThis.fetch,key:process.env.RT_GATEWAY_HMAC_SECRET,url:process.env.RT_OPS_URL};const received=[];
 process.env.RT_GATEWAY_HMAC_SECRET='fixture-only';process.env.RT_OPS_URL='https://ops.example.test';globalThis.fetch=async(url,options)=>{received.push(JSON.parse(options.body));return Response.json({accepted:true},{status:202})};
 const invoke=async(origin,patch={})=>{const r={headers:{},setHeader(k,v){this.headers[k]=v},end(v){this.body=v}};await makeHandler('collect')({headers:{origin,host:'rulmanteknik.com','x-forwarded-for':'192.0.2.15','x-vercel-ip-city':'Ankara'},method:'POST',body:{consent:true,kind:'product_view',sessionId:'fixture-session-12345678',path:'/6001/rulman?customer=private',productId:'p',site_host:'attacker.test',hostname:'attacker.test',...patch}},r);return r};
 try{
  for(const origin of ['https://rulmanteklif.com','https://www.rulmanasistan.com.tr'])assert.equal((await invoke(origin)).statusCode,202);
  assert.equal(received[0].event.site_host,'rulmanteklif.com');assert.equal(received[1].event.site_host,'rulmanasistan.com.tr');assert.equal(received[1].event.path,'/6001/rulman');assert.equal(received[1].event.ip_mask,'192.0.2.0/24');assert.ok(!JSON.stringify(received).includes('192.0.2.15'));
  assert.equal((await invoke('https://attacker.test')).statusCode,403);assert.equal((await invoke('https://rulmanteklif.com',{consent:false})).statusCode,400);assert.equal((await invoke('https://rulmanteklif.com',{kind:'click'})).statusCode,400);assert.equal(received.length,2);
 }finally{globalThis.fetch=saved.fetch;for(const [key,value]of [['RT_GATEWAY_HMAC_SECRET',saved.key],['RT_OPS_URL',saved.url]])if(value===undefined)delete process.env[key];else process.env[key]=value;}
});
