'use strict';
const assert=require('node:assert/strict');
(async()=>{
 const qs=new URLSearchParams({query:'Gv3,16-17',version:'CEI2008',return:'json',appid:'DueTestamentiWeb',pluginversion:'1.0'});
 const res=await fetch('https://query.bibleget.io/v3/quote?'+qs,{
  method:'GET',
  headers:{Accept:'application/json',Origin:'https://edoardovicario.github.io'},
  signal:AbortSignal.timeout(20000)
 });
 assert.equal(res.ok,true,'API did not return HTTP 2xx');
 const allow=res.headers.get('access-control-allow-origin');
 assert.ok(allow==='*'||allow==='https://edoardovicario.github.io','CORS not enabled for our GitHub Pages origin');
 const body=await res.json();
 assert.ok(Array.isArray(body.results),'Missing results array');
 assert.equal(body.results.length,2,'Unexpected verse count');
 for(const [i,row] of body.results.entries()){
  assert.equal(String(row.version).toUpperCase(),'CEI2008');
  assert.equal(Number(row.chapter),3);
  assert.equal(Number(row.verse),i+16);
  assert.ok(typeof row.text==='string'&&row.text.trim().length>0);
 }
 console.log('BibleGet live: HTTP 2xx; CEI2008 response complete; CORS for GitHub Pages accepted; 2 verses checked (text not logged).');
})().catch(err=>{console.error('BibleGet live smoke test failed:',err.message);process.exitCode=1;});
