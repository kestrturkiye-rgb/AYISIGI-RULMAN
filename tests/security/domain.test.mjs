import test from 'node:test';
import assert from 'node:assert/strict';
import {AUTH_ORIGIN,AUTH_ORIGINS,requestAuthOrigin,publicServiceUrl,canonicalAuthTarget} from '../../src/security/policy.mjs';
import {makeHandler} from '../../api/_gateway.mjs';

test('service requests stay on approved custom domains and retain the existing GitHub fallback',()=>{
 for(const origin of AUTH_ORIGINS){
  assert.equal(publicServiceUrl('/api/quote',{origin}),origin+'/api/quote');
  assert.equal(publicServiceUrl('/api/collect',{origin}),origin+'/api/collect');
  assert.equal(requestAuthOrigin(new URL(origin).host),origin);
 }
 assert.equal(publicServiceUrl('/api/quote',{origin:'https://attacker.example'}),AUTH_ORIGIN+'/api/quote');
 assert.equal(publicServiceUrl('/api/collect',{origin:'https://kestrturkiye-rgb.github.io'}),AUTH_ORIGIN+'/api/collect');
 assert.equal(requestAuthOrigin('rulmanteklif.com.attacker.example'),null);
 assert.equal(requestAuthOrigin('rulmanteklif.com:444'),null);
 assert.equal(canonicalAuthTarget({hostname:'rulmanteklif.com',search:'',hash:'#/hesabim'}),null);
});

test('quote and analysis gateways allow custom domains and reject similar foreign origins',async()=>{
 const previous={key:process.env.RT_GATEWAY_HMAC_SECRET,url:process.env.RT_OPS_URL},nativeFetch=globalThis.fetch;
 process.env.RT_GATEWAY_HMAC_SECRET='domain-test-only';process.env.RT_OPS_URL='https://ops.example.test';
 let calls=0;globalThis.fetch=async()=>{calls++;return Response.json({accepted:true},{status:202});};
 const invoke=async(kind,origin,body)=>{
  const res={headers:{},setHeader(k,v){this.headers[k]=v;},end(v){this.body=v;}};
  await makeHandler(kind)({method:'POST',headers:{origin},body},res);return res;
 };
 try{
  for(const origin of ['https://rulmanteklif.com','https://www.rulmanteklif.com']){
   const quote=await invoke('quote',origin,{details:{customer:'Test'},items:[],website:''});
   assert.equal(quote.statusCode,202);assert.equal(quote.headers['Access-Control-Allow-Origin'],origin);
   const event=await invoke('collect',origin,{consent:true,kind:'page_view',path:'/',sessionId:'test-session-12345678'});
   assert.equal(event.statusCode,202);assert.equal(event.headers['Access-Control-Allow-Origin'],origin);
  }
  assert.equal(calls,4);
  for(const origin of ['https://rulmanteklif.com.attacker.example','http://rulmanteklif.com','https://rulmanteklif.com:444']){
   assert.equal((await invoke('quote',origin,{})).statusCode,403);
  }
  assert.equal(calls,4);
 }finally{
  globalThis.fetch=nativeFetch;
  for(const [k,v]of [['RT_GATEWAY_HMAC_SECRET',previous.key],['RT_OPS_URL',previous.url]]){if(v===undefined)delete process.env[k];else process.env[k]=v;}
 }
});
