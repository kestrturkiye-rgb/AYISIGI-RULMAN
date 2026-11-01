import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyTechnicalQuery, parseTechnicalQuery, matchesTechnicalQuery, matchesProductCode, matchesTextQuery} from '../src/technical-search.js';
const bearing={code:'6204 2RS',baseCode:'6204',dimensions:{inner:20,outer:47,width:14}};
const parse=values=>parseTechnicalQuery({...emptyTechnicalQuery,...values});
test('full and base codes match; partial and unrelated suffixes do not',()=>{
 for(const code of ['6204','6204 2rs','6204-2RS'])assert.equal(matchesTechnicalQuery(bearing,parse({code}).query),true);
 for(const code of ['620','6204 2','6204 ZZ'])assert.equal(matchesTechnicalQuery(bearing,parse({code}).query),false);
});
test('dimensions require all supplied values and support decimal comma',()=>{
 assert.equal(matchesTechnicalQuery(bearing,parse({inner:'20',outer:'47',width:'14'}).query),true);
 assert.equal(matchesTechnicalQuery(bearing,parse({inner:'20',outer:'48'}).query),false);
 assert.equal(matchesTechnicalQuery(bearing,parse({code:'6205',inner:'20'}).query),false);
 const cone={code:'30206',dimensions:{inner:30,outer:62,width:17.25}};
 for(const width of ['17,25','17.25'])assert.equal(matchesTechnicalQuery(cone,parse({width}).query),true);
});
test('unknown dimensions do not match; partial dimension searches remain usable',()=>{
 assert.equal(matchesTechnicalQuery({code:'UCP 205',dimensions:{inner:25}},parse({inner:'25'}).query),true);
 assert.equal(matchesTechnicalQuery({code:'UCP 205',dimensions:{inner:25}},parse({outer:'52'}).query),false);
 assert.equal(matchesTechnicalQuery({code:'08B-1'},parse({inner:'12.7'}).query),false);
});
test('empty, invalid and impossible dimensional inputs report errors',()=>{
 assert.ok(parse({}).error);
 for(const inner of ['0','-2','abc','20mm','Infinity','1e2','1,2,3'])assert.ok(parse({inner}).error);
 assert.ok(parse({inner:'47',outer:'47'}).error);
 assert.ok(parse({inner:'48',outer:'47'}).error);
 assert.equal(parse({inner:' 20 '}).query.inner,20);
});
test('bearing codes work with spaces, dashes, Unicode dashes and brand prefixes',()=>{
 const p={...bearing,brand:'SKF',searchText:'6204 2rs skf sabit bilyalı rulman'};
 for(const code of ['6204 2RS','6204-2RS','62042rs','6204–2RS','SKF 6204-2RS','6204 2RS SKF','６２０４ ２ＲＳ','6204\u200B2RS']){
  assert.ok(matchesProductCode(p,code),code);
  assert.ok(matchesTextQuery(p,code),code);
 }
 assert.ok(matchesTextQuery(p,'sabit bilyalı'));
 assert.equal(matchesProductCode(p,'FAG 6204 2RS'),false);
 assert.equal(matchesProductCode({code:'3/4',brand:'SKF'},'34'),false);
 assert.equal(matchesTechnicalQuery(p,{code:'SKF62042RS',inner:20,outer:47}),true);
 assert.equal(matchesTechnicalQuery(p,{code:'SKF62042RS',inner:20,outer:48}),false);
});
test('verified manufacturer aliases work with an optional brand and preserve fractional codes',()=>{
 const p={code:'6001 2RSH C3',brand:'SKF',codeAliases:['6001-2RSH/C3'],searchText:'6001 2rsh c3 skf'};
 for(const code of ['6001-2RSH/C3','SKF6001-2RSH/C3','6001-2RSH/C3 SKF']){
  assert.ok(matchesProductCode(p,code),code);assert.ok(matchesTextQuery(p,code),code);
 }
 assert.equal(matchesProductCode({code:'3/4',brand:'SKF'},'34'),false);
});
