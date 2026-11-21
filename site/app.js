'use strict';
const $=id=>document.getElementById(id);
const romeDay=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
let selected=romeDay(), lastToday=selected, onToday=true, requestId=0, installPrompt=null;
const add=(d,n)=>{const t=new Date(d+'T12:00:00Z');t.setUTCDate(t.getUTCDate()+n);return t.toISOString().slice(0,10);};
const printDate=d=>new Intl.DateTimeFormat('it-IT',{dateStyle:'full',timeZone:'Europe/Rome'}).format(new Date(d+'T12:00:00Z'));
const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text)el.textContent=text;return el;};
const store={get:k=>{try{return localStorage.getItem(k);}catch{return null;}},set:(k,v)=>{try{localStorage.setItem(k,v);}catch{}},del:k=>{try{localStorage.removeItem(k);}catch{}}};
const safeLink=(value,kind)=>{try{const u=new URL(value);const hosts=kind==='cei'?['www.chiesacattolica.it','chiesacattolica.it']:['www.cercoiltuovolto.it','cercoiltuovolto.it'];return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&hosts.includes(u.hostname)?u.href:null;}catch{return null;}};
let offlineOpt=store.get('due-testamenti:offline')==='yes';
function clearLocal(){try{for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(k&&(k.startsWith('due-testamenti:')||/^day:\d{4}-\d{2}-\d{2}$/.test(k)||k==='font'))localStorage.removeItem(k);}}catch{}}
if(!offlineOpt)clearLocal();
$('offline-opt').checked=offlineOpt;
$('offline-opt').onchange=e=>{offlineOpt=e.target.checked;if(offlineOpt){store.set('due-testamenti:offline','yes');load(selected);}else clearLocal();$('privacy-status').textContent=offlineOpt?'Salvataggio offline attivato.':'Schede locali eliminate; salvataggio disattivato.';};
$('clear-local').onclick=()=>{offlineOpt=false;clearLocal();$('offline-opt').checked=false;$('privacy-status').textContent='Dati locali eliminati. L’eventuale cache tecnica del browser o del sito ospitante è gestita separatamente.';};
function render(data,offline=false){
 $('title').textContent=data.celebration;
 const openReadings=new Set([...$('readings').querySelectorAll('details[open]')].map(el=>el.dataset.key));
 $('readings').replaceChildren();
 for(const r of data.readings){
  const a=make('article','reading-card');
  a.append(make('div','card-label',r.label.toUpperCase()+' · '+r.testament.toUpperCase()),make('h2','',r.reference));
  const preview=make('div','reading-preview');
  preview.append(make('p','overline',r.summary_kind==='heading'?'TEMA LITURGICO':r.summary_kind==='automatic'?'IN BREVE · TEMI AUTOMATICI':'IN BREVE'));
  preview.append(make('p','reading-summary',r.summary||'Il riassunto di questa lettura non è ancora disponibile.'));
  a.append(preview);
  const details=make('details','reading-details');details.dataset.key=data.date+'|'+r.kind+'|'+r.reference;details.open=openReadings.has(details.dataset.key);
  const toggle=make('summary','reader-toggle','Leggi il testo');details.append(toggle);
  const panel=make('div','reader-content');
  const reader=r.reader;
  if(reader&&reader.reference===r.reference&&reader.edition==='Bibbia Martini (1769–1781)'&&typeof reader.text==='string'&&reader.text.trim()){
   panel.append(make('p','reader-edition',reader.edition+' · traduzione cattolica storica, non CEI 2008'));
   if(reader.note)panel.append(make('p','reader-edition',reader.note));
   panel.append(make('p','body-reading',reader.text));
   const credit=make('p','reader-credit','Testo di pubblico dominio. Dati strutturati: Giovanni Novelli / ');const origin=make('a','','Parola Viva');origin.href='https://parolaviva.art/opendata';origin.target='_blank';origin.rel='noopener noreferrer';const license=make('a','','CC BY 4.0');license.href='https://creativecommons.org/licenses/by/4.0/';license.target='_blank';license.rel='noopener noreferrer';credit.append(origin,document.createTextNode(' · '),license);panel.append(credit);
  }else{
   panel.append(make('p','reader-edition','Testo interno non ancora disponibile o numerazione da verificare. Non viene mostrato un passo diverso.'));
  }
  const href=safeLink(r.url,'cei');
  if(href){const link=make('a','outlink reader-official','Versione liturgica ufficiale CEI ↗');link.href=href;link.target='_blank';link.rel='noopener noreferrer';panel.append(link);}
  details.append(panel);details.addEventListener('toggle',()=>{toggle.textContent=details.open?'Chiudi il testo':'Leggi il testo';});
  if(details.open)toggle.textContent='Chiudi il testo';
  a.append(details);$('readings').append(a);
 }
 $('oldnote').textContent=data.readings.some(r=>r.testament==='Antico Testamento'&&r.kind!=='salmo responsoriale')?'': 'Oggi la liturgia non prevede una lettura autonoma dell’Antico Testamento; vengono rispettate le letture effettive del giorno.';
 const c=data.comment; $('comment-ref').textContent='Vangelo: '+c.reference; $('comment-text').textContent=c.text||c.preview||''; const epHref=safeLink(c.url,'ep');$('ep-link').hidden=c.status!=='matched'||!epHref;$('ep-link').removeAttribute('href');
 if(c.status==='matched'&&epHref){$('ep-link').href=epHref;$('comment-status').textContent=(c.archived?'Meditazione di archivio sul medesimo passo. ':'Meditazione associata al brano di oggi. ')+(c.method||'')+'. '+(c.preview?'Breve estratto; testo integrale sul sito originale. ':'')+'Fonte: '+c.source;}
 else {$('comment-text').textContent='';$('comment-status').textContent=c.message||'Collegamento non verificabile: non mostrato.';}
 $('updated').textContent='Data delle letture: '+printDate(data.date)+(data.updated_at?' · Ultimo aggiornamento: '+new Date(data.updated_at).toLocaleString('it-IT',{timeZone:'Europe/Rome'}):'');
 $('content').hidden=false; $('status').hidden=!(offline||data.stale); $('status').textContent='Copia disponibile per questa stessa data. La verifica o la connessione online non è al momento disponibile.';
}
async function load(d){const id=++requestId;selected=d;onToday=d===romeDay();$('date').textContent=printDate(d);$('choose').value=d;$('cei').href='https://www.chiesacattolica.it/liturgia-del-giorno/?data-liturgia='+d.replaceAll('-','');$('status').hidden=false;$('status').textContent='Caricamento delle letture e della meditazione…';$('content').hidden=true;$('title').textContent='La Parola del giorno';
 try{const res=await fetch('./data/'+d+'.json',{cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:typeof AbortSignal.timeout==='function'?AbortSignal.timeout(15000):undefined});if(!res.ok)throw Error('Fonti non disponibili');const data=await res.json();if(data.date!==d)throw Error('Data diversa');if(offlineOpt)store.set('due-testamenti:day:'+d,JSON.stringify(data));if(id===requestId)render(data);}
 catch(e){if(id!==requestId)return;let cached=null;try{if(offlineOpt)cached=JSON.parse(store.get('due-testamenti:day:'+d));}catch{}if(cached&&cached.date===d)render(cached,true);else $('status').textContent='Scheda non ancora disponibile per questa data. Puoi leggere i testi ufficiali CEI dal collegamento qui sotto. Gli aggiornamenti automatici vengono eseguiti più volte al giorno. Non mostriamo letture di un giorno diverso.';}}
