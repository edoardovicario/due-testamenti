/* BibleGet CEI 2008: on-demand, in-memory only, never persisted. */
(function(root){
 'use strict';
 const ENDPOINT='https://query.bibleget.io/v3/quote';
 const VERSION='CEI2008', APPID='DueTestamentiWeb', MAX_VERSES=50;
 const BOOKS=new Set('Gen Es Lv Nm Dt Gs Gdc Rt 1Sam 2Sam 1Re 2Re 1Cr 2Cr Esd Ne Tb Gdt Est 1Mac 2Mac Gb Sal Pr Qo Ct Sap Sir Is Ger Lam Bar Ez Dn Os Gl Am Abd Gio Mi Na Ab Sof Ag Zc Ml Mt Mc Lc Gv At Rm 1Cor 2Cor Gal Ef Fil Col 1Ts 2Ts 1Tm 2Tm Tt Fm Eb Gc 1Pt 2Pt 1Gv 2Gv 3Gv Gd Ap'.split(' '));
 const cache=new Map(),pending=new Map();
 class Unavailable extends Error{constructor(message){super(message);this.name='BibleGetUnavailable';}}
 function parseReference(reference){
  if(typeof reference!=='string')throw new Unavailable('Riferimento non valido.');
  const input=reference.trim().replace(/[–—−]/g,'-').replace(/\s+/g,' ');
  const m=/^([1-3]?\s*[A-Za-z]{1,5})\s+(\d{1,3}),\s*(\d{1,3}(?:-\d{1,3})?(?:\.\d{1,3}(?:-\d{1,3})?)*)$/.exec(input);
  if(!m)throw new Unavailable('Riferimento liturgico complesso: consulta la versione CEI ufficiale.');
  const book=m[1].replace(/\s/g,''),chapter=Number(m[2]);
  if(!BOOKS.has(book)||chapter<1||chapter>150)throw new Unavailable('Riferimento non riconosciuto: consulta la versione CEI ufficiale.');
  const ids=[];
  for(const segment of m[3].split('.')){
   const p=/^(\d{1,3})(?:-(\d{1,3}))?$/.exec(segment);
   if(!p)throw new Unavailable('Intervallo di versetti non riconosciuto.');
   const first=Number(p[1]),last=Number(p[2]||p[1]);
   if(first<1||last>200||first>last)throw new Unavailable('Intervallo di versetti non valido.');
   for(let v=first;v<=last;v++)ids.push(v);
   if(ids.length>MAX_VERSES)throw new Unavailable('Questo brano supera il limite di 50 versetti di BibleGet. Usa il collegamento ufficiale CEI.');
  }
  if(!ids.length||ids.some((v,i)=>i>0&&v<=ids[i-1]))throw new Unavailable('Versetti ripetuti o fuori ordine: usa il collegamento CEI.');
  return {book,chapter,verses:ids,query:book+chapter+','+m[3]};
 }
 function validateResponse(data,ref){
  const rows=data&&data.results;
  if(!Array.isArray(rows)||rows.length!==ref.verses.length)throw new Unavailable('BibleGet non ha restituito tutti i versetti richiesti.');
  const booknums=new Set();
  const verses=rows.map((row,i)=>{
   if(!row||String(row.version).toUpperCase()!==VERSION||Number(row.chapter)!==ref.chapter||Number(row.verse)!==ref.verses[i]||!Number.isInteger(Number(row.verse))||typeof row.text!=='string'||!row.text.trim()){
    throw new Unavailable('Il brano ricevuto non corrisponde al riferimento selezionato.');
   }
   if(row.booknum!==undefined&&row.booknum!==null)booknums.add(String(row.booknum));
   return {verse:ref.verses[i],text:row.text.trim()};
  });
  if(booknums.size>1)throw new Unavailable('La risposta include libri diversi.');
  return verses;
 }
 async function queryApi(reference,fetcher){
  const parsed=parseReference(reference);
  const qs=new URLSearchParams({query:parsed.query,version:VERSION,return:'json',appid:APPID,pluginversion:'1.0'});
  const signal=typeof AbortSignal!=='undefined'&&typeof AbortSignal.timeout==='function'?AbortSignal.timeout(15000):undefined;
  const response=await fetcher(ENDPOINT+'?'+qs,{method:'GET',mode:'cors',credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',headers:{Accept:'application/json'},signal});
  if(!response.ok)throw new Unavailable('BibleGet non è disponibile al momento.');
  if(response.url&&new URL(response.url).origin!=='https://query.bibleget.io')throw new Unavailable('Risposta da un servizio inatteso.');
  return validateResponse(await response.json(),parsed);
 }
 function get(reference){
  const parsed=parseReference(reference),key=parsed.query;
  if(cache.has(key))return Promise.resolve(cache.get(key));
  if(pending.has(key))return pending.get(key);
  const promise=queryApi(reference,fetch).then(verses=>{cache.set(key,verses);return verses;})
   .catch(err=>{if(err instanceof Unavailable)throw err;throw new Unavailable('Connessione non disponibile. Riprova oppure usa il sito CEI.');})
   .finally(()=>pending.delete(key));
  pending.set(key,promise);return promise;
 }
 root.DueBibleGet={get,parseReference,validateResponse,queryApi,MAX_VERSES};
})(globalThis);
