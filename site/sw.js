'use strict';
const CACHE='due-testamenti-gratis-v19';
const base=self.registration.scope;
const assets=['./','./index.html','./style.css?v=19','./bibleget.js?v=11','./podcast.js?v=15','./app.js?v=18','./style.css','./app.js','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png'].map(p=>new URL(p,base).href);
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(assets)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('due-testamenti-gratis-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);
 if(u.origin!==self.location.origin)return;
 if(e.request.method!=='GET'||!u.href.startsWith(base))return;
 if(!assets.includes(u.href)&&e.request.mode!=='navigate')return;
 e.respondWith(fetch(e.request).then(r=>{if(!r.ok&&e.request.mode==='navigate')throw Error('offline');return r;}).catch(async()=>{
 const c=await caches.open(CACHE);return (await c.match(e.request))||(e.request.mode==='navigate'?await c.match(base):null)||Response.error();
 }));
});
