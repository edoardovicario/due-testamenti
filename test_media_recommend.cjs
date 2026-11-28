'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={};ctx.globalThis=ctx;
for(const name of ['podcast_match.js','podcast.js','media_recommend.js'])
 vm.runInNewContext(fs.readFileSync('site/'+name,'utf8'),ctx);
const m=ctx.DueMedia;
const spotify={show_id:'3zi4rUpHdKFicPVbJ4pvXM',episodes:[{id:'1A23456789012345678901',title:'La speranza cristiana',topics:['speranza']}]};
const youtube={channel_id:'UCK9NyEkJ-X89kXCwp1eXFjw',videos:[{id:'kMVNeTUVD-c',title:'Il discorso della Samaritana (Gv 4,5-42)'}]};
const day=(g,c='')=>({date:'2026-11-28',readings:[{kind:'prima lettura',reference:'Is 2,1-5',summary:'Speranza e luce'},{kind:'vangelo',reference:g,summary:'Speranza e fede'}],comment:{status:c?'matched':'pending',source:'Famiglia Cristiana',text:c}});
test('Video of exact Gospel outranks themed Spotify episode',()=>{
 const r=m.recommend(day('Gv 4,5-42','La speranza risana ogni ferita'),spotify,youtube);
 assert.equal(r.platform,'youtube');assert.equal(r.confidence,'passo-diretto');assert.equal(r.id,'kMVNeTUVD-c');
});
test('Spotify direct match outranks generic YouTube content',()=>{
 const s={...spotify,episodes:[{id:'1A23456789012345678901',title:'Lettura Gv 4,5-42'}]};
 const y={...youtube,videos:[{id:'kMVNeTUVD-c',title:'La speranza e la fiducia'}]};
 assert.equal(m.recommend(day('Gv 4,5-42'),s,y).platform,'spotify');
});
test('Thematic fallback can select YouTube even without direct verses',()=>{
 const y={...youtube,videos:[{id:'kMVNeTUVD-c',title:'Preghiera e vigilanza nella vita cristiana'}]};
 const d={date:'2026-11-28',readings:[{kind:'vangelo',reference:'Lc 21,34-36',summary:'Gesù invita a pregare e vigilare'}],comment:{status:'pending'}};
 const r=m.recommend(d,spotify,y);
 assert.equal(r.platform,'youtube');assert.equal(r.confidence,'tematico');
});
test('Reject fabricated video IDs or a different channel',()=>{
 assert.equal(m.recommend(day('Gv 4,5-42'),null,{...youtube,channel_id:'UCfake'}),null);
 assert.equal(m.recommend(day('Gv 4,5-42'),null,{...youtube,videos:[{id:'wrong',title:'Gv 4,5-42'}]}),null);
});
test('Prefer exact bibliographic match over general spirituality',()=>{
 const r=m.recommend(day('Gv 4,5-42'),spotify,youtube);
 assert.match(r.reason,/Vangelo/);assert.match(r.url,/youtube\.com\/watch\?v=/);
});
