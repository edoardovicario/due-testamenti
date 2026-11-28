/* Conservative Bible passage matcher for the original Epicoco podcast metadata.
   Direct matching requires a specific book/chapter/verse or named biblical scene,
   NOT a general subject such as hope, Jesus, prayer or a Bible book alone. */
(function(root){
 'use strict';
 const aliases={
  gen:'Gen',gn:'Gen',genesi:'Gen',es:'Es',esodo:'Es',lv:'Lv',levitico:'Lv',
  nm:'Nm',numeri:'Nm',dt:'Dt',deuteronomio:'Dt',gs:'Gs',giosue:'Gs',
  gdc:'Gdc',giudici:'Gdc',rt:'Rt',rut:'Rt',gb:'Gb',giobbe:'Gb',
  is:'Is',isaia:'Is',ger:'Ger',geremia:'Ger',lam:'Lam',lamentazioni:'Lam',
  ez:'Ez',ezechiele:'Ez',dn:'Dn',daniele:'Dn',zc:'Zc',zaccaria:'Zc',
  sal:'Sal',salmi:'Sal',salmo:'Sal',pr:'Pr',proverbi:'Pr',
  sap:'Sap',sapienza:'Sap',sir:'Sir',siracide:'Sir',qo:'Qo',qoelet:'Qo',
  mt:'Mt',matteo:'Mt',mc:'Mc',marco:'Mc',lc:'Lc',luca:'Lc',
  gv:'Gv',giovanni:'Gv',at:'At',atti:'At',ap:'Ap',apocalisse:'Ap',
  rm:'Rm',romani:'Rm',gal:'Gal',galati:'Gal',ef:'Ef',efesini:'Ef',
  fil:'Fil',filippesi:'Fil',col:'Col',colossesi:'Col',
  '1cor':'1Cor','1corinzi':'1Cor','2cor':'2Cor','2corinzi':'2Cor',
  '1ts':'1Ts','2ts':'2Ts','1tm':'1Tm','2tm':'2Tm',
  '1pt':'1Pt','2pt':'2Pt','1gv':'1Gv','2gv':'2Gv','3gv':'3Gv',
  '1sam':'1Sam','2sam':'2Sam','1re':'1Re','2re':'2Re',
  '1cr':'1Cr','2cr':'2Cr','1mac':'1Mac','2mac':'2Mac',
  '1tessalonicesi':'1Ts','2tessalonicesi':'2Ts',
  '1timoteo':'1Tm','2timoteo':'2Tm',
  est:'Est',ester:'Est',gdt:'Gdt',giuditta:'Gdt',tb:'Tb',tobia:'Tb',
  ne:'Ne',neemia:'Ne',esd:'Esd',esdra:'Esd',
  gna:'Gna',giona:'Gna',mi:'Mi',michea:'Mi',
  os:'Os',osea:'Os',gl:'Gl',gioele:'Gl',am:'Am',amos:'Am',
  na:'Na',naum:'Na',ab:'Ab',abacuc:'Ab',
  sof:'Sof',sofonia:'Sof',ag:'Ag',aggeo:'Ag',ml:'Ml',malachia:'Ml',
  abd:'Abd',abdia:'Abd',ct:'Ct',cantico:'Ct',bar:'Bar',baruc:'Bar',
  eb:'Eb',ebrei:'Eb',gc:'Gc',giacomo:'Gc',gd:'Gd',giuda:'Gd',
  tt:'Tt',tito:'Tt',fm:'Fm',filemone:'Fm'
 };
 const canonical=s=>aliases[String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s/g,'')]||null;
 const normalized=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const verifiedChapterEnds={'Ap:20':15};
 function verseKeys(ref){
  const m=/^\s*([1-3]?\s*[A-Za-z]{1,7})\s+(\d{1,3})\s*[,:\.]\s*(.+)$/.exec(normalized(ref).replace(/[–—−]/g,'-'));
  if(!m)return new Set();
  const book=canonical(m[1]);if(!book)return new Set();
  let ch=Number(m[2]),count=0;
  const set=new Set();
  for(const [index,part] of m[3].split(';').entries()){
   const rest=part.trim(),next=index?/^(\d{1,3})\s*[,:\.]\s*(.+)$/.exec(rest):null;
   const body=next?(ch=Number(next[1]),next[2]):rest;
   for(const chunk of body.split('.')){
    const token=chunk.trim();
    const cross=/^(\d{1,3})-(\d{1,3}),(\d{1,3})$/.exec(token);
    if(cross){
     const boundary=verifiedChapterEnds[book+':'+ch],other=Number(cross[2]),to=Number(cross[3]);
     if(boundary&&other===ch+1&&Number(cross[1])<=boundary){
      for(let v=Number(cross[1]);v<=boundary;v++)set.add(book+':'+ch+':'+v);
      for(let v=1;v<=to&&v<=100;v++)set.add(book+':'+other+':'+v);
     }
     continue;
    }
    const v=/^(\d{1,3})[a-d]?(?:-(\d{1,3})[a-d]?)?$/.exec(token);
    if(!v)continue;
    const a=Number(v[1]),b=Number(v[2]||v[1]);
    if(a<1||b<a||b-a>100||b>200)continue;
    for(let i=a;i<=b;i++)set.add(book+':'+ch+':'+i);
    count+=b-a+1;if(count>250)return new Set();
   }
  }
  return set;
 }
 // Only episode references with book, chapter AND specific verses count as direct.
 const refs=/\b(1\s*corinzi|2\s*corinzi|1\s*cor|2\s*cor|1\s*gv|2\s*gv|3\s*gv|1\s*pt|2\s*pt|1\s*ts|2\s*ts|1\s*tm|2\s*tm|galati|gal|romani|rm|apocalisse|ap|atti|at|matteo|mt|marco|mc|luca|lc|giovanni|gv|genesi|gen|gn|isaia|is|zaccaria|zc|ezechiele|ez|salmi|salmo|sal|filippesi|fil|colossesi|col|efesini|ef|geremia|ger|sapienza|sap)\s*(\d{1,3})\s*[,:\.]\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?/gi;
 function citations(s){
  const result=[],regex=new RegExp(refs.source,'gi');
  let m;
  while((m=regex.exec(normalized(s)))!==null&&result.length<40){
   const book=canonical(m[1]),a=Number(m[3]),b=Number(m[4]||m[3]),ch=Number(m[2]);
   if(!book||a<1||b<a||b-a>100||b>200)continue;
   const verseIds=new Set();
   for(let v=a;v<=b;v++)verseIds.add(book+':'+ch+':'+v);
   result.push(verseIds);
  }
  return result;
 }
 const scenes=[
  ['Trasfigurazione',['trasfiguraz'],['Mt 17,1-13','Mc 9,2-13','Lc 9,28-36']],
  ['Samaritana',['samaritan'],['Gv 4,5-42']],
  ['Beatitudini',['beatitudin'],['Mt 5,1-12','Lc 6,20-26']],
  ['Visitazione',['visitazion'],['Lc 1,39-56']],
  ['Annunciazione',['annunciazion'],['Lc 1,26-38']],
  ['Pentecoste',['pentecost'],['At 2,1-13']],
  ['Nozze di Cana',['nozze di cana'],['Gv 2,1-12']],
  ['Zaccheo',['zaccheo'],['Lc 19,1-10']],
  ['Bartimeo',['bartimeo'],['Mc 10,46-52']],
  ['Risurrezione di Lazzaro',['lazzaro'],['Gv 11,1-44']],
  ['Moltiplicazione dei pani',['moltiplicazione dei pani'],['Mt 14,13-21','Mc 6,30-44','Lc 9,10-17','Gv 6,1-15']],
  ['Il Padre nostro',['padre nostro'],['Mt 6,9-13','Lc 11,1-4']],
  ['Le due monetine della vedova',['due monetin','due spicciol'],['Mc 12,41-44','Lc 21,1-4']]
 ].map(([label,triggers,readings])=>({label,triggers,verses:new Set(readings.flatMap(x=>[...verseKeys(x)]))}));
 const overlaps=(x,y)=>{let n=0;for(const v of x)if(y.has(v))n++;return n;};
 function matchDay(day,episodes){
  const readings=(day?.readings||[]).filter(r=>r&&(r.kind==='vangelo'||r.kind==='prima lettura'))
   .map(r=>({reading:r,verses:verseKeys(r.reference)})).filter(r=>r.verses.size);
  let best=null;
  for(const ep of episodes){
   if(!ep||typeof ep.title!=='string'||!/^[A-Za-z0-9]{22}$/.test(ep.id||''))continue;
   const title=normalized(ep.title),description=normalized(ep.description);
   const titleRefs=citations(title),descriptionRefs=citations(description);
   for(const {reading,verses} of readings){
    for(const [where,list] of [['titolo',titleRefs],['descrizione',descriptionRefs]]){
     for(const c of list){
      const overlap=overlaps(verses,c);if(!overlap)continue;
      const score=500+(where==='titolo'?75:25)+Math.min(overlap,15)*3;
      if(!best||score>best.score)best={ep,reading,method:'citazione',where,score};
     }
    }
    for(const scene of scenes){
     const inTitle=scene.triggers.some(x=>title.includes(x)),inDesc=scene.triggers.some(x=>description.includes(x));
     if(!(inTitle||inDesc)||!overlaps(verses,scene.verses))continue;
     const score=400+(inTitle?35:0);
     if(!best||score>best.score)best={ep,reading,method:'scena',scene:scene.label,score};
    }
   }
  }
  return best;
 }
 root.DuePodcastPassage={matchDay,verseKeys,citations};
})(globalThis);
