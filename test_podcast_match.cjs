'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const context={};context.globalThis=context;
vm.runInNewContext(fs.readFileSync('site/podcast_match.js','utf8'),context,{filename:'podcast_match.js'});
const m=context.DuePodcastPassage;
const ep=(id,title,description='')=>({id,title,description});
const a='1A23456789012345678901',b='2A23456789012345678901';
const day=(first,gospel)=>({date:'2026-11-28',readings:[
 {kind:'prima lettura',reference:first,summary:'La salvezza è vicina'},
 {kind:'vangelo',reference:gospel,summary:'Gesù esorta a pregare'}]});
test('Reader reference parses all requested verses including separated chapters',()=>{
 const verses=m.verseKeys('Ap 18,1-2.21-23;19,1-3.9a');
 assert.equal(verses.size,9);assert.ok(verses.has('Ap:19:9'));
 const cross=m.verseKeys('Ap 20,1-4.11-21,2');
 assert.equal(cross.size,11);assert.ok(cross.has('Ap:20:15'));assert.ok(cross.has('Ap:21:1'));
});
test('Direct citation in first reading outranks generic title',()=>{
 const r=m.matchDay(day('At 2,42-47','Lc 21,34-36'),[
 ep(a,'Speranza e preghiera'),ep(b,'Le conseguenze della Pentecoste (Atti 2,42-47)')]);
 assert.equal(r.ep.id,b);assert.equal(r.reading.kind,'prima lettura');assert.equal(r.method,'citazione');
});
test('Narrative from Gospel is direct if it is the same episode',()=>{
 const r=m.matchDay(day('Is 2,1-5','Gv 4,5-42'),[
 ep(a,'La gioia e la speranza'),ep(b,'La Quaresima e la Samaritana')]);
 assert.equal(r.ep.id,b);assert.equal(r.method,'scena');assert.equal(r.reading.kind,'vangelo');
});
test('Wrong verses and entire-book catecheses are not direct',()=>{
 const readings=day('Gal 3,27-29','Mc 9,1-10');
 assert.equal(m.matchDay(readings,[ep(a,'Il Gesù di Marco')]),null);
 assert.equal(m.matchDay(readings,[ep(a,'Gal 3,26')]),null);
 assert.equal(m.matchDay(readings,[ep(a,'Una riflessione sulla speranza e la preghiera')]),null);
 assert.equal(m.matchDay(readings,[ep(a,'Tutti voi siete uno in Cristo Gesù (Gal 3,28)')]).method,'citazione');
});
test('Trasfigurazione direct only for its actual synoptic passages',()=>{
 assert.ok(m.matchDay(day('Is 2,1-5','Mc 9,2-10'),[ep(a,'Riflessione sulla Trasfigurazione')]));
 assert.equal(m.matchDay(day('Is 2,1-5','Mc 10,1-10'),[ep(a,'Riflessione sulla Trasfigurazione')]),null);
});
test('Browser uses passage selection before thematic fallback',()=>{
 const js=fs.readFileSync('site/podcast.js','utf8'),html=fs.readFileSync('site/index.html','utf8');
 assert.match(js,/DuePodcastPassage\?\.matchDay/);
 assert.ok(js.indexOf('DuePodcastPassage?.matchDay')<js.indexOf('const evidence='));
 assert.match(html,/podcast_match\.js\?v=22/);
});
