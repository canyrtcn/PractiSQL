(function(){
 'use strict';
 const groups=[['cute','Tatlı','Sweet'],['cool','Havalı','Cool'],['funny','Komik','Funny'],['cats','Kediler','Cats']];
 const designs=[
 ['peach','cute','Şeftali','Peach','person','#f6b6b0','bob'],['violet','cute','Menekşe','Violet','person','#c9b4e8','long'],['mint','cute','Nane','Mint','person','#b9dec5','curly'],['sun','cute','Güneş','Sunshine','person','#f5d47d','bun'],
 ['bunny','cute','Pofuduk','Fluffy','bunny','#ddc8f0'],['fox','cute','Minik Tilki','Little Fox','fox','#f3c297'],['cloud','cute','Bulut','Cloud','cloud','#bddce9'],['dino','cute','Minik Dino','Little Dino','dino','#b4dca4'],
 ['nova','cool','Nova','Nova','person','#a8c7dd','shades'],['indigo','cool','İndigo','Indigo','person','#b6b7de','short'],['ruby','cool','Yakut','Ruby','person','#e3a9b5','long'],['cobalt','cool','Kobalt','Cobalt','person','#9cbadf','cap'],
 ['astro','cool','Astronot','Astronaut','astro','#bdcced'],['robot','cool','Siber Dost','Cyber Buddy','robot','#afd4d5'],['owl','cool','Gece Kuşu','Night Owl','owl','#c7b5d4'],['dragon','cool','Ejder','Dragon','dino','#b1bbd8','shades'],
 ['potato','funny','Düşünen Patates','Thinking Potato','potato','#eed7a6'],['toast','funny','Tost Ustası','Toast Master','toast','#ecc58f'],['coffee','funny','Kahve Molası','Coffee Break','coffee','#dec3b2'],['duck','funny','Şaşkın Ördek','Surprised Duck','duck','#f4d780'],
 ['frog','funny','Profesör Kurbağa','Professor Frog','frog','#b6d2aa','glasses'],['blob','funny','Jöle','Jelly','blob','#b4c7eb'],['mushroom','funny','Mantar','Mushroom','mushroom','#e9b6aa'],['sleepy','funny','Uykucu','Sleepyhead','person','#cbbfde','sleep'],
 ['tabby','cats','Tekir','Tabby','cat','#d9c4a5','tabby'],['blackcat','cats','Gece Kedisi','Night Cat','cat','#adb7d3','black'],['calico','cats','Üç Renk','Calico','cat','#f1c6a8','calico'],['whitecat','cats','Pamuk','Cotton','cat','#c8dbd7','white'],
 ['spacecat','cats','Uzay Kedisi','Space Cat','cat','#b9bce4','space'],['detective','cats','Dedektif Pati','Detective Paws','cat','#cebcaa','detective'],['pirate','cats','Kaptan Pati','Captain Paws','cat','#b8d0dd','pirate'],['partycat','cats','Parti Kedisi','Party Cat','cat','#e4bcd5','party'],
 ['panda','cute','Bambu','Bamboo','panda','#bddcc8'],['koala','cute','Koala','Koala','koala','#d4cbe4'],['penguin','cute','Penguen','Penguin','penguin','#c4dce7'],['seal','cute','Minik Fok','Little Seal','seal','#b9d9de'],
 ['headphones','cool','Ritim','Rhythm','person','#c8c1e7','headphones'],['explorer','cool','Gezgin','Explorer','person','#d9c99d','explorer'],['neonbot','cool','Neon Dost','Neon Buddy','robot','#b6cfd4','neon'],['scholar','cool','Bilge Baykuş','Wise Owl','owl','#b6caac','scholar'],
 ['avocado','funny','Avokado','Avocado','avocado','#c8db9c'],['dumpling','funny','Mantıcık','Dumpling','dumpling','#e6c9bb'],['pineapple','funny','Ananas','Pineapple','pineapple','#e5d39c'],['sushi','funny','Sushi','Sushi','sushi','#c0d8ce'],
 ['gingercat','cats','Tarçın','Cinnamon','cat','#e6c7a0','ginger'],['tuxedocat','cats','Smokin','Tuxedo','cat','#becbc7','tuxedo'],['sleepycat','cats','Mışıl','Snoozy','cat','#c8c5e2','sleepy'],['chefcat','cats','Şef Pati','Chef Paws','cat','#d9d9c2','chef']
 ];
 function drawing(spec,index){
  const [id,group,tr,en,kind,bg,style]=spec,ink='#263342',skin=['#f4c5a5','#c88b67','#905b43','#e6ae88'][index%4];
  let shape='',extra='',eyes='<circle cx="42" cy="47" r="3"/><circle cx="62" cy="47" r="3"/>',mouth='<path d="M46 59q6 5 12 0" fill="none" stroke="'+ink+'" stroke-width="2.5" stroke-linecap="round"/>';
  const oval=(fill)=>'<ellipse cx="52" cy="49" rx="26" ry="28" fill="'+fill+'"/>';
  if(kind==='person'){
   const hair=['#513843','#373444','#624c3c','#9b6747'][index%4];
   shape='<path d="M21 94q1-27 31-27t31 27" fill="'+['#8c5587','#406887','#3f806b','#ad6842'][index%4]+'"/>'+(style==='long'?'<path d="M24 40q0-28 28-28t28 28v41H24" fill="'+hair+'"/>':'')+oval(skin);
   extra='<path d="M26 42q-5-30 25-30q30 0 28 27q-15-3-24-17q-7 20-29 20" fill="'+hair+'"/>';
   if(style==='curly')extra=[28,40,52,65,75].map((x,i)=>'<circle cx="'+x+'" cy="'+(22+(i%2)*5)+'" r="11" fill="'+hair+'"/>').join('');
   if(style==='bun')extra+='<circle cx="68" cy="12" r="11" fill="'+hair+'"/>';
   if(style==='cap')extra='<path d="M24 33q0-22 28-22q22 0 26 22Z" fill="#315c80"/><path d="M21 34h66" stroke="#203f5b" stroke-width="6" stroke-linecap="round"/>';
   if(style==='sleep'){eyes='<path d="M37 47h9m12 0h9" stroke="'+ink+'" stroke-width="3" stroke-linecap="round"/>';extra+='<path d="M77 14h10l-10 10h10" fill="none" stroke="'+ink+'" stroke-width="2"/>';}
   if(style==='headphones')extra+='<path d="M23 47V35a29 29 0 0 1 58 0v12" fill="none" stroke="#5b5790" stroke-width="6"/><rect x="18" y="39" width="11" height="22" rx="5" fill="#7470b1"/><rect x="75" y="39" width="11" height="22" rx="5" fill="#7470b1"/>';
   if(style==='explorer')extra+='<path d="M24 31l7-17h42l7 17" fill="#a98550"/><path d="M17 33h70" stroke="#80643e" stroke-width="7" stroke-linecap="round"/><path d="M29 25h47" stroke="#675239" stroke-width="4"/>';
  }else if(kind==='cat'||kind==='fox'){
   const fill=kind==='fox'?'#d8844f':style==='black'||style==='tuxedo'?'#424757':style==='white'?'#fff9ec':style==='ginger'?'#cf8a4d':'#dcab7c';
   shape='<path d="M26 41l-4-26l24 16m12 0l24-16l-4 28" fill="'+fill+'" stroke="'+fill+'" stroke-width="5" stroke-linejoin="round"/>'+oval(fill);
   extra='<path d="M27 29l-1-10l13 12m26 0l13-12l-1 12" fill="#df9ba1"/><path d="M19 53l16 2m-17 5l17-1m50-6l-16 2m17 5l-17-1" stroke="'+ink+'" stroke-width="1.4"/>';
   mouth='<path d="M48 55l4 4l4-4Z" fill="#c77483"/><path d="M52 59v3q-5 6-10 0m10 0q5 6 10 0" stroke="'+(style==='black'?'#ece6dc':ink)+'" fill="none" stroke-width="2"/>';
   if(style==='black')eyes='<circle cx="42" cy="47" r="3" fill="#b9d57a"/><circle cx="62" cy="47" r="3" fill="#b9d57a"/>';
   if(style==='tabby')extra+='<path d="M44 23l4 10m4-12v11m8-9l-4 10" stroke="#916a49" stroke-width="3"/>';
   if(style==='calico')extra+='<path d="M64 25q17 5 13 22H60Z" fill="#534b49"/>';
   if(style==='space')extra+='<circle cx="52" cy="48" r="36" fill="none" stroke="#eff5fc" stroke-width="5"/><path d="M20 79h64" stroke="#716fab" stroke-width="6"/>';
   if(style==='detective')extra+='<path d="M25 32l5-19h44l5 19Z" fill="#756352"/><path d="M19 33h66" stroke="#594c41" stroke-width="5"/>';
   if(style==='pirate'){extra+='<path d="M25 32q8-22 27-10q19-12 27 10Z" fill="#283742"/>';eyes='<circle cx="42" cy="47" r="3"/><path d="M56 43h13v9H56Z"/><path d="M25 32l48 21" stroke="'+ink+'" stroke-width="2"/>';}
   if(style==='party')extra+='<path d="M36 26l16-23l16 23Z" fill="#ac5f9c"/><circle cx="52" cy="4" r="4" fill="#f5d079"/><path d="M44 14l15 5" stroke="#f5d079" stroke-width="3"/>';
   if(style==='ginger')extra+='<path d="M44 23l4 10m4-12v11m8-9l-4 10" stroke="#94613a" stroke-width="3"/><path d="M29 62q23 24 46 0" fill="#f1d9b9"/>';
   if(style==='tuxedo')extra+='<path d="M52 35q-5 19-17 23q1 20 17 20t17-20q-12-4-17-23" fill="#fff5e8"/>';
   if(style==='sleepy')eyes='<path d="M37 47q5 5 10 0m10 0q5 5 10 0" stroke="'+ink+'" stroke-width="3" fill="none" stroke-linecap="round"/>';
   if(style==='chef')extra+='<path d="M32 29v-9q-16-5-9-16q7-10 18-3q10-11 20 0q13-8 20 3q6 12-9 16v9Z" fill="#fff8ed" stroke="#d7cab4" stroke-width="2"/><path d="M32 23h40" stroke="#d7cab4" stroke-width="3"/>';
  }else if(kind==='panda'){shape='<circle cx="29" cy="26" r="13" fill="#384249"/><circle cx="75" cy="26" r="13" fill="#384249"/>'+oval('#f7f3e9');extra='<ellipse cx="40" cy="46" rx="10" ry="12" fill="#384249" transform="rotate(16 40 46)"/><ellipse cx="64" cy="46" rx="10" ry="12" fill="#384249" transform="rotate(-16 64 46)"/><ellipse cx="52" cy="58" rx="5" ry="3.5" fill="#384249"/>';eyes='<circle cx="41" cy="45" r="3" fill="#fff"/><circle cx="63" cy="45" r="3" fill="#fff"/>';mouth='<path d="M47 65q5 4 10 0" stroke="'+ink+'" stroke-width="2" fill="none" stroke-linecap="round"/>';
  }else if(kind==='koala'){shape='<circle cx="25" cy="38" r="18" fill="#97a7ae"/><circle cx="79" cy="38" r="18" fill="#97a7ae"/><circle cx="25" cy="38" r="11" fill="#dbc1bb"/><circle cx="79" cy="38" r="11" fill="#dbc1bb"/>'+oval('#a4b2b6');extra='<ellipse cx="52" cy="51" rx="8" ry="11" fill="#53656d"/>';mouth='<path d="M46 66q6 4 12 0" stroke="'+ink+'" stroke-width="2" fill="none" stroke-linecap="round"/>';
  }else if(kind==='penguin'){shape='<ellipse cx="52" cy="52" rx="29" ry="35" fill="#405263"/><ellipse cx="52" cy="61" rx="21" ry="23" fill="#f3f5eb"/><ellipse cx="52" cy="44" rx="19" ry="17" fill="#f3f5eb"/><ellipse cx="37" cy="87" rx="10" ry="5" fill="#e0ab65"/><ellipse cx="67" cy="87" rx="10" ry="5" fill="#e0ab65"/>';mouth='<path d="M46 55l6 8 6-8Z" fill="#dda45c"/>';
  }else if(kind==='seal'){shape='<ellipse cx="52" cy="61" rx="31" ry="25" fill="#eef5f3"/><path d="M24 57Q5 60 10 74l19-7m46-10q19 3 19 17l-19-7" fill="#d7e8e7"/>'+oval('#eef5f3');extra='<path d="M22 55l14 2m-14 5 14-2m46-5-14 2m14 5-14-2" stroke="#8ca6ad" stroke-width="1.4"/><ellipse cx="52" cy="55" rx="4" ry="3" fill="#627c85"/>';
  }else if(kind==='avocado'){shape='<path d="M52 12q17 0 19 24q16 18 13 34q-3 23-32 23T20 70q-3-16 13-34q2-24 19-24Z" fill="#5b8a56"/><path d="M52 19q11 0 13 21q15 17 12 29q-3 17-25 17T27 69q-3-12 12-29q2-21 13-21Z" fill="#d2df91"/>';extra='<circle cx="52" cy="70" r="12" fill="#aa7955"/><path d="M47 65q3-4 7-3" stroke="#c59a72" stroke-width="3" stroke-linecap="round"/>';mouth='<path d="M46 53q6 5 12 0" stroke="'+ink+'" stroke-width="2.5" fill="none" stroke-linecap="round"/>';
  }else if(kind==='dumpling'){shape='<path d="M17 66q4-33 35-43q31 10 35 43q-35 22-70 0Z" fill="#fff0d9" stroke="#d0ac8b" stroke-width="2"/>';extra='<path d="M52 25v13m-15-7 4 11m26-11-4 11m-37-2 8 9m44-9-8 9" stroke="#dab897" stroke-width="2" stroke-linecap="round"/>';
  }else if(kind==='pineapple'){shape='<path d="m52 31-18-18 15 4 3-15 5 15 16-5-14 20" fill="#5d976b"/><rect x="27" y="28" width="50" height="61" rx="22" fill="#e3bb66"/>';extra='<path d="m31 40 41 36M29 55l35 31m-25-55 35 30m0-21L33 76m43-21L40 86m24-55L29 61" stroke="#c99c4e" stroke-width="1.5" opacity=".55"/>';
  }else if(kind==='sushi'){shape='<rect x="22" y="35" width="60" height="46" rx="12" fill="#45645c"/><ellipse cx="52" cy="35" rx="30" ry="15" fill="#f6f0df"/><rect x="38" y="23" width="28" height="19" rx="6" fill="#dd9f8b"/>';extra='<path d="m42 25 13 13m-2-13 10 10" stroke="#f7d2bb" stroke-width="2" stroke-linecap="round"/>';eyes='<circle cx="42" cy="59" r="3" fill="#f6f0df"/><circle cx="62" cy="59" r="3" fill="#f6f0df"/>';mouth='<path d="M46 70q6 4 12 0" stroke="#f6f0df" stroke-width="2.5" fill="none" stroke-linecap="round"/>';
  }else if(kind==='bunny'){shape='<ellipse cx="37" cy="24" rx="9" ry="23" fill="#fff5ed"/><ellipse cx="66" cy="24" rx="9" ry="23" fill="#fff5ed"/>'+oval('#fff5ed');extra='<path d="M37 8v24m29-24v24" stroke="#e4b5c4" stroke-width="6" stroke-linecap="round"/>';
  }else if(kind==='robot'){shape='<rect x="24" y="24" width="56" height="50" rx="15" fill="#f0f7f5"/><path d="M52 24V13" stroke="'+ink+'" stroke-width="3"/><circle cx="52" cy="11" r="5" fill="#508c91"/>';extra='<rect x="30" y="36" width="44" height="23" rx="9" fill="#365662"/>';eyes='<circle cx="42" cy="47" r="3" fill="#aee3bc"/><circle cx="62" cy="47" r="3" fill="#aee3bc"/>';
  }else if(kind==='astro'){shape='<circle cx="52" cy="46" r="32" fill="#f5f5fb"/><rect x="27" y="26" width="50" height="43" rx="18" fill="#36466b"/>';extra='<path d="M32 31l9-4" stroke="#a8cbe3" stroke-width="3" stroke-linecap="round"/>';eyes='<circle cx="42" cy="47" r="3" fill="#f5d28e"/><circle cx="62" cy="47" r="3" fill="#f5d28e"/>';mouth='';
  }else if(kind==='owl'){shape=oval('#8c7597');extra='<path d="M25 26l8-10l12 11m16 0l12-11l7 11" fill="#6b5678"/><circle cx="40" cy="46" r="13" fill="#f6ead3"/><circle cx="64" cy="46" r="13" fill="#f6ead3"/>';eyes='<circle cx="40" cy="46" r="4"/><circle cx="64" cy="46" r="4"/>';mouth='<path d="M46 56l6 9l6-9Z" fill="#dda861"/>';
  }else if(kind==='dino'){shape='<path d="M25 67V40q0-20 26-20q21 0 22 17l9 4v20q0 17-27 17Z" fill="#6aa978"/>';extra='<path d="M26 36l-9-8l8-8l10 8m3-6l-3-11l12-1l5 10" fill="#45845c"/>';
  }else if(kind==='frog'){shape='<ellipse cx="52" cy="52" rx="32" ry="26" fill="#84b17a"/><circle cx="33" cy="29" r="14" fill="#84b17a"/><circle cx="71" cy="29" r="14" fill="#84b17a"/>';eyes='<circle cx="33" cy="29" r="4"/><circle cx="71" cy="29" r="4"/>';extra='<circle cx="33" cy="29" r="11" fill="none" stroke="'+ink+'" stroke-width="2"/><circle cx="71" cy="29" r="11" fill="none" stroke="'+ink+'" stroke-width="2"/><path d="M44 29h16" stroke="'+ink+'" stroke-width="2"/>';
  }else if(kind==='duck'){shape=oval('#f1ce69');extra='<path d="M50 52q23-5 25 6q-2 10-25 4Z" fill="#d98a42"/>';eyes='<circle cx="40" cy="44" r="4"/>';mouth='';
  }else if(kind==='coffee'){shape='<path d="M28 32h47v35q0 12-23 12T28 67Z" fill="#fff7ed"/><path d="M75 38q20-2 14 20q-4 8-14 6" stroke="#fff7ed" fill="none" stroke-width="7"/>';extra='<path d="M38 23q-5-5 0-10m14 10q-5-5 0-10m14 10q-5-5 0-10" fill="none" stroke="#927560" stroke-width="2.5" stroke-linecap="round"/>';
  }else if(kind==='toast'){shape='<path d="M28 39q-11-11 2-21q21-14 44 0q13 10 2 21v39H28Z" fill="#bc8655"/><path d="M34 39q-8-10 2-16q16-9 33 0q10 6 1 16v32H34Z" fill="#f6dc9e"/>';
  }else if(kind==='mushroom'){shape='<path d="M37 43h30v26q-15 19-30 0Z" fill="#f7ebd6"/><path d="M19 43q3-30 33-30t33 30Z" fill="#c8776a"/>';extra='<circle cx="38" cy="29" r="5" fill="#f7ebd6"/><circle cx="64" cy="25" r="6" fill="#f7ebd6"/>';eyes='<circle cx="44" cy="56" r="3"/><circle cx="60" cy="56" r="3"/>';mouth='<path d="M47 65q5 4 10 0" fill="none" stroke="'+ink+'" stroke-width="2"/>';
  }else if(kind==='cloud'){shape='<path d="M26 67q-21-6-10-24q5-7 15-5q1-23 22-22q19 0 23 19q24 0 20 20q-2 14-22 13Z" fill="#f6fbfc"/>';
  }else if(kind==='potato'){shape='<path d="M24 57q0-36 24-39q30-5 32 27q14 37-23 38Q24 84 24 57" fill="#c6a16c"/>';extra='<circle cx="32" cy="36" r="2" fill="#a57e4e"/><circle cx="71" cy="63" r="2" fill="#a57e4e"/><path d="M23 74l16-12" stroke="#795c40" stroke-width="4" stroke-linecap="round"/>';
  }else{shape='<path d="M18 65q-7-20 13-33q18-30 36-6q24-2 19 24q19 27-12 29q-18 13-28 1q-26 9-28-15Z" fill="#7894c6"/>';
  }
  if(style==='shades')eyes='<path d="M31 42h18v10q-12 7-17-3Zm24 0h18l-1 7q-5 10-17 3Z"/><path d="M49 45h6" stroke="'+ink+'" stroke-width="2"/>';
  if(style==='neon'){extra+='<path d="M29 66h46" stroke="#7b82bd" stroke-width="3" stroke-linecap="round"/>';eyes='<circle cx="42" cy="47" r="3" fill="#b9b1ef"/><circle cx="62" cy="47" r="3" fill="#b9b1ef"/>';}
  if(style==='scholar')extra+='<path d="m22 22 30-12 30 12-30 12Z" fill="#4b655b"/><path d="M29 25v12m-3 0h6" stroke="#4b655b" stroke-width="2"/><circle cx="40" cy="46" r="15" fill="none" stroke="#647e6b" stroke-width="2"/><circle cx="64" cy="46" r="15" fill="none" stroke="#647e6b" stroke-width="2"/>';
  const box=window.PractiAvatarFrames?.[id]||[12,12,80,80],scale=Math.min(1.08,80/Math.max(box[2],box[3])),x=52-(box[0]+box[2]/2)*scale,y=52-(box[1]+box[3]/2)*scale;
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="104" height="104" viewBox="0 0 104 104"><rect width="104" height="104" rx="27" fill="'+bg+'"/><circle cx="52" cy="54" r="43" fill="white" opacity=".14"/><g class="avatar-art" transform="translate('+x+' '+y+') scale('+scale+')">'+shape+extra+'<g fill="'+ink+'">'+eyes+'</g>'+mouth+'</g></svg>');
 }
 const catalog=designs.map((spec,i)=>({id:spec[0],group:spec[1],tr:spec[2],en:spec[3],src:drawing(spec,i)}));
 const avatarTiles=new Map(),avatarGrid=document.createElement('div');avatarGrid.id='avatarChoices';avatarGrid.className='avatar-choices';let renderedGroup=null;
 let context,dialog,session=0;
 function progress(step){return '<div class="identity-progress">'+Array.from({length:5},(_,i)=>'<span'+(i<step?' class="done"':'')+'></span>').join('')+'</div>';}
 function init(ctx){
  context=ctx;
  const edit=document.createElement('button');edit.id='btnEditIdentity';edit.className='btn small';edit.dataset.i18n='editIdentity';edit.textContent=ctx.say('Ad ve avatar','Name and avatar');edit.onclick=()=>open();ctx.$('btnMascot').parentElement.prepend(edit);
  if(ctx.settings.onboarding?.completed===false){
   if(window.__startupSplash&&window.__startupSplash.phase!=='hidden')window.addEventListener('practisql:ready',firstRun,{once:true});
   else firstRun();
  }
 }
 function firstRun(){
  const stage=context.settings.onboarding?.stage;
  if(stage==='provider')return openProvider();
  if(stage==='goal')return openGoal();
  if(stage==='theme')return openTheme();
  if(stage==='identity')return open(true);
  const {settings,esc,say,persist}=context;
  dialog?.remove();dialog=document.createElement('dialog');dialog.id='identityDialog';dialog.className='identity-dialog';
  dialog.setAttribute('aria-labelledby','identityTitle');dialog.innerHTML=progress(1)+'<div class="identity-intro"><img class="hello" src="./assets/mascot.png" alt=""><div><p class="identity-step">1 / 5</p><h2 id="identityTitle">Merhaba! Hello!</h2><p>Dilini seç · Choose your language</p></div></div><div class="identity-language"><button type="button" data-language="tr">Türkçe</button><button type="button" data-language="en">English</button></div><p class="identity-error" id="identityError" role="status"></p>';
  document.body.appendChild(dialog);dialog.oncancel=e=>e.preventDefault();dialog.showModal();
  dialog.querySelectorAll('[data-language]').forEach(button=>button.onclick=async()=>{
   dialog.querySelectorAll('button').forEach(b=>b.disabled=true);const old=settings.onboarding,oldLang=settings.lang;
   try{context.setLanguage(button.dataset.language);settings.onboarding={version:4,completed:false,stage:'identity'};if(await persist()===false)throw Error('save');dialog.close();open(true);}
   catch{settings.onboarding=old;context.setLanguage(oldLang==='tr'?'tr':'en');dialog.querySelectorAll('button').forEach(b=>b.disabled=false);dialog.querySelector('#identityError').textContent=say('Dil kaydedilemedi. Tekrar dene.','Could not save language. Try again.');}
  });
 }
 function openTheme(){
  const {settings,esc,say,persist,setTheme}=context;
  const savedTheme=settings.theme;
  const themes=[['light',say('Açık','Light'),say('Aydınlık ve sade','Bright and clear')],['leaf',say('Yaprak','Leaf'),say('Yeşilin sakinliği','A little greenery')],['dark',say('Koyu','Dark'),say('Koyu bir çalışma alanı','A darker workspace')]];
  dialog?.remove();dialog=document.createElement('dialog');dialog.id='identityDialog';dialog.className='identity-dialog identity-theme-dialog';dialog.setAttribute('aria-labelledby','identityTitle');
  dialog.innerHTML=progress(3)+'<div class="identity-intro"><img class="hello" src="./assets/mascot.png" alt=""><div><p class="identity-step">3 / 5</p><h2 id="identityTitle">'+esc(say('Atölyenin rengini seç','Choose your workshop’s look'))+'</h2><p>'+esc(say('Üç farklı hava, aynı SQL atölyesi. Sana en iyi geleni seç.','Three looks, the same SQL workshop. Pick the one you feel at home in.'))+'</p></div></div><form id="identityThemeForm"><fieldset class="identity-themes"><legend class="identity-theme-legend">'+esc(say('Tema','Theme'))+'</legend>'+themes.map(([id,title,detail])=>'<label class="identity-theme"><input type="radio" name="setupTheme" value="'+id+'"'+(settings.theme===id?' checked':'')+'><span class="identity-theme-surface"><img class="identity-theme-preview" src="./assets/theme-previews/'+(settings.lang==='en'?'en':'tr')+'-'+id+'.png" alt="'+esc(say(title+' temada gerçek uygulama görünümü','Actual app in the '+title.toLowerCase()+' theme'))+'"><span class="identity-theme-caption"><span><strong>'+esc(title)+'</strong><span class="identity-theme-detail">'+esc(detail)+'</span></span><svg class="identity-theme-check" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m7 12 3 3 7-7"/></svg></span></span></label>').join('')+'</fieldset><p class="identity-theme-hint">'+esc(say('İstediğin zaman Ayarlar → Tema bölümünden değiştirebilirsin.','You can change this anytime in Settings → Theme.'))+'</p><p id="identityError" class="identity-error" role="status"></p><div class="row identity-actions"><button type="submit" class="btn primary" id="identityThemeSave">'+esc(say('Devam et','Continue'))+'</button></div></form>';
  document.body.appendChild(dialog);dialog.oncancel=e=>e.preventDefault();dialog.showModal();
  dialog.querySelectorAll('[name=setupTheme]').forEach(input=>input.onchange=()=>{setTheme(input.value);dialog.querySelector('#identityError').textContent='';});
  dialog.querySelector('#identityThemeForm').onsubmit=async e=>{
   e.preventDefault();const old=settings.onboarding,button=dialog.querySelector('#identityThemeSave');button.disabled=true;
   const selected=dialog.querySelector('[name=setupTheme]:checked').value;
   dialog.querySelectorAll('[name=setupTheme]').forEach(input=>input.disabled=true);
   setTheme(selected);settings.onboarding={version:4,completed:false,stage:'goal'};
   try{if(await persist()===false)throw Error('save');dialog.close();openGoal();}
   catch{settings.onboarding=old;setTheme(savedTheme);dialog.querySelector('[value="'+savedTheme+'"]').checked=true;dialog.querySelector('#identityError').textContent=say('Tema kaydedilemedi. Tekrar dene.','Could not save the theme. Try again.');button.disabled=false;dialog.querySelectorAll('[name=setupTheme]').forEach(input=>input.disabled=false);}
  };
 }
 function openGoal(){
  const {settings,esc,say,persist,refresh}=context;
  dialog?.remove();dialog=document.createElement('dialog');dialog.id='identityDialog';dialog.className='identity-dialog';dialog.setAttribute('aria-labelledby','identityTitle');
  dialog.innerHTML=progress(4)+'<div class="identity-intro"><img class="hello" id="goalMascot" src="./assets/mascot.png" alt=""><div><p class="identity-step">4 / 5</p><h2 id="identityTitle">'+esc(say('Haftalık hedefin','Your weekly goal'))+'</h2><p>'+esc(say('Küçük adımlar, bol SQL. Hedefini sonra profilinden değiştirebilirsin.','Small steps, plenty of SQL. You can change this later in your profile.'))+'</p></div></div><form id="identityGoalForm"><div class="identity-goal"><output id="identityGoalValue" for="identityGoal"></output><p class="hint">'+esc(say('haftada sorgu','queries per week'))+'</p><input type="range" id="identityGoal" min="50" max="1000" step="50" value="'+(Number.isFinite(settings.goal)&&settings.goal>=50?Math.min(1000,Math.round(settings.goal/50)*50):100)+'" aria-label="'+esc(say('Haftalık sorgu hedefi','Weekly query goal'))+'"><div class="row" style="justify-content:space-between"><span>50</span><span>1000</span></div></div><p id="identityError" class="identity-error" role="status"></p><div class="row identity-actions"><button type="submit" class="btn primary" id="identityGoalSave">'+esc(say('Devam et','Continue'))+'</button></div></form>';
  document.body.appendChild(dialog);dialog.oncancel=e=>e.preventDefault();dialog.showModal();
  const input=dialog.querySelector('#identityGoal'),output=dialog.querySelector('#identityGoalValue');
  const update=()=>{output.textContent=input.value;const mascot=dialog.querySelector('#goalMascot');mascot.classList.remove('goal-nod');void mascot.offsetWidth;mascot.classList.add('goal-nod');};input.oninput=update;update();
  dialog.querySelector('#identityGoalForm').onsubmit=async e=>{e.preventDefault();const old=settings.onboarding,oldGoal=settings.goal,button=dialog.querySelector('#identityGoalSave');button.disabled=true;
   settings.goal=Math.max(50,Math.min(1000,Math.round(Number(input.value)/50)*50));settings.onboarding={version:4,completed:false,stage:'provider'};
   try{if(await persist()===false)throw Error('save');refresh();dialog.close();openProvider();}catch{settings.onboarding=old;settings.goal=oldGoal;dialog.querySelector('#identityError').textContent=say('Hedef kaydedilemedi. Tekrar dene.','Could not save goal. Try again.');button.disabled=false;}
  };
 }
 function privacyNotice(esc,say){
  return '<aside id="identityPrivacy" class="identity-privacy" role="note"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8.5 12 2.3 2.3 4.7-4.6"/></svg><div><strong>'+esc(say('AI ile çalışırken','When you use AI'))+'</strong><p>'+esc(say('AI’ye soru sorduğunda sorun, ilgili sohbet, veritabanı şeması ve gerektiğinde örnek veya sonuç kayıtları seçtiğin sağlayıcıyla paylaşılabilir. SQL sorguların cihazında çalışır; AI bağlantısını sen seçersin.','When you ask AI a question, your question, relevant conversation, database schema and, when needed, sample or result rows may be shared with your selected provider. SQL queries run on your device; you choose whether to connect AI.'))+'</p></div></aside>';
 }
 function openProvider(){
  const {settings,esc,say,persist}=context;
  dialog?.remove();dialog=document.createElement('dialog');dialog.id='identityDialog';dialog.className='identity-dialog';dialog.setAttribute('aria-labelledby','identityTitle');
  const choices=[['chatgpt',say('ChatGPT hesabımla','With my ChatGPT account'),say('Hesabını bağla ve kullanım paylaşımını onayla.','Connect your account and approve usage sharing.')],['opencode',say('API anahtarıyla','With an API key'),say('Sağlayıcını seçip kendi anahtarını ekle.','Choose your provider and add your key.')],['later',say('Daha sonra','Set up later'),say('Şimdi dersleri ve SQL atölyesini keşfet.','Explore lessons and the SQL workshop now.')]];
  dialog.innerHTML=progress(5)+'<div class="identity-intro"><img class="hello" src="./assets/mascot.png" alt=""><div><p class="identity-step">5 / 5</p><h2 id="identityTitle">'+esc(say('Hoş geldin, ','Welcome, ')+(settings.profile?.name||say('SQL öğrencisi','SQL learner'))+'!')+'</h2><p class="identity-provider-question">'+esc(say('AI asistanını bağlayalım mı?','Connect your AI assistant?'))+'</p><p>'+esc(say('İstersen şimdi bağla. SQL atölyesi ve hazır dersler bağlantı olmadan da çalışır.','Connect now if you like. The SQL workshop and built-in lessons also work without a connection.'))+'</p></div></div>'+privacyNotice(esc,say)+'<div class="identity-provider-choices">'+choices.map(([id,title,detail])=>'<button type="button" data-setup-provider="'+id+'"><strong>'+esc(title)+'</strong><span>'+esc(detail)+'</span></button>').join('')+'</div><p id="identityProviderHint" class="identity-provider-hint">'+esc(say('Sonradan Ayarlar → Sağlayıcı bölümünden hesabını bağlayabilir, sağlayıcını değiştirebilirsin.','You can connect an account or change providers later in Settings → Provider.'))+'</p><p id="identityError" class="identity-error" role="status"></p>';
  document.body.appendChild(dialog);dialog.showModal();
  let saving=false;
  const complete=async choice=>{
   if(saving)return;saving=true;dialog.querySelectorAll('button').forEach(b=>b.disabled=true);const old=settings.onboarding;
   settings.onboarding={version:4,completed:true,providerChoice:choice};
   try{if(await persist()===false)throw Error('save');}
   catch{settings.onboarding=old;saving=false;dialog.querySelectorAll('button').forEach(b=>b.disabled=false);dialog.querySelector('#identityError').textContent=say('Seçimin kaydedilemedi. Tekrar dene.','Could not save your choice. Try again.');return;}
   dialog.close();if(choice!=='later')context.openProvider(choice);
  };
  dialog.querySelectorAll('[data-setup-provider]').forEach(button=>button.onclick=()=>complete(button.dataset.setupProvider));
  dialog.oncancel=e=>{e.preventDefault();complete('later');};
 }
 function open(first=false){
  if(!context)return;
  if(dialog?.open){dialog.focus();return;}
  const {$,settings,esc,say,persist,refresh}=context,ownSession=++session;
  const saved=settings.profile?.avatar,preset=catalog.find(avatar=>avatar.id===settings.profile?.avatarId),usePreset=preset&&(!saved||saved.startsWith('data:image/svg+xml'));
  let selected=usePreset?preset.src:saved||catalog[0].src,selectedId=usePreset?preset.id:(!saved?catalog[0].id:null),group='all',imageVersion=0;
  dialog?.remove();dialog=document.createElement('dialog');dialog.id='identityDialog';dialog.className='identity-dialog';dialog.setAttribute('aria-labelledby','identityTitle');
  dialog.innerHTML='<form id="identityForm"><div class="identity-intro"><img src="./assets/mascot.png" alt=""><div><h2 id="identityTitle">'+esc(first?say('Tanışalım!','Let’s meet!'):say('Profilini düzenle','Edit your profile'))+'</h2><p>'+esc(say('Sana nasıl hitap edelim? Fotoğraf veya avatar seçmek isteğe bağlı.','What should we call you? A photo or avatar is optional.'))+'</p></div></div><label class="fld"><span>'+esc(say('Adın veya takma adın','Name or nickname'))+'</span><input id="identityName" maxlength="40" autocomplete="nickname" required></label><div class="identity-photo"><img id="identityPreview" alt="'+esc(say('Seçili avatar','Selected avatar'))+'"><div><label class="btn small" for="identityPhoto">'+esc(say('Fotoğraf ekle','Add a photo'))+'</label><input class="hidden" id="identityPhoto" type="file" accept="image/png,image/jpeg,image/webp,image/gif"><button type="button" class="btn small" id="identityClear">'+esc(say('Görseli kaldır','Remove image'))+'</button><p class="hint">'+esc(say('Fotoğraf yalnız cihazında saklanır. PNG, JPG, WebP veya GIF; en fazla 8 MB.','Photos stay on your device. PNG, JPG, WebP or GIF; up to 8 MB.'))+'</p></div></div><nav id="avatarGroups" class="avatar-groups" aria-label="'+esc(say('Avatar türleri','Avatar categories'))+'"></nav><div id="avatarChoices" class="avatar-choices"></div><p id="identityError" role="status" class="identity-error"></p><div class="row identity-actions"><button class="btn primary" id="identitySave" type="submit">'+esc(first?say('Başlayalım','Let’s start'):say('Kaydet','Save'))+'</button>'+(!first?'<button class="btn" id="identityCancel" type="button">'+esc(say('Vazgeç','Cancel'))+'</button>':'')+'</div></form>';
  document.body.appendChild(dialog);$('identityName').value=settings.profile?.name||'';
  if(!first){const close=document.createElement('button');close.type='button';close.className='identity-close';close.id='identityClose';close.title=say('Kapat','Close');close.setAttribute('aria-label',close.title);close.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>';close.onclick=()=>dialog.close();dialog.appendChild(close);}
  if(first){dialog.querySelector('form').insertAdjacentHTML('afterbegin',progress(2));dialog.querySelector('.identity-intro img').classList.add('hello');}
  $('avatarChoices').replaceWith(avatarGrid);
  const preview=()=>{const image=$('identityPreview');if(selected){image.src=selected;image.hidden=false;}else{image.removeAttribute('src');image.hidden=true;}};
  const selection=()=>{for(const[id,button]of avatarTiles){const pressed=String(selectedId===id);if(button.getAttribute('aria-pressed')!==pressed)button.setAttribute('aria-pressed',pressed);}};
  const choices=()=>{
   $('avatarGroups').innerHTML=[['all','Hepsi','All'],...groups].map(([id,tr,en])=>'<button type="button" data-group="'+id+'" aria-pressed="'+(group===id)+'">'+esc(say(tr,en))+'</button>').join('');
   for(const a of catalog){let button=avatarTiles.get(a.id);if(!button){button=document.createElement('button');button.type='button';button.className='avatar-choice';button.dataset.avatar=a.id;const image=document.createElement('img');image.src=a.src;image.alt='';const label=document.createElement('span');button.append(image,label);avatarTiles.set(a.id,button);}const label=say(a.tr,a.en);if(button.title!==label){button.title=label;button.lastElementChild.textContent=label;}}
   if(renderedGroup!==group){const fragment=document.createDocumentFragment();for(const a of catalog)if(group==='all'||a.group===group)fragment.appendChild(avatarTiles.get(a.id));avatarGrid.replaceChildren(fragment);renderedGroup=group;}selection();
   dialog.querySelectorAll('[data-group]').forEach(b=>b.onclick=()=>{group=b.dataset.group;choices();$('avatarGroups').querySelector('[data-group="'+group+'"]').focus();});
  };
  avatarGrid.onclick=e=>{const button=e.target.closest('[data-avatar]');if(!button||!avatarGrid.contains(button))return;const a=catalog.find(a=>a.id===button.dataset.avatar);imageVersion++;selected=a.src;selectedId=a.id;$('identityError').textContent='';preview();selection();button.focus();};
  preview();choices();
  $('identityClear').onclick=()=>{imageVersion++;selected='';selectedId=null;preview();selection();};
  $('identityPhoto').onchange=async()=>{
   const file=$('identityPhoto').files[0],version=++imageVersion;if(!file)return;
   let url;try{
    if(file.size>8*1024*1024||!/^image\/(png|jpeg|webp|gif)$/.test(file.type))throw Error(say('PNG, JPG, WebP veya GIF seç; dosya 8 MB altında olmalı.','Choose PNG, JPG, WebP or GIF under 8 MB.'));
    url=URL.createObjectURL(file);const image=new Image();image.src=url;await image.decode();
    if(image.naturalWidth*image.naturalHeight>25*1000*1000)throw Error(say('Fotoğraf çok büyük. Daha küçük bir görsel seç.','Photo is too large. Choose a smaller image.'));
    const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const edge=Math.min(image.naturalWidth,image.naturalHeight);canvas.getContext('2d').drawImage(image,(image.naturalWidth-edge)/2,(image.naturalHeight-edge)/2,edge,edge,0,0,256,256);
    if(ownSession!==session||version!==imageVersion||!dialog.open)return;
    selected=canvas.toDataURL('image/png');selectedId=null;$('identityError').textContent='';preview();selection();
   }catch{if(ownSession===session&&version===imageVersion)$('identityError').textContent=say('Görsel açılamadı. Geçerli bir PNG, JPG, WebP veya GIF seç; en fazla 8 MB ve 25 megapiksel.','Could not open image. Choose a valid PNG, JPG, WebP or GIF up to 8 MB and 25 megapixels.');}finally{if(url)URL.revokeObjectURL(url);$('identityPhoto').value='';}
  };
  const owner=dialog;dialog.oncancel=e=>{if(first)e.preventDefault();};dialog.onclose=()=>{if(ownSession===session)session++;if(owner.contains(avatarGrid)){avatarGrid.remove();avatarGrid.onclick=null;}};
  if(!first){$('identityCancel').onclick=()=>dialog.close();dialog.onclick=e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}};}
  $('identityForm').onsubmit=async e=>{
   e.preventDefault();const name=$('identityName').value.trim().slice(0,40);if(!name){$('identityError').textContent=say('Bir ad veya takma ad yaz.','Enter a name or nickname.');$('identityName').focus();return;}
   const oldProfile=settings.profile,oldOnboarding=settings.onboarding,save=$('identitySave');save.disabled=true;
   settings.profile={...oldProfile,name,avatar:selected,avatarId:selectedId};settings.onboarding=first?{version:4,completed:false,stage:'theme'}:oldOnboarding;
   try{if(await persist()===false)throw Error('save');refresh();if(ownSession===session){dialog.close();if(first)openTheme();}}catch{settings.profile=oldProfile;settings.onboarding=oldOnboarding;$('identityError').textContent=say('Profil kaydedilemedi. Tekrar dene; mevcut profilin korundu.','Could not save profile. Try again; your existing profile is preserved.');}finally{save.disabled=false;}
  };
  dialog.showModal();$('identityName').focus();
 }
 window.PractiProfile={init,open,catalog};
})();
