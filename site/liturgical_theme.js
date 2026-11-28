/* Roman liturgical seasons: date-selected background, no external requests.
   Colors follow Roman Missal 346. Does not replace local feast-day rubrics. */
(function(root){
 'use strict';
 const DAY=86400000;
 const utc=(y,m,d)=>Date.UTC(y,m-1,d);
 const normal=iso=>{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(iso))return null;
  const [y,m,d]=iso.split('-').map(Number),t=utc(y,m,d);
  return new Date(t).toISOString().slice(0,10)===iso?{y,t}:null;
 };
 function easter(y){
  const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4;
  const f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30;
  const i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7;
  const m=Math.floor((a+11*h+22*l)/451),v=h+l-7*m+114;
  return utc(y,Math.floor(v/31),v%31+1);
 }
 const adventStart=y=>{const t=utc(y,11,27);return t+((7-new Date(t).getUTCDay())%7)*DAY;};
 const baptism=y=>{const t=utc(y,1,6),w=new Date(t).getUTCDay();return t+(w===0?7:7-w)*DAY;};
 const SEASONS=Object.freeze({
  ordinary:['ordinary','verde','Tempo ordinario'],advent:['advent','viola','Tempo di Avvento'],
  christmas:['christmas','bianco','Tempo di Natale'],lent:['lent','viola','Tempo di Quaresima'],
  easter:['easter','bianco','Tempo di Pasqua'],gaudete:['gaudete','rosa','III domenica di Avvento · Gaudete'],
  laetare:['laetare','rosa','IV domenica di Quaresima · Laetare'],
  palms:['palms','rosso','Domenica delle Palme'],goodFriday:['good-friday','rosso','Venerdì Santo'],
  pentecost:['pentecost','rosso','Pentecoste']
 });
 function forDate(iso){
  const date=normal(iso);if(!date||date.y<1583||date.y>4099)return null;
  const {y,t}=date,e=easter(y),ad=adventStart(y),pen=e+49*DAY;
  let kind='ordinary';
  if(t===pen)kind='pentecost';
  else if(t>=e&&t<pen)kind='easter';
  else if(t===e-7*DAY)kind='palms';
  else if(t===e-2*DAY)kind='goodFriday';
  else if(t>=e-46*DAY&&t<e)kind=t===e-21*DAY?'laetare':'lent';
  else if(t>=ad&&t<utc(y,12,25))kind=t===ad+14*DAY?'gaudete':'advent';
  else if(t>=utc(y,12,25)||t<=baptism(y))kind='christmas';
  const [key,color,label]=SEASONS[kind];
  return {key,color,label};
 }
 const OFFICIAL_COLORS=new Set(['verde','viola','bianco','rosso','rosa','nero']);
 const palettes={verde:'#dce8d5',viola:'#dcd0eb',bianco:'#faf8ef',rosso:'#ebcaca',rosa:'#f3dce6',nero:'#d9d9d9'};
 let last=null;
 function apply(date,data){
  const base=forDate(date);if(!base)return null;
  if(data?.date===date)last={date,data};
  if(last?.date!==date)last=null;
  const card=data?.date===date?data:last?.data;
  const color=card?.liturgical_color;
  const official=OFFICIAL_COLORS.has(color);
  const season=official?{...base,color,label:typeof card.celebration==='string'&&card.celebration.trim()?card.celebration:base.label}:base;
  if(root.document?.body){
   root.document.body.dataset.liturgicalColor=season.color;
   if(root.document.documentElement){
    root.document.documentElement.dataset.liturgicalColor=season.color;
    root.document.documentElement.dataset.liturgicalSeason=season.key;
   }
   const meta=root.document.querySelector?.('meta[name="theme-color"]');
   if(meta)meta.setAttribute('content',palettes[season.color]);
   root.document.body.dataset.liturgicalSeason=season.key;
   const node=root.document.getElementById('liturgical-season');
   if(node)node.textContent=season.label+' · '+season.color+(official?'':' · colore del periodo');
  }
  return season;
 }
 root.DueLiturgicalTheme=Object.freeze({easter,adventStart,forDate,apply});
})(globalThis);
