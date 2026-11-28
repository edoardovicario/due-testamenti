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
const safeLink=(value,kind)=>{try{const u=new URL(value);const hosts=kind==='cei'?['www.chiesacattolica.it','chiesacattolica.it']:['www.cercoiltuovolto.it','cercoiltuovolto.it','www.famigliacristiana.it','famigliacristiana.it'];return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&hosts.includes(u.hostname)?u.href:null;}catch{return null;}};
let offlineOpt=store.get('due-testamenti:offline')==='yes';
function clearLocal(){try{for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(k&&(k.startsWith('due-testamenti:')||/^day:\d{4}-\d{2}-\d{2}$/.test(k)||k==='font'))localStorage.removeItem(k);}}catch{}}
if(!offlineOpt)clearLocal();
$('offline-opt').checked=offlineOpt;
$('offline-opt').onchange=e=>{offlineOpt=e.target.checked;if(offlineOpt){store.set('due-testamenti:offline','yes');load(selected);}else clearLocal();$('privacy-status').textContent=offlineOpt?'Salvataggio offline attivato.':'Schede locali eliminate; salvataggio disattivato.';};
$('clear-local').onclick=()=>{offlineOpt=false;clearLocal();$('offline-opt').checked=false;$('privacy-status').textContent='Dati locali eliminati. L’eventuale cache tecnica del browser o del sito ospitante è gestita separatamente.';};
// Show the authorized, locally published commentary within the app itself.
let meditationUrl=null, meditationText=null;
function closeMeditation(){
 $('ep-text-host').replaceChildren();
 $('ep-reader').hidden=true;
 $('ep-open').setAttribute('aria-expanded','false');
 $('ep-open').textContent='Leggi la meditazione';
}
function setMeditation(url, fullText=null){
 if(url!==meditationUrl||fullText!==meditationText)closeMeditation();
 meditationUrl=url;
 meditationText=typeof fullText==='string'&&fullText.trim()?fullText:null;
 $('ep-open').hidden=!(url&&meditationText);
}
$('ep-open').onclick=()=>{
 if(!meditationUrl||!meditationText)return;
 if(!$('ep-reader').hidden){closeMeditation();return;}
 // Use textContent instead of HTML: no scripts or markup from third parties.
 const body=make('div','ep-meditation-text');
 for(const paragraph of meditationText.split(/\n\s*\n/)){
   if(paragraph.trim())body.append(make('p','',paragraph.trim()));
 }
 $('ep-text-host').replaceChildren(body);
 $('ep-reader').hidden=false;
 $('ep-open').setAttribute('aria-expanded','true');
 $('ep-open').textContent='Chiudi la meditazione';
};
// Load only the metadata catalog. Spotify itself is contacted after pressing Play.
let podcastCatalogPromise=null,youtubeCatalogPromise=null,podcastRenderId=0;
function podcastCatalog(){
 if(!podcastCatalogPromise)podcastCatalogPromise=fetch('./podcast_catalog.json',{cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'})
  .then(r=>{if(!r.ok)throw Error('catalogo non disponibile');return r.json();})
  .catch(error=>{podcastCatalogPromise=null;throw error;});
 return podcastCatalogPromise;
}
function youtubeCatalog(){
 if(!youtubeCatalogPromise)youtubeCatalogPromise=fetch('./youtube_catalog.json',{cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'})
  .then(r=>{if(!r.ok)throw Error('catalogo YouTube non disponibile');return r.json();})
  .catch(e=>{youtubeCatalogPromise=null;throw e;});
 return youtubeCatalogPromise;
}
function resetPodcast(){
 ++podcastRenderId;
 $('podcast-embed').replaceChildren();$('podcast-play').hidden=true;
 $('podcast-card').hidden=true;
 $('podcast-show').href='https://open.spotify.com/show/3zi4rUpHdKFicPVbJ4pvXM';
}
async function renderPodcast(data){
 const id=++podcastRenderId;
 $('podcast-card').hidden=false;
 $('podcast-embed').replaceChildren();
 $('podcast-play').hidden=true;
 $('podcast-title').textContent='Selezione della puntata in corso…';
 $('podcast-reason').textContent='';
 $('podcast-link').hidden=true;
 $('podcast-subtitle').textContent='Don Luigi Maria Epicoco · YouTube e Spotify';
 try{
  if(!globalThis.DueMedia)throw Error('recommendation module unavailable');
  const [spotifyResult,youtubeResult]=await Promise.allSettled([podcastCatalog(),youtubeCatalog()]);
  const recommendation=globalThis.DueMedia.recommend(data,
   spotifyResult.status==='fulfilled'?spotifyResult.value:null,
   youtubeResult.status==='fulfilled'?youtubeResult.value:null);
  if(id!==podcastRenderId)return;
  if(!recommendation){$('podcast-title').textContent='Nessuna puntata consigliata';$('podcast-reason').textContent=globalThis.DueMedia.commentText(data)?'Nessun approfondimento tematico individuato per questa meditazione.':'La meditazione verificata non è disponibile: nessuna puntata viene suggerita.';return;}
  $('podcast-title').textContent=recommendation.title;
  $('podcast-reason').textContent=recommendation.reason;
  const youtube=recommendation.platform==='youtube';
  $('podcast-subtitle').textContent='Don Luigi Maria Epicoco · '+(youtube?'YouTube':'Spotify');
  $('podcast-link').textContent=youtube?'Apri il video su YouTube ↗':'Apri la puntata su Spotify ↗';
  $('podcast-link').href=recommendation.url;
  $('podcast-link').hidden=false;
  $('podcast-show').textContent=youtube?'Altri video di Epicoco ↗':'Tutte le puntate del podcast ↗';
  $('podcast-show').href=recommendation.show_url;
  $('podcast-other').textContent=youtube?'Podcast Epicoco su Spotify ↗':'Canale Epicoco su YouTube ↗';
  $('podcast-other').href=youtube?'https://open.spotify.com/show/3zi4rUpHdKFicPVbJ4pvXM':'https://www.youtube.com/@luigimariaepicoco';
  $('podcast-play').hidden=false;
  $('podcast-play').textContent='Ascolta nell’app';
  $('podcast-play').onclick=()=>{
   if(id!==podcastRenderId)return;
   if($('podcast-embed').childElementCount){
    $('podcast-embed').replaceChildren();
    $('podcast-play').textContent='Ascolta nell’app';
    return;
   }
   const frame=document.createElement('iframe');
   if(youtube){
    frame.src='https://www.youtube-nocookie.com/embed/'+recommendation.id+'?playsinline=1';
    frame.title='YouTube · '+recommendation.title;
    frame.className='podcast-youtube-player';
   }else{
    frame.src='https://open.spotify.com/embed/episode/'+recommendation.id+'?utm_source=generator';
    frame.title='Spotify · '+recommendation.title;
    frame.className='podcast-spotify-player';
   }
   frame.setAttribute('allow','autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture');
   frame.setAttribute('allowfullscreen','');
   frame.setAttribute('loading','lazy');
   // YouTube requires the site origin in the HTTP Referer for embedded playback.
   frame.setAttribute('referrerpolicy',youtube?'strict-origin-when-cross-origin':'no-referrer');
   frame.setAttribute('frameborder','0');
   $('podcast-embed').replaceChildren(frame);
   $('podcast-play').textContent='Chiudi il lettore';
  };
 }catch(error){
  if(id!==podcastRenderId)return;
  $('podcast-title').textContent='Podcast di don Luigi Maria Epicoco';
  $('podcast-reason').textContent='La selezione non è disponibile. Puoi consultare Spotify e il canale YouTube di Epicoco.';
 }
}

function render(data,offline=false){
 $('title').textContent=data.celebration;
 const openReadings=new Set([...$('readings').querySelectorAll('details[open]')].map(el=>el.dataset.key));
 $('readings').replaceChildren();
 for(const r of data.readings){
  const a=make('article','reading-card');
  a.append(make('div','card-label',r.label.toUpperCase()+' · '+r.testament.toUpperCase()),make('h2','',r.reference));
  // Show a real teaser, never a legacy machine-generated keyword list.
  if(r.summary&&r.summary.trim()&&!/^Nel brano emergono questi temi/i.test(r.summary)){
   const preview=make('div','reading-preview');
   preview.append(make('p','overline',r.summary_kind==='heading'?'TITOLO LITURGICO':'ANTEPRIMA'));
   preview.append(make('p','reading-summary',r.summary));
   a.append(preview);
  }
  const details=make('details','reading-details');details.dataset.key=data.date+'|'+r.kind+'|'+r.reference;details.open=openReadings.has(details.dataset.key);
  const toggle=make('summary','reader-toggle','Leggi il testo');details.append(toggle);
  const panel=make('div','reader-content');
  // CEI 2008 is fetched from BibleGet only when opened; ignore old Martini data.
  const status=make('p','reader-edition','Il testo CEI 2008 viene caricato online su richiesta.');
  status.setAttribute('role','status');panel.append(status);
  // Introductory liturgical heading, visually separate from the exact CEI verses.
  const introduction=make('p','reading-introduction');introduction.hidden=true;panel.append(introduction);
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
    const parsed=globalThis.DueBibleGet.parseReference(r.reference);
    const book=parsed.book;
    const heading=globalThis.DueReadingIntro?.forBook(book)||'';
    introduction.textContent=heading;
    introduction.hidden=!heading;
    const p=make('div','body-reading');
    let currentChapter=null;
    for(const v of verses){
     if(v.chapter!==currentChapter){
      currentChapter=v.chapter;
      if(verses[0].chapter!==verses[verses.length-1].chapter){
       p.append(make('p','reader-edition','Capitolo '+currentChapter));
      }
     }
     const partial=parsed.partialVerses.some(x=>x.chapter===v.chapter&&x.verse===v.verse);
     const n=make('sup','',String(v.verse)+(partial?'*':''));
     p.append(n,document.createTextNode(' '+v.text+' '));
    }
    passage.replaceChildren(p);
    status.textContent=parsed.partialVerses.length?'Bibbia CEI 2008 · I versetti segnati con * sono riportati per intero: la liturgia ne usa solo una parte. Per il testo liturgico esatto consulta il collegamento CEI.':'Bibbia CEI 2008 · tutti e soli i versetti richiesti, verificati con BibleGet I/O';
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
 const c=data.comment; $('comment-ref').textContent='Vangelo: '+c.reference; $('comment-text').textContent=''; const epHref=safeLink(c.url,'ep'); const authorized=c.status==='matched'&&c.source==='Famiglia Cristiana'&&epHref&&typeof c.text==='string'&&c.text.trim();setMeditation(c.status==='matched'&&epHref?epHref:null,authorized?c.text:null);$('ep-link').hidden=c.status!=='matched'||!epHref;$('ep-link').removeAttribute('href');
 const editor=c.source==='Famiglia Cristiana'?'Famiglia Cristiana (Gruppo Editoriale San Paolo)':'Cerco il Tuo volto';
 $('ep-reader-note').textContent='Testo integrale del commento di don Luigi Maria Epicoco. Fonte: Famiglia Cristiana. Il testo è riprodotto sulla base dell’autorizzazione comunicata al gestore di Due Testamenti.';
 $('ep-rights').textContent='© Don Luigi Maria Epicoco / '+editor+'. Diritti riservati ai rispettivi titolari. '+(authorized?'Commento integrale riprodotto in Due Testamenti su autorizzazione dichiarata dal gestore.':'Testo non disponibile nell’app per questa data: consulta la fonte originale.');
 $('ep-rights').hidden=c.status!=='matched'||!epHref;
 $('ep-link').textContent=c.source==='Famiglia Cristiana'?'Apri il commento su Famiglia Cristiana ↗':'Apri il commento sul sito originale ↗';
 if(c.status==='matched'&&epHref){$('ep-link').href=epHref;$('comment-status').textContent=authorized?'Meditazione integrale disponibile qui nell’app. Fonte: '+c.source+'.':'Il commento originale è disponibile dal collegamento alla fonte: '+c.source+'.';}
 else {$('comment-text').textContent='';$('comment-status').textContent=c.message||'Collegamento non verificabile: non mostrato.';}
 void renderPodcast(data);
 $('updated').textContent='Data delle letture: '+printDate(data.date)+(data.updated_at?' · Ultimo aggiornamento: '+new Date(data.updated_at).toLocaleString('it-IT',{timeZone:'Europe/Rome'}):'');
 $('content').hidden=false; $('status').hidden=!(offline||data.stale); $('status').textContent='Copia disponibile per questa stessa data. La verifica o la connessione online non è al momento disponibile.';
}
async function load(d){if(!/^\d{4}-\d{2}-\d{2}$/.test(d))return;const id=++requestId;resetPodcast();loadingDay=d;if(d!==selected)setMeditation(null);selected=d;onToday=d===romeDay();globalThis.DueLiturgicalTheme.apply(d);$('date').textContent=printDate(d);$('choose').value=d;$('cei').href='https://www.chiesacattolica.it/liturgia-del-giorno/?data-liturgia='+d.replaceAll('-','');$('status').hidden=false;$('status').textContent='Caricamento delle letture e della meditazione…';$('content').hidden=true;$('title').textContent='La Parola del giorno';
 try{const res=await fetch('./data/'+d+'.json',{cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:typeof AbortSignal.timeout==='function'?AbortSignal.timeout(15000):undefined});if(!res.ok)throw Error('Fonti non disponibili');const data=await res.json();if(data.date!==d)throw Error('Data diversa');if(offlineOpt)store.set('due-testamenti:day:'+d,JSON.stringify(data));if(id===requestId)render(data);}
 catch(e){if(id!==requestId)return;let cached=null;try{if(offlineOpt)cached=JSON.parse(store.get('due-testamenti:day:'+d));}catch{}if(cached&&cached.date===d)render(cached,true);else $('status').textContent='Scheda non ancora disponibile per questa data. Puoi leggere i testi ufficiali CEI dal collegamento qui sotto. Gli aggiornamenti automatici vengono eseguiti più volte al giorno. Non mostriamo letture di un giorno diverso.';}
 finally{if(id===requestId)loadingDay=null;}}
$('choose').onchange=e=>{if(e.target.value)load(e.target.value);};$('prev').onclick=()=>load(add(selected,-1));$('next').onclick=()=>load(add(selected,1));$('today').onclick=()=>load(romeDay());$('retry').onclick=()=>load(selected);
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(reg=>reg.update()).catch(()=>{});
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
document.addEventListener('visibilitychange',()=>{if(!document.hidden){if(onToday)openToday();else globalThis.DueLiturgicalTheme.apply(selected);}});
window.addEventListener('pageshow',e=>{if(e.persisted){if(onToday)openToday();else globalThis.DueLiturgicalTheme.apply(selected);}});
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
