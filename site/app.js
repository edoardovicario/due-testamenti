'use strict';
const $=id=>document.getElementById(id);
const romeFormatter=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Rome',calendar:'gregory',numberingSystem:'latn',year:'numeric',month:'2-digit',day:'2-digit'});
const romeDay=(now=new Date())=>{const p=Object.fromEntries(romeFormatter.formatToParts(now).map(x=>[x.type,x.value]));return p.year+'-'+p.month+'-'+p.day;};
let selected=romeDay(), lastToday=selected, onToday=true, requestId=0, installPrompt=null;
let loadingDay=null;
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
// Load the original publisher page only on an explicit user gesture.
let meditationUrl=null;
function closeMeditation(){
 $('ep-frame-host').replaceChildren();
 $('ep-reader').hidden=true;
 $('ep-open').setAttribute('aria-expanded','false');
 $('ep-open').textContent='Leggi la meditazione';
}
function setMeditation(url){
 if(url!==meditationUrl)closeMeditation();
 meditationUrl=url;
 $('ep-open').hidden=!url;
}
$('ep-open').onclick=()=>{
 if(!meditationUrl)return;
 if(!$('ep-reader').hidden){closeMeditation();return;}
 const frame=document.createElement('iframe');
 frame.className='ep-frame';
 frame.title='Meditazione originale di don Luigi Maria Epicoco';
 frame.setAttribute('sandbox','');
 frame.setAttribute('referrerpolicy','no-referrer');
 frame.src=meditationUrl;
 $('ep-frame-host').replaceChildren(frame);
 $('ep-reader').hidden=false;
 $('ep-open').setAttribute('aria-expanded','true');
 $('ep-open').textContent='Chiudi la meditazione';
};
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
  // CEI 2008 is fetched from BibleGet only when opened; ignore old Martini data.
  const status=make('p','reader-edition','Il testo CEI 2008 viene caricato online su richiesta.');
  status.setAttribute('role','status');panel.append(status);
  const passage=make('div','reader-verses');panel.append(passage);
  const credit=make('p','reader-credit','Bibbia CEI 2008 © Fondazione di Religione “Santi Francesco d’Assisi e Caterina da Siena”. ');
  const creditLink=make('a','','BibleGet I/O');
  creditLink.href='https://www.bibleget.io/';creditLink.target='_blank';creditLink.rel='noopener noreferrer';
  credit.append(creditLink);credit.hidden=true;panel.append(credit);
  const href=safeLink(r.url,'cei');
  if(href){const link=make('a','outlink reader-official','Versione liturgica ufficiale CEI ↗');link.href=href;link.target='_blank';link.rel='noopener noreferrer';panel.append(link);}
  let attempted=false;
  async function openReader(){
   if(attempted)return;
   attempted=true;status.textContent='Caricamento della Bibbia CEI 2008…';
   try{
    if(!globalThis.DueBibleGet)throw Error('Reader missing');
    const verses=await globalThis.DueBibleGet.get(r.reference);
    if(!details.isConnected)return;
    const p=make('p','body-reading');
    for(const v of verses){
     const n=make('sup','',String(v.verse));
     p.append(n,document.createTextNode(' '+v.text+' '));
    }
    passage.replaceChildren(p);
    status.textContent='Bibbia CEI 2008 · testo recuperato da BibleGet I/O';
    credit.hidden=false;
   }catch(error){
    if(!details.isConnected)return;
    status.textContent=error&&error.name==='BibleGetUnavailable'?error.message:'Testo non disponibile. Controlla la connessione o consulta il sito CEI.';
    attempted=false;
   }
  }
  details.append(panel);details.addEventListener('toggle',()=>{toggle.textContent=details.open?'Chiudi il testo':'Leggi il testo';if(details.open)void openReader();});
  if(details.open){toggle.textContent='Chiudi il testo';void openReader();}
  a.append(details);$('readings').append(a);
 }
 $('oldnote').textContent=data.readings.some(r=>r.testament==='Antico Testamento'&&r.kind!=='salmo responsoriale')?'': 'Oggi la liturgia non prevede una lettura autonoma dell’Antico Testamento; vengono rispettate le letture effettive del giorno.';
 const c=data.comment; $('comment-ref').textContent='Vangelo: '+c.reference; $('comment-text').textContent=c.text||c.preview||''; const epHref=safeLink(c.url,'ep');setMeditation(c.status==='matched'&&epHref?epHref:null);$('ep-link').hidden=c.status!=='matched'||!epHref;$('ep-link').removeAttribute('href');
 if(c.status==='matched'&&epHref){$('ep-link').href=epHref;$('comment-status').textContent=(c.archived?'Meditazione di archivio sul medesimo passo. ':'Meditazione associata al brano di oggi. ')+(c.method||'')+'. '+(c.preview?'Breve estratto; testo integrale sul sito originale. ':'')+'Fonte: '+c.source;}
 else {$('comment-text').textContent='';$('comment-status').textContent=c.message||'Collegamento non verificabile: non mostrato.';}
 $('updated').textContent='Data delle letture: '+printDate(data.date)+(data.updated_at?' · Ultimo aggiornamento: '+new Date(data.updated_at).toLocaleString('it-IT',{timeZone:'Europe/Rome'}):'');
 $('content').hidden=false; $('status').hidden=!(offline||data.stale); $('status').textContent='Copia disponibile per questa stessa data. La verifica o la connessione online non è al momento disponibile.';
}
async function load(d){if(!/^\d{4}-\d{2}-\d{2}$/.test(d))return;const id=++requestId;loadingDay=d;if(d!==selected)setMeditation(null);selected=d;onToday=d===romeDay();$('date').textContent=printDate(d);$('choose').value=d;$('cei').href='https://www.chiesacattolica.it/liturgia-del-giorno/?data-liturgia='+d.replaceAll('-','');$('status').hidden=false;$('status').textContent='Caricamento delle letture e della meditazione…';$('content').hidden=true;$('title').textContent='La Parola del giorno';
 try{const res=await fetch('./data/'+d+'.json',{cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:typeof AbortSignal.timeout==='function'?AbortSignal.timeout(15000):undefined});if(!res.ok)throw Error('Fonti non disponibili');const data=await res.json();if(data.date!==d)throw Error('Data diversa');if(offlineOpt)store.set('due-testamenti:day:'+d,JSON.stringify(data));if(id===requestId)render(data);}
 catch(e){if(id!==requestId)return;let cached=null;try{if(offlineOpt)cached=JSON.parse(store.get('due-testamenti:day:'+d));}catch{}if(cached&&cached.date===d)render(cached,true);else $('status').textContent='Scheda non ancora disponibile per questa data. Puoi leggere i testi ufficiali CEI dal collegamento qui sotto. Gli aggiornamenti automatici vengono eseguiti più volte al giorno. Non mostriamo letture di un giorno diverso.';}
 finally{if(id===requestId)loadingDay=null;}}
$('choose').onchange=e=>{if(e.target.value)load(e.target.value);};$('prev').onclick=()=>load(add(selected,-1));$('next').onclick=()=>load(add(selected,1));$('today').onclick=()=>load(romeDay());$('retry').onclick=()=>load(selected);
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
// Always start on today's Roman-calendar date, including restored PWA windows.
function openToday(){
 const now=romeDay();lastToday=now;
 if(loadingDay===now&&selected===now)return;
 return load(now);
}
function tick(){
 const now=romeDay();
 if(now!==lastToday){lastToday=now;if(onToday&&!document.hidden)openToday();}
}
setInterval(tick,15000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)openToday();});
window.addEventListener('pageshow',e=>{if(e.persisted)openToday();});
window.addEventListener('online',()=>{if(onToday&&!document.hidden)openToday();});
setInterval(()=>{if(onToday&&!document.hidden)openToday();},1800000);
openToday();


// Hide installation guidance in the installed app (iOS and other PWA browsers).
const installButton=$('install');
if(installButton){
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
}
