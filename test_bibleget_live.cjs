'use strict';
const assert=require('node:assert/strict');
(async()=>{
 const qs=new URLSearchParams({query:'Gv3,16-17',version:'CEI2008',return:'json',appid:'DueTestamentiWeb',pluginversion:'1.0'});
 const endpoints=[
  ['v3-meta','https://query.bibleget.io/v3/metadata/bibleversions'],
  ['v3-quote','https://query.bibleget.io/v3/quote?'+qs],
  ['v3-legacy','https://query.bibleget.io/v3/?'+qs],
  ['legacy-root','https://query.bibleget.io/?'+qs]
 ];
 let valid=false;
 for(const [name,url] of endpoints){
  try{
   const res=await fetch(url,{headers:{Accept:'application/json',Origin:'https://edoardovicario.github.io'},signal:AbortSignal.timeout(15000)});
   const cors=res.headers.get('access-control-allow-origin');
   console.log(name+': HTTP '+res.status+'; CORS '+(cors||'absent')+'; final path '+new URL(res.url).pathname);
   if(name!=='v3-quote'||!res.ok)continue;
   const body=await res.json();
   assert.ok(Array.isArray(body.results));
   assert.equal(body.results.length,2);
   for(const [i,row] of body.results.entries()){
    assert.equal(String(row.version).toUpperCase(),'CEI2008');
    assert.equal(Number(row.chapter),3);
    assert.equal(Number(row.verse),i+16);
    assert.ok(typeof row.text==='string'&&row.text.trim());
   }
   assert.ok(cors==='*'||cors==='https://edoardovicario.github.io');
   valid=true;
  }catch(error){console.log(name+': '+error.name+' - '+error.message);}
 }
 assert.ok(valid,'The configured v3 quote endpoint is not yet usable; no CEI passage printed.');
 console.log('BibleGet live verified without logging copyrighted texts.');
})().catch(err=>{console.error(err.message);process.exitCode=1;});