$('choose').onchange=e=>{if(e.target.value)load(e.target.value);};$('prev').onclick=()=>load(add(selected,-1));$('next').onclick=()=>load(add(selected,1));$('today').onclick=()=>load(romeDay());$('retry').onclick=()=>load(selected);
// Hide installation guidance in the installed app (iOS and other PWA browsers).
const installButton=$('install');
const standaloneMode=window.matchMedia('(display-mode: standalone)');
let installedThisSession=false;
const isInstalled=()=>installedThisSession||standaloneMode.matches||navigator.standalone===true;
function syncInstallButton(){
 installButton.hidden=isInstalled();
 if(installButton.hidden)installPrompt=null;
}
syncInstallButton();
if(typeof standaloneMode.addEventListener==='function')standaloneMode.addEventListener('change',syncInstallButton);
else if(typeof standaloneMode.addListener==='function')standaloneMode.addListener(syncInstallButton);
window.addEventListener('pageshow',syncInstallButton);
document.addEventListener('visibilitychange',syncInstallButton);
window.addEventListener('appinstalled',()=>{installedThisSession=true;syncInstallButton();});
window.addEventListener('beforeinstallprompt',e=>{
 e.preventDefault();
 if(!isInstalled())installPrompt=e;
});
installButton.onclick=async()=>{
 if(isInstalled()){syncInstallButton();return;}
 if(installPrompt){
  const prompt=installPrompt;
  installPrompt=null;
  try{await prompt.prompt();}catch{if(!isInstalled())alert('Apri il menu del browser per installare l’app.');}
 }else alert('Su iPhone: Safari → Condividi → Aggiungi alla schermata Home. Su Android: Chrome → menu → Installa app.');
};
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
function tick(){const now=romeDay();if(now!==lastToday){lastToday=now;if(onToday)load(now);}}setInterval(tick,15000);document.addEventListener('visibilitychange',()=>{if(!document.hidden){tick();if(onToday)load(romeDay());}});setInterval(()=>{if(onToday&&!document.hidden)load(romeDay());},1800000);load(selected);
