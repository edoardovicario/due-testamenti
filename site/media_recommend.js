/* Rank Spotify and YouTube exclusively against verified Epicoco commentary. */
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
 function commentText(day){
  const c=day?.comment;
  return c?.status==='matched'&&c.source==='Famiglia Cristiana'&&typeof c.text==='string'?c.text.trim():'';
 }
 function topicScore(day,ep){
  const body=commentText(day),c=themes(body),title=themes(ep.title),desc=themes(ep.description||'');
  const curated=new Set(Array.isArray(ep.topics)?ep.topics:[]);
  let highest=0,second=0,tag=null;
  for(const name of new Set([...curated,...title,...desc])){
   if(!c.has(name))continue;
   const weight=3.7+(title.has(name)?2.2:desc.has(name)?0.4:0)+(curated.has(name)?1.1:0);
   if(weight>highest){second=highest;highest=weight;tag=name;}
   else if(weight>second)second=weight;
  }
  return {score:highest+second*0.18,theme:tag};
 }
 function formatted(ep,reason,confidence){
  const youtube=ep.platform==='youtube';
  return {id:ep.id,platform:ep.platform,title:ep.title,reason,confidence,
   url:youtube?'https://www.youtube.com/watch?v='+ep.id:'https://open.spotify.com/episode/'+ep.id,
   show_url:youtube?'https://www.youtube.com/@luigimariaepicoco':'https://open.spotify.com/show/'+SHOW};
 }
 function recommend(day,spotify,youtube){
  if(typeof day?.date!=='string'||!commentText(day))return null;
  const ranked=available(spotify,youtube).map(ep=>({ep,topic:topicScore(day,ep),tie:hash(day.date+':'+ep.platform+':'+ep.id)%997}))
   .sort((a,b)=>b.topic.score-a.topic.score||b.tie-a.tie);
  const best=ranked[0];if(!best?.topic.theme)return null;
  return formatted(best.ep,'La meditazione di don Luigi Maria Epicoco richiama il tema "'+best.topic.theme+'". Questa proposta tratta un tema affine.','tematico');
 }
 root.DueMedia=Object.freeze({recommend,available,topicScore,commentText,CHANNEL});
})(globalThis);
