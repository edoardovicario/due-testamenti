/* Topic-based podcast recommendation. No external API or account required.
   Recommendations use the Gospel preview and Epicoco's commentary as evidence,
   and verified editorial tags assigned to real Spotify episodes. */
(function(root){
 'use strict';
 const SHOW_ID='3zi4rUpHdKFicPVbJ4pvXM';
 const TOPICS={
  speranza:{label:'speranza e promessa',stems:['speranz','promess','liberazion','attesa','consolazion','salvezz','salvator','riscatt']},
  fiducia:{label:'fiducia nelle prove',stems:['fiduc','affid','temer','paur','spavent','coragg','insicur','incertezz','timor','angosci','protegg','nonabbandon']},
  rinascita:{label:'vita nuova e risurrezione',stems:['risurrez','risorg','vitaeterna','rinasci','rinnov','mondonuov','nuovagerusalemme','etern']},
  liberta:{label:'libertà e liberazione',stems:['liber','schiavit','catene','prigion','salvezz']},
  giustizia:{label:'giustizia e giudizio',stems:['giudiz','giudic','giustiz','ingiust','sentenz','condann','tribunal','vendett']},
  male:{label:'il male e la sua sconfitta',stems:['male','malvag','maligno','satana','diavol','tenebr','babiloni','peccat','distrugg']},
  preghiera:{label:'preghiera e vigilanza',stems:['pregh','preg','orazion','vegl','vigil','svegli','adoraz','silenz']},
  perdono:{label:'perdono e misericordia',stems:['perdon','misericord','peccat','riconcili','confess','conversion','ritorn']},
  amore:{label:'amore e dono',stems:['amor','carit','amare','compass','dono','donare','serviz','fratern','gratuit','prendersicura']},
  croce:{label:'croce e fedeltà',stems:['croc','croce','passion','martir','sacrific','calvar']},
  sofferenza:{label:'dolore e perseveranza',stems:['sofferen','dolor','fatica','persecuz','ferit','malatt','angosci','tradit']},
  famiglia:{label:'famiglia e legami',stems:['famigli','madre','padre','genitor','spos','matrimon','coniug','fratell','figli','casa']},
  comunita:{label:'Chiesa e comunione',stems:['chies','comunit','insiem','fratern','compagn']},
  discernimento:{label:'scelte e cammino',stems:['scelt','decid','decision','cammin','segui','discern','volonta','vocaz','chiam','guid','strad','riconosc','segni']},
  conversione:{label:'conversione del cuore',stems:['conversion','convert','cambiam','pentim','confess','rinnov','ritorn']},
  pace:{label:'ricerca della pace',stems:['pace','pacific','guerra','odio','riconcili','armoni']}
 };
 // Add only grounded links. Never synthesize arbitrary Spotify episode identifiers.
 const EPISODE_ID=/^[A-Za-z0-9]{22}$/;
 const norm=text=>(typeof text==='string'?text:'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ');
 function foundTopics(text){
  const words=norm(text).split(/\s+/).filter(Boolean);
  const detected=new Set();
  for(const [name,topic] of Object.entries(TOPICS)){
   if(topic.stems.some(s=>words.some(w=>w.startsWith(s))))detected.add(name);
  }
  return detected;
 }
 function safeEpisode(item){
  return item&&typeof item.id==='string'&&EPISODE_ID.test(item.id)&&typeof item.title==='string'&&item.title.length>3&&item.title.length<220&&(!Array.isArray(item.topics)||item.topics.every(x=>typeof x==='string'));
 }
 function recommend(day,catalog){
  if(!day||typeof day.date!=='string'||!catalog||catalog.show_id!==SHOW_ID||!Array.isArray(catalog.episodes))return null;
  const gospel=(day.readings||[]).find(x=>x.kind==='vangelo');
  const gospelText=gospel&&typeof gospel.summary==='string'?gospel.summary:'';
  const comment=day.comment||{},hasComment=comment.status==='matched'&&comment.source==='Famiglia Cristiana'&&typeof comment.text==='string'&&comment.text.trim().length>0;
  const firstReading=(day.readings||[]).find(x=>x.kind==='prima lettura');
  const first=foundTopics(gospelText),second=foundTopics(hasComment?comment.text:'');
  const third=foundTopics(firstReading?.summary||'');
  const evidence={};
  for(const name of Object.keys(TOPICS)){
   const a=first.has(name),b=second.has(name);
   evidence[name]=(a?2.8:0)+(b?4.2:0)+(third.has(name)?2.4:0)+((a||third.has(name))&&b?1.6:0);
  }
  // Favor the closest conceptual overlap, then vary equally good options by day.
  const hash=s=>[...s].reduce((n,ch)=>(n*33+ch.charCodeAt(0))>>>0,5381);
  const pool=catalog.episodes.filter(safeEpisode);
  if(!pool.length)return null;
  const direct=globalThis.DuePodcastPassage?.matchDay(day,pool);
  if(direct){
   const reading=direct.reading,side=reading.kind==='vangelo'?'Vangelo':'Prima Lettura';
   const explanation=direct.method==='citazione'?
     'Questa puntata cita specificamente il passo della '+side+' di oggi ('+reading.reference+'). È quindi preferita a una puntata che ne condivide soltanto il tema.':
     'Questa puntata approfondisce l’episodio biblico '+direct.scene+' presente nella '+side+' di oggi ('+reading.reference+').';
   return {id:direct.ep.id,title:direct.ep.title,description:direct.ep.description||'',
    url:'https://open.spotify.com/episode/'+direct.ep.id,reason:explanation,
    topics:direct.ep.topics||[],theme:direct.method==='scena'?direct.scene:'passo biblico del giorno',
    confidence:'passo-diretto',show_url:catalog.show_url};
  }
  let best=null;
  for(const ep of pool){
   const tags=[...new Set([...(Array.isArray(ep.topics)?ep.topics:[]),...foundTopics(ep.title+' '+(ep.description||''))])].filter(x=>x in TOPICS);
   const strongest=tags.map(k=>({key:k,weight:evidence[k]||0})).sort((a,b)=>b.weight-a.weight);
   const titleTopics=foundTopics(ep.title);
   const titleBonus=strongest.slice(0,2).reduce((sum,t)=>sum+(t.weight>0&&titleTopics.has(t.key)?1.8:0),0);
   const score=(strongest[0]?.weight||0)+0.33*(strongest[1]?.weight||0)+strongest.slice(2).reduce((sum,x)=>sum+0.06*x.weight,0)+titleBonus;
   const tie=(hash(day.date+':'+ep.id)%997)/997;
   if(!best||score>best.score||(score===best.score&&tie>best.tie))best={ep,score,tie,strongest};
  }
  const main=best.strongest.find(t=>t.weight>0);
  const both=Boolean(main&&(first.has(main.key)||third.has(main.key))&&second.has(main.key));
  const reason=main
   ?(both?'Il Vangelo e la meditazione di oggi richiamano ':'La Prima Lettura, il Vangelo o la meditazione di oggi richiamano ')+TOPICS[main.key].label+'. La puntata approfondisce un tema affine senza trattare necessariamente il passo biblico.'
   :'Un possibile spunto di ascolto per proseguire la riflessione dopo il Vangelo.';
  return {id:best.ep.id,title:best.ep.title,description:best.ep.description||'',url:'https://open.spotify.com/episode/'+best.ep.id,reason,topics:best.ep.topics,theme:main?TOPICS[main.key].label:null,confidence:best.score>=2.2?'tematico':'generale',show_url:catalog.show_url};
 }
 root.DuePodcast={recommend,foundTopics,safeEpisode,SHOW_ID};
})(globalThis);
