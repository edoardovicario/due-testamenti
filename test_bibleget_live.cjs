'use strict';
const assert=require('node:assert/strict');
(async()=>{
 const qs=new URLSearchParams({query:'Gv3,16-17',version:'CEI2008',return:'json',appid:'DueTestamentiWeb',pluginversion:'1.0'});
 const res=await fetch('https://query.bibleget.io/v3/?'+qs,{
  method:'GET',headers:{Accept:'application/json',Origin:'https://edoardovicario.github.io'},
  signal:AbortSignal.timeout(20000)
 });
 assert.ok(res.ok,'BibleGet live HTTP status: '+res.status);
 const cors=res.headers.get('access-control-allow-origin');
 assert.ok(cors==='*'||cors==='https://edoardovicario.github.io','CORS not allowed for GitHub Pages');
 const body=await res.json();
 assert.ok(Array.isArray(body.results));
 assert.equal(body.results.length,2);
 for(const [i,row] of body.results.entries()){
  assert.equal(String(row.version).toUpperCase(),'CEI2008');
  assert.equal(Number(row.chapter),3);
  assert.equal(Number(row.verse),i+16);
  assert.ok(typeof row.text==='string'&&row.text.trim().length>0);
 }
 console.log('BibleGet live verified: CEI2008 JSON complete, CORS allowed, two verses checked; text not logged.');
})().catch(err=>{console.error('BibleGet live check failed: '+err.message);process.exitCode=1;});
