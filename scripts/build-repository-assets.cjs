'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'docs/architecture'),map=JSON.parse(fs.readFileSync(path.join(folder,'architecture.json')));
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mark=fs.readFileSync(path.join(root,'app/renderer/assets/wordmark.svg')).toString('base64'),icon=fs.readFileSync(path.join(root,'app/renderer/assets/icon.png')).toString('base64');
// Transparent, padded lockups match the reader's GitHub color scheme.
for(const dark of [false,true]){
 const original=fs.readFileSync(path.join(root,'app/renderer/assets/wordmark.svg'),'utf8');
 const artwork=(dark?original.replaceAll('#22211f','#e6edf3').replaceAll('#518f00','#9ad150'):original);
 const encoded=Buffer.from(artwork).toString('base64');
 fs.writeFileSync(path.join(root,'docs/assets/repository-wordmark'+(dark?'-dark':'')+'.svg'),`<svg xmlns="http://www.w3.org/2000/svg" width="520" height="112" viewBox="0 0 520 112" role="img" aria-label="PractiSQL"><image x="20" y="20" width="72" height="72" href="data:image/png;base64,${icon}"/><image x="112" y="17" width="386" height="77" href="data:image/svg+xml;base64,${encoded}"/></svg>`);
}
// Reuse the application's vector character with its native transparent canvas.
const mascot=fs.readFileSync(path.join(root,'app/renderer/index.html'),'utf8').match(/<svg class="rm mascot-model"[\s\S]*?<\/svg>/)[0].replace('<svg class="rm mascot-model"','<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="PractiSQL mascot"').replace(' aria-hidden="true"','');
fs.writeFileSync(path.join(root,'docs/assets/learning-companion.svg'),mascot+'\n');
const content={
 en:{
  title:'The PractiSQL AI harness',subtitle:'Context, model tools, SQLite execution and learning workflows in one coordinated system.',scope:'REQUEST OWNERSHIP & LIFECYCLE',guards:['Workspace + conversation','Database identity + revision','Cancellation + deadlines','Selected action + user limits'],
  lanes:['CONTEXT & MEMORY','MODEL & TOOL ORCHESTRATION','LOCAL SQLITE & EVIDENCE'],
  context:['Assemble the current task',['Teacher persona and SQL contract','Actual catalogue, schema and observations','Relevant history, selected SQL and quotations','The latest request stays intact']],
  memory:['Manage the context window',['Model capacity and output reserve','Conditional compaction of older material','Original sources and identities remain available']],
  archive:['Retrieve the exact source',['read_context pages saved messages, SQL,','operation records and complete result archives.','Historical results retain their original source.']],
  model:['Selected model + native protocols',['Chat Completions · Messages · Responses','API providers or ChatGPT account transport']],
  tools:['read_context','inspect_database'],toolNote:'Read-only observations return to the same model request.',
  answer:['Separate teaching from executable SQL',['Code-role and completeness checks','Explicit no-run and preservation limits','Eligible SQL follows the execution contract']],
  repair:['One conditional repair',['Eligible format, SQL or narrow teaching failure','Original request + actual error or evidence','The complete corrected batch is checked again']],
  read:['Read worker',['Read-only statement','Snapshot / connection path','Deadline and result limits']],
  write:['AI write batch',['SAVEPOINT boundary','SQLite constraints + triggers','RELEASE or ROLLBACK']],
  checks:['Check applicable data guarantees',['Foreign-key consistency and scoped preservation','Before/after evidence keeps its own provenance','Manual transactions use a separate path']],
  result:['Save what actually happened',['Result tables, complete SQL, errors and changes','Operation identities and full-result archives','Evidence remains available to follow-up requests']],
  learning:'LEARNING WORKFLOWS ON SHARED CONTEXT & EXECUTION FOUNDATIONS',
  flows:[['Lessons + PDF',['Local teaching fixtures','Observed SQL examples']],['Challenges',['Separate practice data','Three fixture variants']],['Exams',['Frozen schema snapshot','Execution + AI grading']],['SQL exercises',['Synthetic queries, no schema','Local keyword review']],['Data projects',['Verified UCI source','Independent numeric checks']]],
  footer:'SQLite and application checks verify their defined scope. Teaching and business interpretation still involve model judgment.',legend:['Request / execution','Source retrieval / feedback','Conditional repair'],loop:'Actual results feed the next context',
  button:'Download for Windows',buttonDetail:'Setup installer · x64',buttonAlt:'Open PractiSQL Windows releases'
 },
 tr:{
  title:'PractiSQL AI harness',subtitle:'Bağlam, model araçları, SQLite yürütmesi ve öğrenme akışlarını yöneten bütünleşik sistem.',scope:'İSTEK KAPSAMI VE YAŞAM DÖNGÜSÜ',guards:['Çalışma alanı + sohbet','Veritabanı kimliği + revizyon','İptal + süre sınırları','Seçilen işlem + kullanıcı sınırları'],
  lanes:['BAĞLAM VE BELLEK','MODEL VE ARAÇ YÖNETİMİ','YEREL SQLITE VE İŞLEM KANITI'],
  context:['Güncel görevi birleştir',['Öğretmen yönergeleri ve SQL kuralları','Gerçek katalog, şema ve gözlemler','İlgili geçmiş, seçili SQL ve alıntılar','Son kullanıcı isteği aynen korunur']],
  memory:['Bağlam penceresini yönet',['Model kapasitesi ve yanıt payı','Eski içerikte koşullu sıkıştırma','Özgün kaynaklar ve kimlikleri saklanır']],
  archive:['Özgün kaynağı geri getir',['read_context; mesajları, SQL’i, işlem kayıtlarını','ve tam sonuç arşivlerini sayfalar halinde okur.','Geçmiş sonuçlar kendi kaynağını korur.']],
  model:['Seçilen model ve API bağlantısı',['Chat Completions · Messages · Responses','API sağlayıcısı veya ChatGPT hesap bağlantısı']],
  tools:['read_context','inspect_database'],toolNote:'Salt okunur araç sonuçları aynı isteğe döner.',
  answer:['Anlatımı yürütülebilir SQL’den ayır',['Örnek kod ve tam sorgu ayrımı','Çalıştırma izni ve veri koruma sınırları','SQL, belirlenen işlem yoluna yönlendirilir']],
  repair:['Hataya göre tek düzeltme',['Biçim, SQL veya belirli anlatım hatalarında','Özgün istek + gerçek hata veya gözlem','Düzeltilmiş SQL bütünü yeniden denetlenir']],
  read:['Okuma işlemi',['Salt okunur sorgu','Kopya / bağlantı yolu','Süre ve sonuç sınırları']],
  write:['AI yazma işlemi',['SAVEPOINT sınırı','SQLite kısıtları + tetikleyiciler','RELEASE veya ROLLBACK']],
  checks:['Veri koruma kontrolleri',['Dış anahtarlar ve istenen koruma koşulları','İşlem öncesi ve sonrası kaynaklı gözlemler','Elle yazılan işlemler ayrı yolu izler']],
  result:['Gerçekleşen işlemi kaydet',['Sonuç tabloları, tam SQL, hata ve değişiklikler','İşlem kimlikleri ve eksiksiz sonuç arşivi','Gözlemlere takip sorularında erişilir']],
  learning:'ORTAK BAĞLAM VE YÜRÜTME TEMELİNİ KULLANAN ÖĞRENME AKIŞLARI',
  flows:[['Dersler ve PDF',['Yerel öğretim verileri','Gözlemlenen SQL örnekleri']],['Challenge’lar',['Ayrı deneme verisi','Üç farklı veri kümesi']],['Sınavlar',['Sabit şema kopyası','SQL + AI değerlendirmesi']],['SQL alıştırmaları',['Şemasız sentetik sorgular','Yerel anahtar kelime kontrolü']],['Veri projeleri',['Doğrulanan UCI kaynağı','Bağımsız sayısal kontroller']]],
  footer:'SQLite ve uygulama kontrolleri tanımlı kapsamı denetler. Anlatım ve iş yorumunda model değerlendirmesi de yer alır.',legend:['İstek / yürütme','Kaynak getirme / geri besleme','Koşullu düzeltme'],loop:'Gerçek sonuçlar sonraki bağlama taşınır',
  button:'Windows için indir',buttonDetail:'Kurulum dosyası · x64',buttonAlt:'PractiSQL Windows sürümlerini aç'
 }
};
const references={context:['input','context','envelope','schema','history'],memory:['capacity','compaction','sources'],archive:['readcontext','feedback','storage'],model:['model','provider','protocol','toolprotocol'],answer:['answerroles','limits'],repair:['repair','teaching'],read:['readworker','inspectdb'],write:['atomic'],checks:['audit','stale','cancel'],result:['feedback','observability','storage'],flows:['learnpdf','exam','projectnumeric','projectreview','projectsource']};
for(const ids of Object.values(references))for(const id of ids){assert(map.nodes[id]);for(const file of map.nodes[id].sources)assert(fs.existsSync(path.join(root,file)),file);}
const evidence=Object.fromEntries(Object.entries(references).map(([key,ids])=>[key,{components:ids,sources:[...new Set(ids.flatMap(id=>map.nodes[id].sources))]}]));
fs.writeFileSync(path.join(folder,'harness-components.json'),JSON.stringify({version:map.version,sections:evidence},null,2)+'\n');

