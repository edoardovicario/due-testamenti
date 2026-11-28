/* Rank verified content from the exact Epicoco Spotify show and YouTube channel.
   Direct passage/scene matching always precedes thematic selection. */
(function(root){
 'use strict';
 const CHANNEL='UCK9NyEkJ-X89kXCwp1eXFjw',SHOW='3zi4rUpHdKFicPVbJ4pvXM';
 const yid=/^[A-Za-z0-9_-]{11}$/,sid=/^[A-Za-z0-9]{22}$/;
 const hash=s=>[...s].reduce((n,c)=>(33*n+c.charCodeAt(0))>>>0,5381);
 const themes=s=>root.DuePodcast?.foundTopics(s)||new Set();
 function available(spotify,youtube){
  const pool=[];
  if(spotify?.show_id===SHOW&&Array.isArray(spotify.episodes))
   for(const e of spotify.episodes)
    if(sid.test(e?.id||'')&&typeof e.title==='string'&&e.title.trim())pool.push({...e,platform:'spotify'});
  if(youtube?.channel_id===CHANNEL&&Array.isArray(youtube.videos))
   for(const v of youtube.videos)
    if(yid.test(v?.id||'')&&typeof v.title==='string'&&v.title.trim())pool.push({...v,platform:'youtube'});
  return pool;
 }
 function topicScore(day,ep){
  const readings=day.readings||[];
  const g=themes(readings.find(r=>r.kind==='vangelo')?.summary||'');
  const f=themes(readings.find(r=>r.kind==='prima lettura')?.summary||'');
  const comment=day.comment||{},body=comment.status==='matched'&&comment.source==='Famiglia Cristiana'?comment.text||'':'';
  const c=themes(body),title=themes(ep.title),desc=themes(ep.description||'');
  const curated=new Set(Array.isArray(ep.topics)?ep.topics:[]);
  let highest=0,second=0,tag=null,shared=false;
  for(const name of new Set([...curated,...title,...desc])){
   const inG=g.has(name),inF=f.has(name),inC=c.has(name),reading=inG||inF;
   let weight=(inG?3.5:0)+(inF?3.2:0)+(inC?3.7:0)+(reading&&inC?1.8:0);
   if(!weight)continue;
   weight+=title.has(name)?2.2:desc.has(name)?0.4:0;
   if(curated.has(name))weight+=1.1;
   if(weight>highest){second=highest;highest=weight;tag=name;shared=reading&&inC;}
   else if(weight>second)second=weight;
  }
  return {score:highest+second*0.18,theme:tag,shared};
 }
 function formatted(ep,reason,confidence){
  const youtube=ep.platform==='youtube';
  return {id:ep.id,platform:ep.platform,title:ep.title,reason,confidence,
   url:youtube?'https://www.youtube.com/watch?v='+ep.id:'https://open.spotify.com/episode/'+ep.id,
   show_url:youtube?'https://www.youtube.com/@luigimariaepicoco':'https://open.spotify.com/show/'+SHOW};
 }
 function recommend(day,spotify,youtube){
  if(typeof day?.date!=='string')return null;
  const pool=available(spotify,youtube);
  if(!pool.length)return null;
  const match=root.DuePodcastPassage?.matchDay;
  const direct=[match?.(day,pool.filter(e=>e.platform==='spotify')),
    match?.(day,pool.filter(e=>e.platform==='youtube'))].filter(Boolean)
    .sort((a,b)=>b.score-a.score||(a.ep.platform==='youtube'?-1:1));
  if(direct.length){
   const best=direct[0],side=best.reading.kind==='vangelo'?'Vangelo':'Prima Lettura';
   const reason=best.method==='citazione'?
     'Questo contenuto cita il passo della '+side+' di oggi ('+best.reading.reference+
       '): l’approfondimento diretto ha la priorità rispetto ai temi generali.':
     'Questo contenuto approfondisce l’episodio biblico '+best.scene+' della '+side+' di oggi ('+best.reading.reference+').';
   return formatted(best.ep,reason,'passo-diretto');
  }
  const ranked=pool.map(ep=>({ep,topic:topicScore(day,ep),tie:hash(day.date+':'+ep.platform+':'+ep.id)%997}))
   .sort((a,b)=>b.topic.score-a.topic.score||b.tie-a.tie);
  const best=ranked[0],e=best.topic;
  const reason=e.theme?
   (e.shared?'La meditazione e le letture di oggi':'Il Vangelo, la Prima Lettura o la meditazione di oggi')+
   ' richiamano il tema "'+e.theme+'". Questa proposta tratta un tema affine, non necessariamente il brano preciso.':
   'Un approfondimento generale dal canale di Epicoco, senza corrispondenza biblica specifica verificata.';
  return formatted(best.ep,reason,e.score>=3?'tematico':'generale');
 }
 root.DueMedia=Object.freeze({recommend,available,topicScore,CHANNEL});
})(globalThis);
