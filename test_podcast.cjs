'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('site/podcast.js','utf8');
const catalog=JSON.parse(fs.readFileSync('site/podcast_catalog.json','utf8'));
const context={};
context.globalThis=context;
vm.runInNewContext(source,context,{filename:'podcast.js'});
const p=context.DuePodcast;
function makeDay(gospel,comment='',date='2026-11-27'){
 return {date,readings:[{kind:'prima lettura',summary:'Non deve dominare la selezione.'},{kind:'vangelo',summary:gospel}],comment:{status:comment?'matched':'pending',source:'Famiglia Cristiana',text:comment}};
}
test('Real episode IDs and expected official Spotify show are linked',()=>{
 assert.equal(catalog.show_id,p.SHOW_ID);
 assert.equal(catalog.show_url,'https://open.spotify.com/show/'+p.SHOW_ID);
 assert.ok(catalog.episodes.length>=8);
 assert.equal(new Set(catalog.episodes.map(e=>e.id)).size,catalog.episodes.length);
 for(const episode of catalog.episodes){
  assert.match(episode.id,/^[A-Za-z0-9]{22}$/);
  assert.ok(p.safeEpisode(episode),episode.title);
 }
});
test('Gospel and meditation share a concept: meaningful matching is preferred',()=>{
 const day=makeDay('Gesù annuncia che la liberazione è vicina, non dobbiamo perdere la speranza.','Nelle prove difficili è possibile conservare la speranza, affidandosi al Signore.');
 const result=p.recommend(day,catalog);
 assert.ok(result);
 assert.equal(result.confidence,'tematico');
 assert.match(result.reason,/Vangelo e la meditazione/);
 assert.match(result.url,/^https:\/\/open.spotify.com\/episode\/[A-Za-z0-9]{22}$/);
 assert.ok(result.theme);
});
test('Darkness and judgment select a different theme from hope when that dominates',()=>{
 const day=makeDay('Gesù parla di male e del giudizio sul male.',
 'La forza del male, il maligno e il giudizio aiutano a distinguere bene e male. Una riflessione su giustizia e giudizio.');
 const result=p.recommend(day,catalog);
 assert.equal(result.id,'0BkIMYfWyRSdhlgf19rOMp');
 assert.match(result.reason,/male|giustizia/i);
});
test('A cross prayer Gospel can be represented even without full commentary',()=>{
 const day=makeDay('Gesù invita alla preghiera e a vigilare.');
 const result=p.recommend(day,catalog);
 assert.ok(result);
 assert.match(result.url,/\/episode\//);
 assert.ok(['tematico','generale'].includes(result.confidence));
 assert.doesNotMatch(result.reason,/Vangelo e la meditazione/);
});
test('Deterministic for each day, not random on subsequent renders',()=>{
 const day=makeDay('La salvezza è vicina, abbiate fiducia e speranza.','C’è una promessa di libertà e salvezza.');
 assert.deepEqual(JSON.parse(JSON.stringify(p.recommend(day,catalog))),JSON.parse(JSON.stringify(p.recommend(day,catalog))));
});
test('Refuse malformed or other-show catalog',()=>{
 const day=makeDay('La speranza ci aiuta a vivere.');
 assert.equal(p.recommend(day,{...catalog,show_id:'other'}),null);
 assert.equal(p.recommend(day,{...catalog,episodes:[{id:'bogus',title:'Fake',topics:['speranza']}]}),null);
});
test('Reading-only data can still offer an optional episode',()=>{
 const day={date:'2026-11-29',readings:[{kind:'vangelo',summary:'Rimarrete in attesa con speranza della promessa di Dio.'}],comment:{status:'pending'}};
 const result=p.recommend(day,catalog);
 assert.ok(result);
 assert.match(result.reason,/lettura|meditazione/i);
});
test('Podcast HTML embeds only official player, lazily on user gesture',()=>{
 const app=fs.readFileSync('site/app.js','utf8');
 const index=fs.readFileSync('site/index.html','utf8');
 assert.match(app,/podcast-play'\)\.onclick=/);
 assert.match(app,/https:\/\/open\.spotify\.com\/embed\/episode\//);
 assert.match(app,/encrypted-media/);
 assert.match(app,/document\.createElement\('iframe'\)/);
 assert.match(index,/frame-src https:\/\/open\.spotify\.com/);
 assert.match(index,/id="podcast-card"/);
 assert.match(index,/id="podcast-embed"/);
});
