import test from 'node:test';
import assert from 'node:assert/strict';
import {loginSchema,passwordSchema,staffSchema} from '../../packages/contracts/src/index.ts';
import {permits} from '../../apps/admin/src/app/permissions.ts';
test('login validates email and required password with Turkish errors',()=>{const r=loginSchema.safeParse({email:'bad',password:''});assert.equal(r.success,false);assert.match(r.error.issues[0].message,/Geçerli/);assert.ok(loginSchema.safeParse({email:'admin@example.test',password:'any-valid-existing-password'}).success);});
test('new password requires length and matching confirmation',()=>{assert.equal(passwordSchema.safeParse({password:'short',confirmation:'short'}).success,false);assert.equal(passwordSchema.safeParse({password:'123456789012',confirmation:'different'}).success,false);assert.ok(passwordSchema.safeParse({password:'123456789012',confirmation:'123456789012'}).success);});
test('roles accept sales and reject untrusted role values',()=>{for(const role of ['admin','editor','sales'])assert.ok(staffSchema.safeParse({user_id:'11111111-1111-4111-8111-111111111111',role}).success);assert.equal(staffSchema.safeParse({user_id:'x',role:'owner'}).success,false);});
test('permission matrix keeps catalog and commercial access separate',()=>{assert.equal(permits('sales','catalog'),false);assert.equal(permits('editor','quotes'),false);assert.equal(permits('editor','settings'),false);assert.equal(permits('sales','quotes'),true);for(const p of ['catalog','quotes','settings'])assert.equal(permits('admin',p),true);});
