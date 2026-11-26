'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'site','bibleget.js'),'utf8');
function reader(fetcher=async()=>{throw Error('Network calls forbidden in tests');}){
 const context={URL,URLSearchParams,AbortSignal,fetch:fetcher};
 context.globalThis=context;
 vm.runInNewContext(source,context,{filename:'bibleget.js'});
 return context.DueBibleGet;
}
function verses(){
 return [46,47,48,49,50].map(n=>({booknum:46,univbooknum:'47',testament:2,version:'CEI2008',chapter:12,verse:String(n),text:'Esempio non biblico '+n}));
}
test('single chapter and non-consecutive verses parsed',()=>{
 const r=reader();
 assert.equal(r.parseReference('Mt 12,46-50').query,'Mt12,46-50');
 assert.deepEqual(Array.from(r.parseReference('1Cor 15,20-26.28').verses),[20,21,22,23,24,25,26,28]);
});
test('ambiguous and over-50-verse references rejected before fetching',()=>{
 const r=reader();
 for(const ref of ['Mt 1,1-51','Mt 1,1-3.3-5','Mt 1,3-1','Mt 1,3x-5','Sal 22(23)']){
  assert.throws(()=>r.parseReference(ref));
 }
});
test('Antico Testamento book references and aliases are accepted',()=>{
 const r=reader();
 assert.equal(r.parseReference('Gen 1,1-3').query,'Gen1,1-3');
 assert.equal(r.parseReference('Gn 1,1-3').query,'Gen1,1-3');
 assert.equal(r.parseReference('Zc 2,14-17').booknum,45);
 assert.equal(r.parseReference('Ez 34,11-12.15-17').booknum,33);
 assert.equal(r.parseReference('Gio 1,1-2').query,'Gna1,1-2');
 assert.equal(r.parseReference('Ab 1,1-2').booknum,42);
});
test('reject wrong book or testament even with matching chapter and verse',()=>{
 const r=reader(),ref=r.parseReference('Zc 2,14-17');
 const rows=[14,15,16,17].map(n=>({booknum:44,univbooknum:'45',testament:1,version:'CEI2008',chapter:2,verse:String(n),text:'synthetic test'}));
 assert.equal(r.validateResponse({results:rows},ref).length,4);
 assert.throws(()=>r.validateResponse({results:rows.map((x,i)=>i===1?{...x,univbooknum:'33'}:x)},ref));
 assert.throws(()=>r.validateResponse({results:rows.map((x,i)=>i===2?{...x,testament:2}:x)},ref));
});
test('valid JSON v3 verses are accepted',()=>{
 const r=reader();const got=r.validateResponse({results:verses()},r.parseReference('Mt 12,46-50'));
 assert.equal(got.length,5);assert.equal(got[0].text,'Esempio non biblico 46');
});
test('wrong edition, missing verses and verse mismatch are rejected',()=>{
 const r=reader(),ref=r.parseReference('Mt 12,46-50');
 assert.throws(()=>r.validateResponse({results:verses().slice(1)},ref));
 assert.throws(()=>r.validateResponse({results:verses().map((v,i)=>i===1?{...v,version:'LUZZI'}:v)},ref));
 assert.throws(()=>r.validateResponse({results:verses().map((v,i)=>i===1?{...v,verse:'999'}:v)},ref));
});
test('API call is on demand, carries mandatory appid, uses no credentials',async()=>{
 let calls=0,url,opts;
 const r=reader(async(u,o)=>{calls++;url=new URL(u);opts=o;return {ok:true,url:u,json:async()=>({results:verses()})};});
 assert.equal(calls,0);
 const got=await r.get('Mt 12,46-50');
 assert.equal(got.length,5);assert.equal(calls,1);
 assert.equal(url.origin,'https://query.bibleget.io');
 assert.equal(url.pathname,'/v3/');
 assert.equal(url.searchParams.get('version'),'CEI2008');
 assert.equal(url.searchParams.get('appid'),'DueTestamentiWeb');
 assert.equal(url.searchParams.get('query'),'Mt12,46-50');
 assert.equal(opts.credentials,'omit');
 await r.get('Mt 12,46-50');assert.equal(calls,1);
});
test('reject API failure without showing different text',async()=>{
 const r=reader(async()=>({ok:true,url:'https://query.bibleget.io/v3/quote',json:async()=>({results:verses().slice(0,3)})}));
 await assert.rejects(r.get('Mt 12,46-50'),/BibleGet non ha restituito tutti/);
});
test('public dated archives contain no legacy reader content',()=>{
 const data=path.join(__dirname,'site','data');
 const names=fs.readdirSync(data).filter(x=>/^\d{4}-\d{2}-\d{2}\.json$/.test(x));
 assert.ok(names.length>0);
 for(const name of names){
  const day=JSON.parse(fs.readFileSync(path.join(data,name),'utf8'));
  for(const entry of day.readings) {
   assert.equal(entry.text||'','',name);
   assert.equal(Object.hasOwn(entry,'reader'),false,name);
  }
  assert.equal(day.reader_version,2,name);
 }
});

test('Prima Lettura across chapters with liturgical partial verse',()=>{
 const r=reader(),ref=r.parseReference('Ap 18,1-2.21-23;19,1-3.9a');
 assert.equal(ref.query,'Ap18,1-2.21-23;19,1-3.9');
 assert.equal(ref.expandedPartial,true);
 assert.deepEqual(Array.from(ref.expected,x=>[x.chapter,x.verse]),[[18,1],[18,2],[18,21],[18,22],[18,23],[19,1],[19,2],[19,3],[19,9]]);
 const rows=ref.expected.map(x=>({version:'CEI2008',univbooknum:'73',testament:2,chapter:x.chapter,verse:String(x.verse),text:'synthetic verse'}));
 assert.equal(r.validateResponse({results:rows},ref).length,9);
 assert.throws(()=>r.validateResponse({results:rows.slice(0,8)},ref));
 assert.throws(()=>r.validateResponse({results:rows.map((x,i)=>i===6?{...x,chapter:18}:x)},ref));
});
test('Prima Lettura with cross-chapter interval 20 to 21',()=>{
 const r=reader(),ref=r.parseReference('Ap 20,1-4.11-21,2');
 assert.equal(ref.query,'Ap20,1-4;20,11-21,2');
 const seq=[1,2,3,4,11,12,13,14,15].map(v=>({chapter:20,verse:v}))
   .concat([1,2].map(v=>({chapter:21,verse:v})));
 const rows=seq.map(x=>({version:'CEI2008',univbooknum:'73',testament:2,chapter:x.chapter,verse:String(x.verse),text:'synthetic verse'}));
 assert.equal(r.validateResponse({results:rows},ref).length,11);
 assert.throws(()=>r.validateResponse({results:rows.slice(0,-1)},ref));
 assert.throws(()=>r.validateResponse({results:rows.map((x,i)=>i===6?{...x,verse:'17'}:x)},ref));
});
test('Liturgical verse fragments normalize to whole verse and report difference',()=>{
 const r=reader(),ref=r.parseReference('Ap 14,1-3.4b-5');
 assert.equal(ref.query,'Ap14,1-3.4-5');assert.equal(ref.expandedPartial,true);
 assert.equal(ref.expected.length,5);
});
