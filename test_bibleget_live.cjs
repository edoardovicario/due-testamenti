'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
(async()=>{
 const source=fs.readFileSync('site/bibleget.js','utf8');
 const context={URL,URLSearchParams,AbortSignal,fetch};context.globalThis=context;
 vm.runInNewContext(source,context,{filename:'bibleget.js'});
 const bible=context.DueBibleGet;
 for(const reference of ['Gen 1,1-3','Zc 2,14-17','Ez 34,11-12.15-17','Gv 3,16-17']){
  const parsed=bible.parseReference(reference);
  const qs=new URLSearchParams({query:parsed.query,version:'CEI2008',return:'json',appid:'DueTestamentiWeb',pluginversion:'1.0'});
  const response=await fetch('https://query.bibleget.io/v3/?'+qs,{headers:{Accept:'application/json',Origin:'https://edoardovicario.github.io'},signal:AbortSignal.timeout(20000)});
  assert.ok(response.ok,reference+' HTTP '+response.status);
  const cors=response.headers.get('access-control-allow-origin');
  assert.ok(cors==='*'||cors==='https://edoardovicario.github.io',reference+' CORS missing');
  const data=await response.json();
  const verses=bible.validateResponse(data,parsed);
  assert.equal(verses.length,parsed.verses.length);
  console.log(reference+': CEI 2008 verified, '+verses.length+' verses, original book confirmed (content not logged)');
 }

 // Verify exact complete multi-chapter passages; a partial verse must never be expanded.
 for(const reference of ['Ap 18,1-2.21-23;19,1-3.9','Ap 20,1-4.11-21,2']){
  const parsed=bible.parseReference(reference);
  const query=new URLSearchParams({query:parsed.query,version:'CEI2008',return:'json',appid:'DueTestamentiWeb',pluginversion:'1.0'});
  const response=await fetch('https://query.bibleget.io/v3/?'+query,{headers:{Accept:'application/json',Origin:'https://edoardovicario.github.io'},signal:AbortSignal.timeout(20000)});
  assert.ok(response.ok,reference+' HTTP '+response.status);
  const cors=response.headers.get('access-control-allow-origin');
  assert.ok(cors==='*'||cors==='https://edoardovicario.github.io',reference+' CORS missing');
  const verses=bible.validateResponse(await response.json(),parsed);
  assert.equal(verses.length,parsed.expectedVerseCount);
  console.log(reference+': First Reading verified, '+verses.length+' verses across chapters; no text logged');
 }
})().catch(err=>{console.error('BibleGet test error: '+err.message);process.exitCode=1;});
