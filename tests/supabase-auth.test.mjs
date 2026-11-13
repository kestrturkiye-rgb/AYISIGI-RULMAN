import test from 'node:test';import assert from 'node:assert/strict';
import {supabaseConfiguration,authRedirectUrl,hasAuthCallback} from '../src/supabase/config.js';
import {staffAccess,signIn,completeAuthCallback,authError} from '../src/supabase/auth-service.js';
import {assertPublicEnvironment} from '../src/supabase/env-guard.js';
import {databaseConfig,assertProject} from '../scripts/supabase/database.mjs';
import {slugify} from '../scripts/supabase/import-plan.mjs';
const jwt=role=>'x.'+Buffer.from(JSON.stringify({role})).toString('base64url')+'.x';
const valid={VITE_SUPABASE_URL:'https://example.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_example_public_key'};
test('missing Supabase config leaves the static site usable; partial/unsafe config is rejected',()=>{
 assert.deepEqual(supabaseConfiguration({}),{configured:false});assert.equal(supabaseConfiguration(valid).configured,true);assert.ok(supabaseConfiguration({VITE_SUPABASE_URL:valid.VITE_SUPABASE_URL}).error);
 for(const url of ['http://example.supabase.co','https://user:password@example.supabase.co','https://example.supabase.co/extra'])assert.ok(supabaseConfiguration({...valid,VITE_SUPABASE_URL:url}).error);
 assert.equal(supabaseConfiguration({...valid,VITE_SUPABASE_URL:'http://127.0.0.1:54321'}).configured,true);
});
test('service-role/secret keys cannot pass the browser configuration or build guard',()=>{
 for(const key of ['sb_secret_not_for_browsers',jwt('service_role'),jwt('authenticated')])assert.ok(supabaseConfiguration({...valid,VITE_SUPABASE_PUBLISHABLE_KEY:key}).error);
 assert.equal(supabaseConfiguration({...valid,VITE_SUPABASE_PUBLISHABLE_KEY:jwt('anon')}).configured,true);
 assert.throws(()=>assertPublicEnvironment({...valid,VITE_DATABASE_URL:'never-output-this'}),/VITE_DATABASE_URL/);
 assert.throws(()=>assertPublicEnvironment({...valid,VITE_SUPABASE_PUBLISHABLE_KEY:jwt('service_role')}),/publishable|anon/);
});
test('password sign-in uses email/password only and never assigns a role from the browser',async()=>{
 let received;const client={auth:{signInWithPassword:async input=>{received=input;return {data:{session:{}}}}}};
 await signIn(client,' editor@example.test ','private-input');assert.deepEqual(received,{email:'editor@example.test',password:'private-input'});
});
test('only an active role returned by the RLS-protected RPC unlocks the panel',async()=>{
 assert.equal(await staffAccess({rpc:async()=>({data:[]})}),null);assert.equal(await staffAccess({rpc:async()=>({data:[{role:'superuser'}]})}),null);
 assert.equal((await staffAccess({rpc:async name=>{assert.equal(name,'get_staff_access');return {data:[{user_id:'1',role:'editor'}]}}})).role,'editor');
 await assert.rejects(staffAccess({rpc:async()=>({error:Error('network')})}));
});
test('PKCE callback exchanges the code exactly once and does not use hash routes',async()=>{
 let calls=0;await completeAuthCallback({auth:{exchangeCodeForSession:async code=>{calls++;assert.equal(code,'one-time');return {data:{}}}}},{search:'?code=one-time',hash:''});assert.equal(calls,1);
 assert.equal(authRedirectUrl({origin:'https://kestrturkiye-rgb.github.io'},'/AYISIGI-RULMAN/','recovery'),'https://kestrturkiye-rgb.github.io/AYISIGI-RULMAN/?auth_action=recovery');
 assert.equal(hasAuthCallback({search:'',hash:'#/admin'}),false);
 assert.equal(hasAuthCallback({search:'?code=one-time',hash:''}),true);
});
test('invite/recovery token hashes are verified; unsupported types and expired links fail safely',async()=>{
 let input;await completeAuthCallback({auth:{verifyOtp:async value=>{input=value;return {}}}},{search:'?token_hash=hash&type=invite',hash:''});assert.deepEqual(input,{token_hash:'hash',type:'invite'});
 await assert.rejects(completeAuthCallback({}, {search:'?token_hash=hash&type=signup',hash:''}),/desteklenmiyor/);
 await assert.rejects(completeAuthCallback({}, {search:'?error=access_denied&error_description=secret',hash:''}),error=>!error.message.includes('secret'));
});
test('legacy implicit callback requires both tokens and validates through Auth',async()=>{
 let input;await completeAuthCallback({auth:{setSession:async value=>{input=value;return {}}}},{search:'',hash:'#access_token=a&refresh_token=b&type=recovery'});assert.deepEqual(input,{access_token:'a',refresh_token:'b'});
 await assert.rejects(completeAuthCallback({}, {search:'',hash:'#access_token=a'}),/Eksik/);
});
test('authentication errors are Turkish and do not echo provider details or entered credentials',()=>{
 assert.match(authError({code:'invalid_credentials',message:'private'}),/şifre yanlış/);assert.match(authError({status:429}),/Çok fazla/);assert.match(authError({code:'email_not_confirmed',status:400}),/doğrulayın/);assert.ok(!authError({message:'private'}).includes('private'));
});
test('remote database TLS verification cannot be disabled through sslmode=require',()=>{
 const config=databaseConfig('postgresql://postgres:unused@db.example.supabase.co/postgres?sslmode=require');assert.equal(config.ssl.rejectUnauthorized,true);assert.ok(!config.connectionString.includes('sslmode='));assert.throws(()=>databaseConfig('postgresql://example.com/db',{localOnly:true}),/yerel/);
});
test('apply requires exact project confirmation, and local bypass is limited to test DB names',()=>{
 assert.throws(()=>assertProject({databaseUrl:'postgresql://localhost/production',local:true}),/test veritaban/);
 assert.throws(()=>assertProject({databaseUrl:'postgresql://db.wrong.supabase.co/postgres',projectUrl:'https://example.supabase.co',confirmation:'example'}),/eşleşmiyor/);
 assert.throws(()=>assertProject({databaseUrl:'postgresql://postgres.example@aws-0-eu.pooler.supabase.com:6543/postgres',projectUrl:'https://example.supabase.co',confirmation:'example'}),/Session Pooler/);
 assert.doesNotThrow(()=>assertProject({databaseUrl:'postgresql://postgres@db.example.supabase.co/postgres',projectUrl:'https://example.supabase.co',confirmation:'example'}));
});
test('slugs handle Turkish text and never end in a separator after truncation',()=>{
 assert.equal(slugify('İğneli rulman / ölçü'),'igneli-rulman-olcu');assert.ok(!slugify('a-'.repeat(100)).endsWith('-'));
});
