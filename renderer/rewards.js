/* Learning rewards: credit distinct successful work, preserve historical ownership. */
(function(root){
  const tiers=[0,100,300,700,1500,3000,6000,10000,16000,25000,40000,65000];
  const names={tr:['Çaylak','Kaşif','Sorgucu','Usta','Efsane','Veri Mimarı','İlişki Uzmanı','Analiz Ustası','SQL Bilgesi','Veri Rehberi','Büyük Usta','SQL Öncüsü'],en:['Newbie','Explorer','Quester','Master','Legend','Data Architect','Relationship Expert','Analytics Master','SQL Sage','Data Guide','Grandmaster','SQL Pioneer']};
  const advancedTitles=[['Şema Ustası','Schema Master'],['Sorgu Tasarımcısı','Query Designer'],['İlişki Mimarı','Relationship Architect'],['Veri Araştırmacısı','Data Researcher'],['Rapor Ustası','Report Master'],['CTE Uzmanı','CTE Expert'],['Pencere Uzmanı','Window Expert'],['Plan Analisti','Plan Analyst'],['Veri Koruyucusu','Data Guardian'],['SQL Mentoru','SQL Mentor'],['Analiz Mimarı','Analytics Architect'],['Şema Bilgesi','Schema Sage'],['Veri Stratejisti','Data Strategist'],['Sorgu Sanatçısı','Query Artist'],['Veri Ustası','Data Master'],['SQL Rehberi','SQL Guide'],['İlişki Bilgesi','Relationship Sage'],['Sorgu Bilgesi','Query Sage'],['Analiz Öncüsü','Analytics Pioneer'],['SQL Elçisi','SQL Ambassador'],['Veri Eğitmeni','Data Educator'],['SQL Araştırmacısı','SQL Researcher'],['Sorgu Kaptanı','Query Captain'],['Veri Kaptanı','Data Captain'],['SQL Profesörü','SQL Professor'],['Sorgu Virtüözü','Query Virtuoso'],['Veri Virtüözü','Data Virtuoso'],['SQL Büyük Ustası','SQL Grandmaster']];
  for(let i=0;i<advancedTitles.length;i++){tiers.push(100000+i*50000);names.tr.push(advancedTitles[i][0]);names.en.push(advancedTitles[i][1]);}
  function fingerprint(serialized){let h1=2166136261,h2=5381;for(let i=0;i<serialized.length;i++){h1=Math.imul(h1^serialized.charCodeAt(i),16777619);h2=Math.imul(h2,33)^serialized.charCodeAt(i);}return (h1>>>0).toString(36)+':'+(h2>>>0).toString(36);}
  function credit(stats,tokens,day){
    const list=tokens.flat(),words=list.filter(t=>!t.quoted).map(t=>t.value);
    const key=fingerprint(JSON.stringify(list.map(t=>[t.quoted,t.value])));
    const meaningful=words.some(w=>['FROM','INSERT','UPDATE','DELETE','CREATE','ALTER'].includes(w));
    const book=stats.practice||(stats.practice={day,seen:[],skills:{},days:[],unique:0});
    if(book.day!==day){book.day=day;book.seen=[];}
    if(!meaningful || book.seen.includes(key) || book.seen.length>=40)return 0;
    book.seen.push(key);book.unique++;if(!book.days.includes(day))book.days.push(day);
    book.dayCounts ||= {};book.dayCounts[day]=book.seen.length;
    const oldDays=Object.keys(book.dayCounts).sort();while(oldDays.length>400)delete book.dayCounts[oldDays.shift()];
    const features={join:words.includes('JOIN'),aggregate:words.some(w=>['COUNT','SUM','AVG','GROUP'].includes(w)),window:words.includes('OVER'),cte:words.includes('WITH'),recursive:words.includes('RECURSIVE'),schema:words.some(w=>['CREATE','ALTER'].includes(w)),write:words.some(w=>['INSERT','UPDATE','DELETE'].includes(w)),nulls:words.includes('NULL'),subquery:words.filter(w=>w==='SELECT').length>1};
    for(const [name,present] of Object.entries(features))if(present)book.skills[name]=(book.skills[name]||0)+1;
    return Math.min(15,5+Object.values(features).filter(Boolean).length*2);
  }
  const skills=[['join','İlişki Gezgini','Join Explorer'],['aggregate','Özet Ustası','Aggregate Master'],['window','Pencere Ustası','Window Master'],['cte','Katmanlı Düşün','CTE Builder'],['recursive','Zincirin İzinde','Chain Explorer'],['schema','Veri Mimarı','Schema Architect'],['write','Veri Bahçıvanı','Data Gardener'],['nulls','Boşluğu Anla','NULL Explorer'],['subquery','İç İçe Sorgu','Subquery Explorer']];
  const badges=skills.flatMap(([skill,tr,en])=>[5,25,100].map((target,i)=>({id:'skill-'+skill+'-'+target,icon:['🌱','🏅','🏆'][i],tr:tr+' '+(i+1),en:en+' '+(i+1),dtr:target+' farklı başarılı '+skill+' çalışması',den:target+' distinct successful '+skill+' exercises',test:s=>(s.practice?.skills?.[skill]||0)>=target})));
  for(const target of [15,30,60,120,240])badges.push({id:'practice-days-'+target,icon:'📅',tr:target+' Günlük Yolculuk',en:target+' Day Journey',dtr:target+' farklı günde ödüllü SQL çalış',den:'Earn practice credit on '+target+' different days',test:s=>(s.practice?.days?.length||0)>=target});
  for(const target of [1,3,6,10,15])badges.push({id:'challenge-'+target,icon:'🏁',tr:'Görev Ustası '+target,en:'Challenge Master '+target,dtr:target+' farklı challenge tamamla',den:'Complete '+target+' distinct challenges',test:s=>Object.keys(s.challenges||{}).length>=target});
  const svg=content=>'<svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">'+content+'</svg>';
  const gear=[
    ['bere','head',2000,'Kaşif Beresi','Explorer Beanie','<path d="M69 66q1-49 59-49t59 49z" fill="#606c38"/><path d="M67 61h122v17q-61 14-122 0z" fill="#8b9d83"/><circle cx="128" cy="16" r="12" fill="#c08e3a"/>'],
    ['fedora','head',3500,'Dedektif Şapkası','Detective Hat','<path d="m87 63 10-37 31 11 31-11 10 37z" fill="#b08b6e"/><path d="M53 65q75-16 150 0v11q-75 17-150 0z" fill="#606c38"/><path d="M91 53h74v11H91z" fill="#c08e3a"/>'],
    ['botanik','head',5000,'Yaprak Tacı','Leaf Crown','<path d="M79 57q49-40 98 0" fill="none" stroke="#606c38" stroke-width="7"/><path d="M82 56Q60 26 94 38M106 41Q100 8 125 31M140 38Q158 8 165 40M171 48Q199 26 188 60" fill="#8b9d83" stroke="#606c38" stroke-width="3"/>'],
    ['sorgupapyon','neck',6500,'Sorgu Papyonu','Query Bow','<path d="m83 177 35 9-35 15zm90 0-35 9 35 15z" fill="#c66b3d"/><circle cx="128" cy="188" r="9" fill="#c08e3a"/>'],
    ['analizgoz','eyes',8000,'Analiz Gözlüğü','Analytics Glasses','<g fill="#8b9d83" fill-opacity=".3" stroke="#606c38" stroke-width="5"><rect x="70" y="127" width="48" height="35" rx="10"/><rect x="138" y="127" width="48" height="35" rx="10"/></g><path d="M118 140h20M60 139h10m116 0h10" stroke="#606c38" stroke-width="5"/><path d="m78 150 8-9 8 5 12-11m39 16 8-10 9 5 10-12" fill="none" stroke="#c08e3a" stroke-width="3"/>'],
    ['kacifatki','neck',10000,'Gezgin Atkısı','Traveler Scarf','<path d="M48 175q80 17 160 0v19q-80 17-160 0zM158 189h20v36h-20z" fill="#606c38"/><path d="M55 182q72 17 145 0m-39 23h17" fill="none" stroke="#c08e3a" stroke-width="5"/>'],
    ['mimaronluk','body',12000,'Mimar Önlüğü','Architect Apron','<path d="M78 174q50 14 100 0l10 36H68z" fill="#b08b6e"/><path d="M108 188h40v14h-40z" fill="#606c38"/><path d="M47 179q81 19 162 0" fill="none" stroke="#606c38" stroke-width="6"/>'],
    ['bilgelik','head',16000,'Bilgelik Şapkası','Sage Hat','<path d="m128 7-38 60q38 12 76 0z" fill="#606c38"/><path d="M64 69q64-18 128 0v10q-64 15-128 0z" fill="#8b9d83"/><path d="m126 35 3 8 9 1-7 5 2 9-7-5-7 5 3-9-7-5 8-1z" fill="#c08e3a"/>'],
    ['verikus','side',20000,'Veri Kuşu','Data Bird','<path d="M208 123q-16-33 9-36 27 0 18 31z" fill="#8b9d83"/><path d="m237 99 13 6-14 5" fill="#c66b3d"/><circle cx="228" cy="100" r="3" fill="#606c38"/><path d="M209 115q18-16 19 4" fill="#606c38"/>'],
    ['ustamadalya','neck',25000,'Büyük Usta Madalyası','Grandmaster Medal','<path d="m106 171 22 17 22-17" fill="none" stroke="#c66b3d" stroke-width="8"/><circle cx="128" cy="200" r="16" fill="#c08e3a" stroke="#b08b6e" stroke-width="3"/><path d="m121 199 5 5 10-12" fill="none" stroke="#606c38" stroke-width="3"/>'],
    ['challengebayrak','side',3000,'Görev Bayrağı','Challenge Flag','<path d="M225 86v92" stroke="#606c38" stroke-width="5"/><path d="M225 89h-35l7 13-7 13h35z" fill="#c66b3d"/><path d="m202 99 5 5 10-10" fill="none" stroke="#e8dcc7" stroke-width="3"/>','challenge',3],
    ['penceretac','head',10000,'Pencere Tacı','Window Crown','<path d="m79 61 1-35 27 21 21-33 21 33 27-21 1 35z" fill="#c08e3a"/><path d="M79 59h98v17H79z" fill="#606c38"/><g fill="#8b9d83"><rect x="94" y="62" width="12" height="10"/><rect x="122" y="62" width="12" height="10"/><rect x="150" y="62" width="12" height="10"/></g>','window',25]
  ].map(([id,slot,xp,tr,en,content,skill,target])=>({id,slot,xp,tr,en,svg:svg(content),skill,target}));
  function progress(xp){
    const value=Math.max(0,Number.isFinite(Number(xp))?Number(xp):0);
    let index=0;while(index+1<tiers.length&&value>=tiers[index+1])index++;
    const start=tiers[index],next=tiers[index+1]??null;
    return {level:index+1,start,next,percent:next===null?100:Math.min(100,Math.max(0,(value-start)/(next-start)*100))};
  }
  root.LearningRewards={tiers,names,credit,badges,gear,fingerprint,progress};
  if(typeof module==='object')module.exports=root.LearningRewards;
})(typeof window==='object'?window:globalThis);
