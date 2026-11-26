/* BibleGet CEI 2008: verses fetched only when explicitly opened, no persistent storage. */
(function(root){
 'use strict';
 const ENDPOINT='https://query.bibleget.io/v3/';
 const VERSION='CEI2008', APPID='DueTestamentiWeb', MAX_VERSES=50;
 const BOOKS=new Map('Gen Es Lv Nm Dt Gs Gdc Rt 1Sam 2Sam 1Re 2Re 1Cr 2Cr Esd Ne Tb Gdt Est 1Mac 2Mac Gb Sal Pr Qo Ct Sap Sir Is Ger Lam Bar Ez Dn Os Gl Am Abd Gna Mi Na Ab Sof Ag Zc Ml Mt Mc Lc Gv At Rm 1Cor 2Cor Gal Ef Fil Col 1Ts 2Ts 1Tm 2Tm Tt Fm Eb Gc 1Pt 2Pt 1Gv 2Gv 3Gv Gd Ap'.split(' ').map((name,i)=>[name,i+1]));
 const ALIASES=new Map([['Gn','Gen'],['Ge','Gen'],['Gio','Gna']]);
 const cache=new Map(),pending=new Map();
 class Unavailable extends Error{constructor(message){super(message);this.name='BibleGetUnavailable';}}
 function parseReference(reference){
  if(typeof reference!=='string')throw new Unavailable('Riferimento non valido.');
  const input=reference.trim().replace(/[–—−]/g,'-').replace(/\s+/g,' ');
  const match=/^([1-3]?\s*[A-Za-z]{1,5})\s+(.+)$/.exec(input);
  if(!match)throw new Unavailable('Riferimento liturgico non riconosciuto: consulta il sito CEI.');
  const givenBook=match[1].replace(/\s/g,''),book=ALIASES.get(givenBook)||givenBook,booknum=BOOKS.get(book);
  if(!booknum)throw new Unavailable('Libro biblico non riconosciuto: consulta il sito CEI.');
  const parts=match[2].split(';'),expected=[],queryParts=[];
  let expandedPartial=false,previousChapter=0,previousVerse=0,hasSpan=false;
  if(parts.length>8)throw new Unavailable('Riferimento troppo complesso: consulta il sito CEI.');
  for(let pi=0;pi<parts.length;pi++){
   const part=/^(\d{1,3}),\s*(.+)$/.exec(parts[pi].trim());
   if(!part)throw new Unavailable('Riferimento con capitoli non riconosciuto: consulta il sito CEI.');
   const chapter=Number(part[1]);
   if(chapter<1||chapter>150||chapter<previousChapter)throw new Unavailable('Ordine dei capitoli non valido.');
   const segments=part[2].split('.');
   if(!segments.length||segments.length>20)throw new Unavailable('Intervallo di versetti non riconosciuto.');
   const normalized=[];
   for(let si=0;si<segments.length;si++){
    const token=segments[si].trim();
    // A cross-chapter range like Ap 20,11-21,2. Only permit it as
    // the final segment to retain an unambiguous exact response check.
    const cross=/^(\d{1,3})-(\d{1,3}),(\d{1,3})$/.exec(token);
    if(cross){
     const first=Number(cross[1]),lastChapter=Number(cross[2]),lastVerse=Number(cross[3]);
     if(hasSpan||pi!==parts.length-1||si!==segments.length-1||first<1||first>200||lastChapter!==chapter+1||lastVerse<1||lastVerse>50){
      throw new Unavailable('Intervallo tra capitoli non verificabile: consulta il sito CEI.');
     }
     if(chapter<previousChapter||(chapter===previousChapter&&first<=previousVerse))throw new Unavailable('Versetti ripetuti o fuori ordine.');
     expected.push({kind:'span',chapter,verse:first,endChapter:lastChapter,endVerse:lastVerse});
     normalized.push(first+'-'+lastChapter+','+lastVerse);
     hasSpan=true;previousChapter=lastChapter;previousVerse=lastVerse;
     continue;
    }
    const m=/^(\d{1,3})([a-d]?)(?:-(\d{1,3})([a-d]?))?$/.exec(token);
    if(!m)throw new Unavailable('Riferimento con versetti parziali o intervalli non riconosciuti: consulta il sito CEI.');
    const first=Number(m[1]),last=Number(m[3]||m[1]);
    if(first<1||last>200||last<first)throw new Unavailable('Intervallo di versetti non valido.');
    if(chapter<previousChapter||(chapter===previousChapter&&first<=previousVerse))throw new Unavailable('Versetti ripetuti o fuori ordine.');
    expandedPartial=expandedPartial||Boolean(m[2]||m[4]);
    normalized.push(String(first)+(m[3]?'-'+last:''));
    for(let verse=first;verse<=last;verse++)expected.push({kind:'verse',chapter,verse});
    previousChapter=chapter;previousVerse=last;
    if(expected.length>MAX_VERSES)throw new Unavailable('Questo brano supera il limite di 50 versetti di BibleGet. Usa il collegamento CEI.');
   }
   queryParts.push((pi===0?book:'')+chapter+','+normalized.join('.'));
  }
  if(!expected.length)throw new Unavailable('Nessun versetto selezionato.');
  return {book,booknum,chapter:expected[0].chapter,verses:expected.map(x=>x.verse),expected,expandedPartial,query:queryParts.join(';')};
 }
 function validateResponse(data,ref){
  const rows=data&&data.results;
  if(!Array.isArray(rows)||!rows.length||rows.length>MAX_VERSES)throw new Unavailable('BibleGet non ha restituito un numero valido di versetti.');
  const verified=rows.map(row=>{
   if(!row||String(row.version).toUpperCase()!==VERSION||Number(row.univbooknum)!==ref.booknum||Number(row.testament)!==(ref.booknum<=46?1:2)||!Number.isInteger(Number(row.chapter))||!Number.isInteger(Number(row.verse))||typeof row.text!=='string'||!row.text.trim()){
    throw new Unavailable('Il brano ricevuto non corrisponde al libro e alla traduzione richiesti.');
   }
   return {chapter:Number(row.chapter),verse:Number(row.verse),text:row.text.trim()};
  });
  let at=0;
  for(const item of ref.expected){
   if(item.kind==='verse'){
    const found=verified[at++];
    if(!found||found.chapter!==item.chapter||found.verse!==item.verse)throw new Unavailable('BibleGet non ha restituito tutti i versetti richiesti.');
   }else{
    // Spanning chapters: verify first/last positions and strictly consecutive
    // verse numbers, including a reset to 1 at the chapter boundary.
    const span=verified.slice(at);
    if(span.length<2||span[0].chapter!==item.chapter||span[0].verse!==item.verse||
      span[span.length-1].chapter!==item.endChapter||span[span.length-1].verse!==item.endVerse){
      throw new Unavailable('Intervallo tra capitoli incompleto.');
    }
    for(let i=1;i<span.length;i++){
     const a=span[i-1],b=span[i];
     if(!((b.chapter===a.chapter&&b.verse===a.verse+1)||
       (a.chapter===item.chapter&&b.chapter===item.endChapter&&b.verse===1))){
      throw new Unavailable('Versetti non consecutivi nel passaggio tra capitoli.');
     }
    }
    at=verified.length;
   }
  }
  if(at!==verified.length)throw new Unavailable('La risposta include versetti non richiesti.');
  return verified;
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
