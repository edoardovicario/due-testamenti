'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('site/reading_intro.js','utf8');
const ctx={};ctx.globalThis=ctx;
vm.runInNewContext(source,ctx,{filename:'reading_intro.js'});
const intros=ctx.DueReadingIntro;
test('Introductions match actual liturgical books, not just reading type',()=>{
 assert.equal(intros.forBook('Lc'),'Dal Vangelo secondo Luca');
 assert.equal(intros.forBook('Mt'),'Dal Vangelo secondo Matteo');
 assert.equal(intros.forBook('Mc'),'Dal Vangelo secondo Marco');
 assert.equal(intros.forBook('Gv'),'Dal Vangelo secondo Giovanni');
 assert.equal(intros.forBook('Ap'),'Dal libro dell’Apocalisse di san Giovanni apostolo');
 assert.equal(intros.forBook('Gen'),'Dal libro della Genesi');
 assert.equal(intros.forBook('Zc'),'Dal libro del profeta Zaccarìa');
 assert.equal(intros.forBook('1Cor'),'Dalla prima lettera di san Paolo apostolo ai Corinzi');
 assert.equal(intros.forBook('1Pt'),'Dalla prima lettera di san Pietro apostolo');
 assert.equal(intros.forBook('Sal'),'Dal libro dei Salmi');
 assert.equal(intros.forBook('At'),'Dagli Atti degli Apostoli');
 assert.equal(intros.forBook('unknown'),null);
});
test('Every canonical book recognized by BibleGet has an introduction',()=>{
 const code=fs.readFileSync('site/bibleget.js','utf8');
 const match=code.match(/const BOOKS=new Map\('([^']+)'\.split\(' '\)/);
 assert.ok(match,'BibleGet canonical book list missing');
 const books=match[1].split(' ');
 assert.equal(books.length,73);
 for(const book of books){
  const heading=intros.forBook(book);
  assert.ok(heading&&heading.length>14,book+' has no heading');
  assert.match(heading,/^(Dal|Dalla|Dagli)/,book+' has an invalid beginning');
 }
});
test('Introduction appears in the expanded reader, before the verses but not in the preview',()=>{
 const app=fs.readFileSync('site/app.js','utf8');
 const html=fs.readFileSync('site/index.html','utf8');
 const stylesheet=fs.readFileSync('site/style.css','utf8');
 assert.match(app,/panel\.append\(introduction\);/);
 assert.ok(app.indexOf('panel.append(introduction);')<app.indexOf("const passage=make('div','reader-verses')"));
 assert.match(app,/introduction\.textContent=heading/);
 assert.match(app,/introduction\.hidden=!heading/);
 assert.match(html,/reading_intro\.js\?v=21/);
 assert.match(stylesheet,/\.reading-introduction/);
 assert.doesNotMatch(app.slice(app.indexOf('const preview=make('),app.indexOf('const details=make(')),/reading-introduction/);
});
