/* Verify concrete physical references against supplied live facts, without a second model judge. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TeachingGrounding=api;})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const physical=typeof module==='object'&&module.exports?require('./physical-fk-tuples.js'):globalThis.PhysicalForeignKeys;
 const cells=typeof module==='object'&&module.exports?require('./sqlite-values.js'):globalThis.SqliteValues;
 const fold=s=>String(s).replace(/[A-Z]/g,c=>c.toLowerCase());
 const normalize=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').toLowerCase();
 function prose(answer){
  return String(answer).replace(/```([^\n`]*)\n([\s\S]*?)```/g,(all,language,body)=>/^\s*(?:text|plaintext)?\s*$/i.test(language)&&!/^\s*(?:SELECT|WITH|CREATE|ALTER|INSERT|UPDATE|DELETE)\b/i.test(body)?body:' '.repeat(all.length))
   .replace(/^\s*>.*$/gm,m=>' '.repeat(m.length))
   .replace(/`\s*\.\s*`/g,'.')
   .replace(/`([^`\n]*)`/g,(all,body)=>/^\s*(?:SELECT|WITH|CREATE|ALTER|INSERT|UPDATE|DELETE|PRAGMA)\b/i.test(body)?' '.repeat(all.length):' '+body+' ');
 }
 function references(answer){
  const text=prose(answer),identifier='(?:"(?:[^"\\n]|"")*"|\\[[^\\]\\n]+\\]|[\\p{L}_][\\p{L}\\p{N}_$]*)';
  const expression=new RegExp('('+identifier+')\\.('+identifier+')(?:[ \\t]*=[ \\t]*([+-]?\\d+(?:\\.\\d+)?))?','gu');
  const unquote=s=>s[0]==='"'?s.slice(1,-1).replace(/""/g,'"'):s[0]==='['?s.slice(1,-1):s;
  return [...text.matchAll(expression)].filter(match=>!(match[2][0]==='"'&&/^\s|\s$/.test(unquote(match[2])))).map(match=>{
   const line=text.slice(text.lastIndexOf('\n',match.index)+1,text.indexOf('\n',match.index)<0?text.length:text.indexOf('\n',match.index));
   const prior=text.slice(Math.max(0,text.lastIndexOf('\n',match.index)-120),match.index);
   return {table:unquote(match[1]),column:unquote(match[2]),value:cells.claim(match[3]),snippet:line.trim().slice(0,240),context:normalize(line),prior:normalize(prior)};
  });
 }
 function review(answer,evidence,request=''){
  const tables=new Map((evidence.tables||[]).map(t=>[fold(t.table),t])),samples=new Map((evidence.samples||[]).map(s=>[fold(s.table),s])),issues=[];
  const wantsCurrent=/\b(?:current(?:ly)?|actual|real|stored|existing)\b|guncel|mevcut|gercek|su an/.test(normalize(request));
  for(const ref of references(answer)){
   const table=tables.get(fold(ref.table));if(!table)continue;
   const negative=/does not exist|doesn't exist|no such column|has no (?:such )?column|nonexistent|unknown column|invalid (?:column|identifier)|no longer|not present|mevcut degil|bulunmuyor|tan(?:imli degil|imlanmamis)|\byok(?:tur)?\b|hata(?:li)? (?:sutun|alan)|yanlis (?:sutun|alan)/.test(ref.context);
   const historical=/\b(?:previously|used to|old schema|before (?:the )?(?:change|update))\b|eski sema|degisiklikten once|guncellemeden once/.test(ref.context);
   const hypothetical=/\b(?:hypothetical(?:ly)?|suppose|imagine)\b|varsayimsal|varsayalim/.test(ref.context+' '+ref.prior);
   if(negative||historical||hypothetical)continue;
   const column=table.columns.find(c=>fold(typeof c==='string'?c:c.name)===fold(ref.column));
   if(!column){issues.push({kind:'unknown-column',table:table.table,column:ref.column,actualColumns:table.columns.map(c=>typeof c==='string'?c:c.name),snippet:ref.snippet});continue;}
   const sample=samples.get(fold(table.table));
   const claimsCurrent=wantsCurrent||/\b(?:current(?:ly)?|actual|real)\b|guncel|mevcut|gercek/.test(ref.context+' '+ref.prior);
   if(ref.value===undefined||!claimsCurrent||!sample?.sampleRowsComplete||sample.truncatedColumns?.includes(ref.column))continue;
   const name=typeof column==='string'?column:column.name;
   const values=sample.sampleRows.map(r=>r[name]);
   // Numeric claims only: avoid guessing SQLite affinity, TEXT collation or truncated values.
   if(!/INT|REAL|NUM|DEC|DOUBLE|FLOAT/i.test(column.type||'')||values.some(v=>v!==null&&cells.numericKey(v)===null))continue;
   if(!values.some(v=>v!==null&&cells.numericKey(v)===cells.numericKey(ref.value)))issues.push({kind:'missing-current-value',table:table.table,column:name,value:ref.value,sampleRowsComplete:true,currentValues:[...new Set(values)],snippet:ref.snippet});
  }
  issues.push(...directionIssues(answer,evidence));
  issues.push(...deletionIssues(answer,evidence,request));
  issues.push(...keyColumnIssues(answer,evidence));
  issues.push(...(physical?.review(answer,evidence)||[]));
  return issues.filter((issue,index,all)=>all.findIndex(x=>JSON.stringify(x)===JSON.stringify(issue))===index);
 }
 function keyColumnIssues(answer,evidence){
  if(evidence?.columnInventoryComplete!==true)return [];
  const known=new Set((evidence.tables||[]).flatMap(t=>(t.columns||[]).map(c=>fold(typeof c==='string'?c:c.name))));
  if(!known.size)return [];
  const reserved=new Set('NULL INTEGER INT BIGINT REAL FLOAT DOUBLE NUMERIC DECIMAL TEXT VARCHAR CHAR BLOB BOOLEAN BOOL DATE DATETIME TIMESTAMP PRIMARY FOREIGN UNIQUE KEY REFERENCES AUTOINCREMENT ROWID _ROWID_ OID'.toLowerCase().split(' '));
  const raw=String(answer),aliases=new Set();
  for(const block of raw.matchAll(/```[^\n`]*\n([\s\S]*?)```/g))for(const alias of block[1].matchAll(/\bAS\s+(?:"([^"]+)"|\[([^\]]+)\]|([\p{L}_][\p{L}\p{N}_$]*))/giu))aliases.add(fold(alias[1]||alias[2]||alias[3]));
  const text=raw.replace(/```[^\n`]*\n[\s\S]*?```/g,m=>' '.repeat(m.length)).replace(/^\s*>.*$/gm,m=>' '.repeat(m.length)),issues=[];
  let prior='';
  for(const clause of text.split(/(?<=[.!?;])\s+|\n/)){
   const earlier=prior;prior=(prior+' '+clause.replace(/`[\p{L}_][\p{L}\p{N}_$]*`/gu,' ')).slice(-240);
   const n=normalize(clause.replace(/`[\p{L}_][\p{L}\p{N}_$]*`/gu,' '));
   if(!/\b(?:primary|foreign)\s+key\b|birincil\s+anahtar|yabanci\s+anahtar/.test(n)||!/\b(?:columns?|fields?)\b|sutun|alan/.test(n))continue;
   if(/\b(?:if|unless|suppose|hypothetical|imagine|previously|old|before|could|would|might|alias|cte|query|result|report|json|metadata|not|no|missing|unknown|nonexistent)\b|varsay|ornegin|eski|once|eger|olabilir|olsaydi|sorgu|rapor|sonuc|cikti|takma|yok|degil|bulunm|yanlis|hata/.test(n))continue;
   if(/\b(?:suppose|hypothetical|imagine|previously|old\s+schema|before\s+(?:the\s+)?change)\b|varsay|eski\s+sema|degisiklikten\s+once/.test(normalize(earlier)))continue;
   for(const m of clause.matchAll(/`([\p{L}_][\p{L}\p{N}_$]*)`/gu)){
    const name=fold(m[1]);if(known.has(name)||reserved.has(name)||aliases.has(name)||(evidence.tables||[]).some(t=>fold(t.table)===name))continue;
    issues.push({kind:'unknown-physical-key-column',column:m[1],scope:'This asserted key column does not exist in the complete current main-table column inventory; no table or spelling correction inferred',snippet:clause.trim().slice(0,350)});
   }
  }
  return issues.filter((x,i,a)=>a.findIndex(y=>JSON.stringify(y)===JSON.stringify(x))===i);
 }
 function directionIssues(answer,evidence){
  const facts=evidence.facts||[],issues=[],identifier='[\\p{L}_][\\p{L}\\p{N}_$]*(?:\\.[\\p{L}_][\\p{L}\\p{N}_$]*)?';
  const arrows=new RegExp('('+identifier+')[ \\t]*([─═-]*>|→|<[─═-]*|←)[ \\t]*('+identifier+')','gu');
  for(const {line:raw} of physical.assertionLines(answer,{textDiagrams:true})){
   const line=raw.replace(/`/g,'');
   for(const match of line.matchAll(arrows)){
    let from=match[1],to=match[3];if(match[2].includes('<')||match[2]==='←')[from,to]=[to,from];
    const split=part=>{const [table,column]=part.split('.');return {table,column};},a=split(from),b=split(to);
    const matches=(fact,child,parent)=>fold(fact.child)===fold(child.table)&&fold(fact.parent)===fold(parent.table)&&(!child.column&&!parent.column||fact.columns.some(c=>(!child.column||fold(c.childColumn)===fold(child.column))&&(!parent.column||fold(c.parentColumn||'')===fold(parent.column))));
    if(facts.some(f=>matches(f,a,b)))continue;
    const reverse=facts.filter(f=>matches(f,b,a));
    if(reverse.length)issues.push({kind:'reversed-physical-fk-arrow',from,to,actualChild:reverse[0].child,actualParent:reverse[0].parent,columns:reverse.map(f=>f.columns),snippet:raw.trim().slice(0,240)});
   }
  }return issues;
 }
 function deletionIssues(answer,evidence,request){
  if(!/delet|sil(?:me|mek|mekle|in|erse|ince)/.test(normalize(request)))return [];
  const facts=evidence.facts||[],names=[...new Set(facts.flatMap(f=>[f.child,f.parent]))],issues=[];
  // Cascades or triggers can remove/rewrite a would-be blocker in the same statement.
  // This local proof deliberately declines those interactions rather than guessing.
  if(evidence.hasTriggers!==false)return [];
  const mentions=(text,name)=>new RegExp('(^|[^\\p{L}\\p{N}_$])'+fold(name).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?=$|[^\\p{L}\\p{N}_$])','u').test(fold(text));
  for(const clause of prose(answer).split(/(?<=[.!?;])\s+|\n/)){
   const text=normalize(clause);
   if(!/\b(?:only|sole|yalniz|sadece)\b|\btek\s+engel/.test(text)||!/\b(?:blocks?|blockers?|prevents?|rejects?)\b|engel (?:olustur|olabilir)|engeller|engelleyebilir/.test(text))continue;
   // Conditional/current-row exclusions are not universal schema assertions.
   if(/\b(?:if|unless|currently|current|now|not only|but also)\b|\b(?:eger|su an|mevcut kayit|bu kayit|degil|baska|ornegin|once)\b/.test(text))continue;
   const children=names.filter(name=>mentions(clause,name)&&facts.some(f=>fold(f.child)===fold(name)));if(children.length!==1)continue;
   const child=children[0],parents=[...new Set(facts.filter(f=>fold(f.child)===fold(child)&&['NO ACTION','RESTRICT'].includes(f.parentDelete)).map(f=>f.parent))];
   const candidates=parents.filter(parent=>mentions(request,parent)&&facts.filter(f=>fold(f.parent)===fold(parent)).every(f=>['NO ACTION','RESTRICT'].includes(f.parentDelete))).map(parent=>({parent,other: [...new Set(facts.filter(f=>fold(f.parent)===fold(parent)&&fold(f.child)!==fold(child)&&['NO ACTION','RESTRICT'].includes(f.parentDelete)).map(f=>f.child))]})).filter(c=>c.other.length);
   // Do not infer the subject when multiple requested parents could fit.
   if(candidates.length===1)issues.push({kind:'exclusive-deletion-blocker',parent:candidates[0].parent,claimedOnlyChild:child,otherPotentialBlockers:candidates[0].other,scope:'Schema-level possibility, not proof of blockers for a particular row or complete cascade/trigger behavior',snippet:clause.trim().slice(0,300)});
  }return issues;
 }
 function fallback(evidence,locale){
  const en=locale==='en',cell=s=>'`'+cells.text(s).replace(/`/g,'\\`').replace(/\|/g,'\\|').replace(/[\r\n]/g,' ')+'`';
  const text=[en?'Some relationship claims did not match the current database. These relationships are verified from the current schema:':'Bazı ilişki açıklamaları güncel veritabanıyla uyuşmadı. Güncel şemadan doğrulanmış ilişkilere bakalım:','',
   en?'A foreign key (FK) is stored on the child and references a parent key. An optional FK may be NULL; populated examples do not make it mandatory.':'Yabancı anahtar (FK), çocuk tabloda tutulur ve ebeveynin anahtarına referans verir. İsteğe bağlı FK NULL olabilir; örneklerin dolu olması alanı zorunlu yapmaz.','',
   en?'| Child FK tuple | Parent key tuple | Can a component be NULL? | Parent deletion action |':'| Çocuk FK tupleı | Ebeveyn anahtar tupleı | Bileşen NULL olabilir mi? | Ebeveyn silme eylemi |','|---|---|---|---|'];
  for(const f of evidence.facts||[]){const child=f.columns.map(c=>cell(f.child+'.'+c.childColumn)).join(' + '),parent=f.columns.map(c=>c.parentColumn===null?'?':cell(f.parent+'.'+c.parentColumn)).join(' + ');text.push('| '+child+' | '+parent+' | '+(f.columns.some(c=>!c.childNotNull)?en?'Not established by this summary':'Bu özetten belirlenemez':en?'No':'Hayır')+' | '+cell(f.parentDelete)+' |');}
  if(evidence.facts?.some(f=>f.columns.some(c=>!c.childNotNull)))text.push('',en?'The absence of a NOT NULL/primary-key restriction alone does not prove that NULL is allowed. CHECK constraints, triggers and connection settings also matter.':'NOT NULL veya birincil anahtardan kaynaklanan bir yasağın olmaması, tek başına NULL izni anlamına gelmez. CHECK kısıtları, tetikleyiciler ve bağlantı ayarları da değerlendirilmelidir.');
  if(!evidence.facts?.length)text.push(en?'There are no declared foreign keys in this scope. Similar column names alone do not prove a relationship.':'Bu kapsamda tanımlı yabancı anahtar yok. Benzer sütun isimleri tek başına ilişki kanıtı değildir.');
  text.push('',en?'The arrow is child → parent. Reverse cardinality also depends on child PK/UNIQUE constraints. In a composite FK, any NULL component disables the SQLite match; match all components together.':'Ok çocuk → ebeveyn yönündedir. Ters yöndeki çokluk, çocuğun PK/UNIQUE kısıtlarına da bağlıdır. Bileşik FKde herhangi bir bileşenin NULL olması SQLite eşleştirmesini devre dışı bırakır; bütün bileşenleri birlikte eşleştir.','',
   en?'CASCADE deletes matching children, SET NULL clears their FK fields and SET DEFAULT applies declared defaults. NO ACTION or RESTRICT can reject a referenced parent change. Other constraints and triggers may also reject it; an action name alone does not guarantee success.':'CASCADE eşleşen çocukları siler; SET NULL çocuk FK alanlarını NULL yapar, SET DEFAULT tanımlı varsayılanları uygular. NO ACTION veya RESTRICT, referans verilen ebeveynin değişikliğini reddedebilir. Diğer kısıtlar ve triggerlar da işlemi reddedebilir; eylem adı tek başına başarı garantisi değildir.');
  for(const s of evidence.samples||[]){text.push('','**'+String(s.table).replace(/[*|]/g,'')+'** — '+(en?'current examples':'güncel örnekler')+' ('+(s.sampleRowsComplete?en?'all rows':'tüm satırlar':en?'partial sample':'kısmi örnek')+')','');
   const columns=s.sampleColumns||[];if(!columns.length||!s.sampleRows.length){text.push(en?'No current sample rows.':'Güncel örnek satır yok.');continue;}
   text.push('| '+columns.map(cell).join(' | ')+' |','| '+columns.map(()=>'---').join(' | ')+' |');for(const r of s.sampleRows)text.push('| '+columns.map(c=>cell(r[c]===null?'NULL':r[c])).join(' | ')+' |');
   if(s.truncatedColumns?.length)text.push(en?'Long values are abbreviated in these examples.':'Bu örneklerde uzun değerler kısaltılmıştır.');
  }return text.join('\n');
 }
 return {review,references,fallback,directionIssues,deletionIssues,keyColumnIssues,correctPhysicalArrows:(answer,evidence)=>physical?.correct(answer,evidence)||{answer,changed:false,correctedLines:0}};
});
