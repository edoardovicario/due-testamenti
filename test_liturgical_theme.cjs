'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const env={};env.globalThis=env;
vm.runInNewContext(fs.readFileSync('site/liturgical_theme.js','utf8'),env);
const theme=env.DueLiturgicalTheme;
test('Gregorian Easter 2025–27',()=>{
 for(const [year,day] of [[2025,'2025-04-20'],[2026,'2026-04-05'],[2027,'2027-03-28']])
  assert.equal(new Date(theme.easter(year)).toISOString().slice(0,10),day);
});
test('Advent 2026 begins 29 November, before is ordinary',()=>{
 assert.equal(theme.forDate('2026-11-28').color,'verde');
 assert.equal(theme.forDate('2026-11-29').color,'viola');
 assert.equal(theme.forDate('2026-11-29').key,'advent');
});
test('Five colors and liturgical boundaries',()=>{
 const expected={
  '2026-12-13':'rosa','2026-12-24':'viola','2026-12-25':'bianco',
  '2027-01-10':'bianco','2027-01-11':'verde',
  '2026-02-18':'viola','2026-03-15':'rosa',
  '2026-03-29':'rosso','2026-04-03':'rosso','2026-04-05':'bianco',
  '2026-05-23':'bianco','2026-05-24':'rosso','2026-05-25':'verde',
  '2026-11-28':'verde','2026-11-29':'viola'
 };
 for(const [day,color] of Object.entries(expected))assert.equal(theme.forDate(day).color,color,day);
});
test('Theme switches when a different date is requested',()=>{
 const body={dataset:{}},label={textContent:''};
 env.document={body,getElementById:()=>label};
 assert.equal(theme.apply('2026-11-28').color,'verde');
 assert.equal(theme.apply('2026-11-29').color,'viola');
 assert.equal(body.dataset.liturgicalSeason,'advent');
 assert.match(label.textContent,/Avvento · viola/);
 assert.equal(theme.apply('2026-12-25').color,'bianco');
});
test('Invalid date rejected; selection applied before data fetch',()=>{
 assert.equal(theme.forDate('2026-02-30'),null);
 assert.equal(theme.forDate('invalid'),null);
 const app=fs.readFileSync('site/app.js','utf8'),html=fs.readFileSync('site/index.html','utf8'),sw=fs.readFileSync('site/sw.js','utf8');
 assert.match(app,/DueLiturgicalTheme\?\.apply\(d\)/);
 assert.ok(app.indexOf('DueLiturgicalTheme?.apply(d)')<app.indexOf("const res=await fetch('./data/'"));
 assert.match(html,/liturgical_theme\.js\?v=24/);
 assert.match(html,/id="liturgical-season"/);
 assert.match(sw,/due-testamenti-gratis-v24/);
 const css=fs.readFileSync('site/style.css','utf8');
 for(const color of ['verde','viola','bianco','rosso','rosa'])assert.ok(css.includes('body[data-liturgical-color="'+color+'"]'),color);
});
