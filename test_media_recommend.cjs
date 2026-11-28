'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={};ctx.globalThis=ctx;
for(const name of ['podcast_match.js','podcast.js','media_recommend.js'])
 vm.runInNewContext(fs.readFileSync('site/'+name,'utf8'),ctx);
const m=ctx.DueMedia;
const spotify={show_id:'3zi4rUpHdKFicPVbJ4pvXM',episodes:[{id:'1A23456789012345678901',title:'La speranza cristiana',topics:['speranza']}]};
const youtube={channel_id:'UCK9NyEkJ-X89kXCwp1eXFjw',videos:[{id:'kMVNeTUVD-c',title:'Il discorso della Samaritana (Gv 4,5-42)'}]};
const day=(g,c='')=>({date:'2026-11-28',readings:[{kind:'prima lettura',reference:'Is 2,1-5',summary:'Speranza e luce'},{kind:'vangelo',reference:g,summary:'Speranza e fede'}],comment:{status:c?'matched':'pending',source:'Famiglia Cristiana',text:c}});
test('Commentary outranks exact Gospel',()=>{
 const r=m.recommend(day('Gv 4,5-42','La speranza'),spotify,youtube);
 assert.equal(r.platform,'spotify');assert.equal(r.confidence,'tematico');
});
test('Reading changes do not affect selection',()=>{
 assert.deepEqual(m.recommend(day('Gv 4,5-42','La speranza'),spotify,youtube),m.recommend(day('Lc 21,34-36','La speranza'),spotify,youtube));
});
test('Missing or unrelated commentary returns null',()=>{
 assert.equal(m.recommend(day('Gv 4,5-42'),spotify,youtube),null);
 assert.equal(m.recommend(day('Gv 4,5-42','Un tavolo'),spotify,youtube),null);
});
test('YouTube can win based on commentary',()=>{
 const y={...youtube,videos:[{id:'kMVNeTUVD-c',title:'Preghiera e vigilanza'}]};
 assert.equal(m.recommend(day('Gv 4,5-42','Pregare e vigilare'),spotify,y).platform,'youtube');
});
test('Reject other channel',()=>{
 assert.equal(m.recommend(day('Gv 4,5-42','Preghiera'),null,{...youtube,channel_id:'UCfake'}),null);
});
