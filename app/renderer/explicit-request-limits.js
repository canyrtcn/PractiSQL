/* Explicit, whole-clause limits. This is not a task/intent classifier.
 * Unknown, scoped, conditional or quoted language remains the model's input.
 * Return the exact source clause as evidence; never paraphrase it as a new task.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ExplicitRequestLimits=api;})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').toLowerCase().replace(/\s+/g,' ').trim();
 function clauses(request){
  const text=String(request||''),result=[];let start=0,quote=null,fence=null,tainted=false;
  const finish=end=>{const source=text.slice(start,end).trim();if(source&&!tainted)result.push({source,text:normalize(source)});start=end+1;tainted=!!quote||!!fence;};
  for(let i=0;i<text.length;i++){
   const c=text[i],next=text[i+1];
   if(fence){tainted=true;if(text.startsWith(fence,i)){i+=fence.length-1;fence=null;}continue;}
   if(quote){tainted=true;if(c==='\\'){i++;continue;}if(c===quote)quote=null;continue;}
   const mark=/^(`{3,}|~{3,})/.exec(text.slice(i));if(mark){fence=mark[1];tainted=true;i+=mark[1].length-1;continue;}
   if(c==='`'||c==='"'||c==='“'||c==='‘'||c==='\''&&!/[\p{L}\p{N}]/u.test(text[i-1]||'')){quote=c==='“'?'”':c==='‘'?'’':c;tainted=true;continue;}
   // A quoted/example line is evidence, not a control. Qualified names and
   // decimals do not split a clause; neither do coordinating words like "but".
   if(c==='>'&&/^\s*$/.test(text.slice(start,i)))tainted=true;
   if(/[;\n!?]/.test(c)||c==='.'&&(!next||/\s/.test(next)))finish(i);
  }
  finish(text.length);return result;
 }
 const stripPolite=s=>s.replace(/^(?:(?:please|lutfen|simdilik|for now)\s+)+/,'');
 const readOnly=/^(?:veri(?:yi|leri)?\s+(?:(?:hic|asla)\s+)?degistirme(?:yin|yiniz)?|veri\s+degismesin|veriler?\s+ayni\s+kalsin|veri(?:ye|lere)\s+dokunma|sadece\s+raporla|(?:do\s+not|don't|dont|never)\s+(?:change|modify|alter)\s+(?:(?:any|stored)\s+)?(?:data|records)|(?:keep\s+)?(?:the\s+)?(?:database|stored\s+data|all\s+data)\s+unchanged|report\s+only)$/;
 const noRun=/^(?:(?:do\s+not|don't|dont|never)\s+(?:run|execute)(?:\s+(?:(?:any|the|this|that|these)\s+)?(?:sql|queries|query|code|commands?|it))?|(?:(?:hicbir|bu)\s+)?(?:sql|sorguyu|sorgulari|kodu)?\s*calistirma(?:yin|yiniz)?|(?:sadece|yalnizca)\s+(?:acikla|anlat)|(?:explain|describe)\s+only|only\s+(?:explain|describe))$/;
 const preserve=/^(?:(?:keep|preserve)\s+(?:(?:all|every|the)\s+)?(?:old|existing)\s+(?:data|rows?|records?|values?)(?:\s+unchanged)?|eski\s+(?:verileri|kayitlari|degerleri)\s+koru|eski\s+(?:veriler|kayitlar|degerler)\s+ayni\s+kalsin)$/;
 function inspect(request){
  const parts=clauses(request),match=re=>parts.filter(c=>re.test(stripPolite(c.text))).map(c=>c.source);
  const preserveExisting=[];
  for(const c of parts){
   if(preserve.test(stripPolite(c.text))){preserveExisting.push(c.source);continue;}
   // A terminal, unqualified preservation command may follow a conjunction.
   // Scoped objects, exceptions, quotations and conditional clauses do not
   // authorize a whole-database snapshot. Do not infer an additive task.
   if(/^(?:if|unless|when|provided|assuming|eger|sayet)\b/.test(stripPolite(c.text)))continue;
   const tail=c.source.split(/\s+(?:and|ve)\s+/iu).at(-1);
   if(tail!==c.source&&preserve.test(stripPolite(normalize(tail))))preserveExisting.push(tail.trim());
  }
  return {readOnly:match(readOnly),noRun:match(noRun),preserveExisting};
 }
 function execution(request){
  // Global execution gates require an explicit, unqualified instruction.
  // Quoted examples, history, conditions and a prohibition on one named
  // operation stay in the unchanged model input; they do not veto the turn.
  const parts=clauses(request).map(c=>({...c,text:stripPolite(c.text)
   .replace(/^(?:ama|fakat|but)\s+/,'').replace(/,?\s+(?:please|lutfen)$/,'')}));
  const directNoRun=/^(?:(?:do\s+not|don't|dont|never)\s+(?:run|execute)(?:\s+(?:anything|it|this|that|these|them))?|(?:bunu|sunu|hicbir\s+seyi|sql['’]i)\s+calistirma(?:yin|yiniz)?)$/;
  const withoutExecution=/^(?:(?:show|write|explain|describe)\s+(?:(?:me|the|this|a)\s+)*(?:sql|query|code)\s+without\s+(?:running|executing)(?:\s+it)?|(?:sql(?:['’]i)?|sorguyu|kodu)\s+calistirmadan\s+(?:sadece\s+)?(?:goster|yaz|acikla|anlat))$/;
  const questions=/^(?:(?:only\s+(?:the\s+)?questions|questions\s+first)(?:\s+(?:please))?|(?:do\s+not|don't|dont)\s+(?:give|show|provide)\s+(?:the\s+)?(?:answers|solutions)|(?:sadece|yalnizca)\s+soru(?:lari|lar)?(?:\s+(?:ver|goster|hazirla))?|once\s+soru(?:lari|lar)?(?:\s+(?:ver|goster|hazirla))?(?:,?\s+cozumleri\s+ben\s+isteyince\s+(?:ver|goster))?|cozumleri\s+(?:verme|gosterme))$/;
  const askBefore=/^(?:(?:ask|clarify)(?:\s+(?:me|first))?\s+before\s+(?:applying|running|executing|changing|updating|deleting)(?:\s+(?:the\s+)?(?:changes|sql|query|code|data|it))?|(?:uygulamadan|calistirmadan|degistirmeden|guncellemeden|silmeden)\s+once\s+(?:bana\s+)?(?:sor|netlestir))$/;
  const executionDenied=s=>noRun.test(s)||directNoRun.test(s)||withoutExecution.test(s);
  const writingOnly=/^(?:(?:show|write|prepare)\s+(?:(?:me|the|this|a)\s+)*(?:sql|query|code)\s+(?:but|and)|(?:bana\s+)?(?:sql(?:['’]i)?|sorguyu|kodu)\s+(?:yaz|goster|hazirla)\s+(?:ama|fakat|ve))\s+/;
  return {noRun:parts.filter(c=>executionDenied(c.text)||writingOnly.test(c.text)&&executionDenied(c.text.replace(writingOnly,''))).map(c=>c.source),questionsFirst:parts.filter(c=>questions.test(c.text)||askBefore.test(c.text)).map(c=>c.source)};
 }
 function keyMigration(request){
  // A key move can change its declared FK descendants. Freezing every other
  // stored field requires an explicit global limit, not a mention of keeping
  // one table/relationship or a quoted/conditional example. Unknown language
  // remains the model's task; this does not infer the intended SQL operation.
  const otherFields=/^(?:(?:change|modify|alter)\s+no\s+other\s+(?:(?:record|row)s?\s+or\s+)?(?:field|column)s?|(?:do\s+not|don't|dont)\s+(?:change|modify|alter)\s+(?:any\s+)?other\s+(?:(?:record|row)s?\s+or\s+)?(?:field|column)s?|(?:(?:keep|leave|preserve)\s+)?(?:all\s+)?(?:the\s+)?other\s+(?:(?:record|row)s?\s+(?:and|or)\s+)?(?:field|column)s?\s+unchanged|(?:baska|diger)\s+(?:(?:kayit|satir)(?:lar)?\s+(?:veya|ve)\s+)?(?:alan|sutun)(?:lar)?\s+(?:degismesin|ayni\s+kalsin)|(?:baska|diger)\s+(?:(?:kayit|satir)(?:lari)?\s+(?:veya|ve)\s+)?(?:alan|sutun)(?:lari)?\s+(?:degistirme|koru))$/;
  const global=[];
  for(const c of clauses(request)){
   const text=stripPolite(c.text).replace(/,?\s+(?:please|lutfen)$/,'');
   if(otherFields.test(text)){global.push(c.source);continue;}
   // A terminal global limit can be coordinated with a positive preservation
   // instruction, e.g. "Keep links attached and other fields unchanged".
   if(!/^(?:keep|preserve)\b/.test(text))continue;
   const tail=text.split(/\s+and\s+/).at(-1);
   if(tail!==text&&otherFields.test(tail))global.push(c.source);
  }
  return {otherFieldsUnchanged:global};
 }
 return {inspect,clauses,execution,keyMigration};
});