for(const lang of ['en','tr']){
 const c=content[lang],parts=[];
 const text=(x,y,value,size=16,color='#56694f',weight=400,extra='')=>parts.push(`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-weight="${weight}" ${extra}>${esc(value)}</text>`);
 const rect=(x,y,w,h,fill='#fff',stroke='#c3d3b7',radius=18)=>parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" stroke="${stroke}"/>`);
 const line=(d,color='#4f7e32',dashed=false,arrow=true)=>parts.push(`<path d="${d}" stroke="${color}" stroke-width="2.2" fill="none" ${dashed?'stroke-dasharray="7 6"':''} ${arrow?`marker-end="url(#${color==='#aa783d'?'repair':'arrow'})"`:''}/>`);
 const panel=(id,x,y,w,h,title,lines,{dark=false,warm=false,small=false}={})=>{
  parts.push(`<g data-panel="${id}" data-box="${x},${y},${w},${h}">`);
  rect(x,y,w,h,dark?'#263e21':warm?'#f5ecdc':'#fff',dark?'#263e21':warm?'#d6bd94':'#c3d3b7');
  text(x+22,y+35,title,small?18:21,dark?'#fff':warm?'#755021':'#263e21',650);
  lines.forEach((s,i)=>text(x+22,y+70+i*26,s,small?14:16,dark?'#d2e1c8':'#56694f'));
  parts.push('</g>');
 };
 parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="1640" height="1440" viewBox="0 0 1640 1440" xml:lang="${lang}" role="img" aria-labelledby="title desc"><title id="title">${esc(c.title)}</title><desc id="desc">${esc(c.subtitle+' '+c.footer)}</desc><defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0l10 5-10 5" fill="#4f7e32"/></marker><marker id="repair" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0l10 5-10 5" fill="#aa783d"/></marker></defs><rect width="1640" height="1440" fill="#edf3e6"/><g font-family="Segoe UI,Arial,sans-serif">`);
 parts.push(`<image x="52" y="42" width="44" height="44" href="data:image/png;base64,${icon}"/><image x="110" y="43" width="218" height="43" href="data:image/svg+xml;base64,${mark}"/>`);
 text(1588,71,'AI HARNESS · '+map.version,15,'#526c48',600,'text-anchor="end"');
 text(52,144,c.title,38,'#21381d',700);text(52,181,c.subtitle,19);
 rect(52,216,1536,88,'#dce8d1','#b9cdae',18);text(74,243,c.scope,12,'#436735',700,'letter-spacing="1.2"');
 c.guards.forEach((label,i)=>{if(i)parts.push(`<line x1="${74+i*378-18}" y1="260" x2="${74+i*378-18}" y2="285" stroke="#b9cdae"/>`);text(74+i*378,280,label,16,'#2f4e25',600);});
 [52,568,1140].forEach((x,i)=>{text(x,353,String(i+1).padStart(2,'0'),14,'#5d853f',700);text(x+33,353,c.lanes[i],16,'#34532b',700);});
 panel('context',52,390,448,195,...c.context);
 panel('memory',52,620,448,172,...c.memory);
 panel('archive',52,830,448,218,...c.archive);
 panel('model',568,390,504,205,...c.model,{dark:true});
 for(let i=0;i<2;i++){rect(590+i*235,512,226,36,'#426236','#5f7f51',9);text(703+i*235,536,c.tools[i],16,'#fff',600,'text-anchor="middle"');}
 text(590,575,c.toolNote,14,'#d2e1c8');
 panel('answer',568,650,504,168,...c.answer);
 panel('repair',568,870,504,178,...c.repair,{warm:true});
 panel('read',1140,390,218,205,...c.read,{small:true});
 panel('write',1370,390,218,205,...c.write,{small:true});
 panel('checks',1140,650,448,168,...c.checks);
 panel('result',1140,870,448,178,...c.result);
 line('M276 304V382');line('M500 484H560');line('M820 595V642');
 // Eligible SQL reaches execution only after the response contract checks.
 line('M1072 734H1096V374H1479V382');line('M1249 374V382');
 line('M1249 595V630H1364V642');line('M1479 595V630H1364',undefined,false,false);line('M1364 818V862');
 line('M568 530H534V706H508',undefined,true);
 line('M500 670H520V460H560',undefined,true);
 line('M1140 782H1110V953H1080','#aa783d');line('M568 952H546V432H560','#aa783d');
 line('M276 585V612');line('M276 792V822');
 line('M1364 1048V1100H276V1056',undefined,true);text(820,1084,c.loop,15,'#526c48',500,'text-anchor="middle"');
 text(52,1170,c.learning,16,'#34532b',700);
 c.flows.forEach(([title,lines],i)=>{const x=52+i*310;panel('learning-'+i,x,1200,296,128,title,lines,{small:true});});
 const legendX=[52,465,985];c.legend.forEach((label,i)=>{const x=legendX[i];line(`M${x} 1370h40`,i===2?'#aa783d':'#4f7e32',i===1,false);text(x+51,1375,label,14);});
 text(52,1415,c.footer,14);parts.push('</g></svg>');
 fs.writeFileSync(path.join(folder,'ai-harness.'+lang+'.svg'),parts.join(''));
 const button=`<svg xmlns="http://www.w3.org/2000/svg" width="328" height="64" viewBox="0 0 328 64" role="img" aria-label="${esc(c.buttonAlt)}"><defs><linearGradient id="surface" x2="0" y2="1"><stop stop-color="#518b12"/><stop offset="1" stop-color="#376c08"/></linearGradient></defs><rect x=".5" y=".5" width="327" height="63" rx="16" fill="url(#surface)" stroke="#285507"/><rect x="8" y="8" width="46" height="48" rx="11" fill="#f3f8ec"/><g fill="#3d7411"><path d="M20 22h9v9h-9zm11 0h9v9h-9zM20 33h9v9h-9zm11 0h9v9h-9z"/></g><text x="68" y="29" font-family="Segoe UI,Arial,sans-serif" font-size="17" font-weight="650" fill="#fff">${esc(c.button)}</text><text x="68" y="47" font-family="Segoe UI,Arial,sans-serif" font-size="12" fill="#e1eed5">${esc(c.buttonDetail)}</text><circle cx="301" cy="32" r="13" fill="#ffffff1c"/><path d="M301 25v13m-5-5 5 5 5-5" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
 fs.writeFileSync(path.join(root,'docs/assets/download-windows.'+lang+'.svg'),button);
}
console.log(JSON.stringify({status:'generated',languages:['en','tr'],components:Object.keys(evidence).length,diagram:'1640x1440',applicationCodeChanged:false}));
