// Bounded explicit request limits and hints. Unknown natural language is left
// to the teacher; a creation/editing verb alone never requires a SQL write.
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RequestActionPolicy=api;})(typeof globalThis==='object'?globalThis:this,function(){
 const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').toLowerCase();
 function requestsResults(request){
  const text=normalize(request);
  // Polite interrogatives can request a result; explanations and negative
  // imperatives must not become commands just because they mention a verb.
  if(/^(?:(?:lutfen|please)\s+)?(?:explain|describe|why|what\s+(?:is|does)|how\s+does|acikla[a-z]*|anlat[a-z]*|neden|nasil\s+(?:calis|isle))[a-z]*\b/.test(text))return false;
  const politeTr=/\b(?:getir(?:ir|ebilir)|goster(?:ir|ebilir)|listele(?:r|yebilir)|hesapla(?:r|yabilir)|raporla(?:r|yabilir)|sirala(?:r|yabilir)|say(?:ar|abilir))\s+mi(?:sin(?:iz)?)\b/;
  const directTr=/\b(?:getir(?:in|iniz|sene|sana|elim)?|goster(?:in|iniz|sene|sana|elim)?|listele(?:yin|yiniz|sene|sana|yelim)?|hesapla(?:yin|yiniz|sene|sana|yalim)?|raporla(?:yin|yiniz|sene|sana|yalim)?|sirala(?:yin|yiniz|sene|sana|yalim)?)\b/;
  const politeEn=/\b(?:can|could|would|will)\s+you\s+(?:please\s+)?(?:return|show|list|display|fetch|retrieve|calculate|count|report)\b/;
  if(politeTr.test(text)||politeEn.test(text))return true;
  return directTr.test(text)&&! /\b(?:ne\s+demek|ne\s+ise\s+yarar|nedir)\b/.test(text);
 }
 function reportEditOnly(request){
  const text=normalize(request);
  // Mixed requests and physical DDL/data requests retain the existing write classification.
  if(/\b(?:insert\s+into|update\s+[^.!?;]{1,70}\bset|delete\s+from|(?:create|alter|drop)\s+(?:table|view|index|trigger))\b/.test(text))return false;
  const clauses=text.split(/(?:[.!?;]|\b(?:then|and then|but|sonra|ardindan|ama|fakat)\b)+/).map(c=>c.trim()).filter(c=>{
   if(!c)return false;
   const operations=c.match(/\b(?:add|remove|update|change|modify|set|insert|delete|drop|alter|create|ekle[a-z]*|guncelle[a-z]*|degistir[a-z]*|sil[a-z]*|olustur[a-z]*)\b/g)||[];
   if(operations.length!==1)return true;
   const negativeEnglish=/^(?:please\s+)?(?:do\s+not|don't|dont|never)\s+(?:change|modify|update|delete|remove|insert|alter|drop|create)\b/.test(c);
   const negativeTurkish=/^(?:lutfen\s+)?(?:veri[a-z]*|veritaban[a-z]*|tablo[a-z]*|kayit[a-z]*)\s+[^.!?;]*\b(?:degistirme|guncelleme|silme|ekleme)(?:yin|yiniz)?$/.test(c);
   return !negativeEnglish&&!negativeTurkish;
  });
  if(/\b(?:insert|delete|drop|alter|olustur[a-z]*|sil[a-z]*)\b/.test(clauses.join(' ')))return false;
  const report=/\b(?:report|query|result|output|projection|rapor[a-z]*|sorgu[a-z]*|sonuc[a-z]*|cikti[a-z]*)\b/;
  const editing=/\b(?:add|remove|update|change|modify|set|rewrite|include|exclude|ekle[a-z]*|cikar[a-z]*|guncelle[a-z]*|degistir[a-z]*)\b/;
  const physical=/\b(?:rows?|records?|stored|tables?|databases?|id|keys?|tablo[a-z]*|veritaban[a-z]*|kayit[a-z]*)\b/;
  // Two edits plus a physical target in one unsplit clause are ambiguous/mixed,
  // e.g. add a report rank AND change a stored balance. Never erase the latter.
  if(clauses.some(c=>physical.test(c)&&(c.match(new RegExp(editing.source,'g'))||[]).length>1))return false;
  // Target nearest the edit comes first: "remove ... query result, not ... database"
  // is not a physical deletion. A later explicit write still blocks the exception below.
  const reportRemoval=/\bremove\b(?:(?!\b(?:tables?|databases?|stored)\b)[^.!?;]){0,100}\b(?:rows?|records?)\b[^.!?;]{0,40}\bfrom\s+(?:the\s+|this\s+)?(?:report|query\s+result|result|output)\s*$/;
  if(clauses.some(c=>editing.test(c)&&physical.test(c)&&(c.search(report)<0||c.search(physical)<c.search(report))&&!reportRemoval.test(c)))return false;
  const edits=clauses.filter(c=>editing.test(c));
  if(!edits.length||!edits.every(c=>report.test(c)))return false;
  // If another clause introduces a separate physical write, do not flatten it into a report edit.
  if(clauses.some(c=>!edits.includes(c)&&/\b(?:insert|create|delete|drop|alter|ekle[a-z]*|olustur[a-z]*|sil[a-z]*|guncelle[a-z]*)\b/.test(c)))return false;
  return true;
 }
 function readOnlyRequested(request){const limits=typeof module==='object'&&module.exports?require('./explicit-request-limits.js'):globalThis.ExplicitRequestLimits;return limits.inspect(request).readOnly.length>0;}
 function storageHint(request){
  const text=normalize(request);
  if(readOnlyRequested(request))return false;
  // No broad verb fallback, no CTE-specific exception, no inferred domain names.
  // Hints only select optional context; they NEVER require or authorize a write.
  const clauses=text.split(/(?:[.!?;]|\b(?:and\s+then|then|and|but|ve|sonra|ardindan|ama|fakat)\b)+/);
  const output=/\b(?:report|query|result|output|projection|list|summary|answer|explanation|cte|common\s+table\s+expression|rapor[a-z]*|sorgu[a-z]*|sonuc[a-z]*|cikti[a-z]*|liste[a-z]*|ozet[a-z]*|aciklama[a-z]*)\b/;
  const physical=/\b(?:stored|rows?|records?|tables?|databases?|schema|tablo[a-z]*|veritaban[a-z]*|kayit[a-z]*|satir[a-z]*)\b/;
  return clauses.some(raw=>{
   const c=raw.trim().replace(/^(?:(?:please|now|lutfen|simdi)\s+)+/,'');
   if(!c||/^(?:explain|describe|why|what|how|acikla[a-z]*|anlat[a-z]*|neden|nasil|(?:do\s+not|don't|dont|never)\b)/.test(c))return false;
   if(/^(?:insert\s+(?:or\s+\w+\s+)?into|delete\s+from|update\s+\S+\s+set|(?:create|alter|drop)\s+(?:temp(?:orary)?\s+)?(?:table|view|index|trigger))\b/.test(c))return true;
   if(output.test(c))return false;
   if(/^insert\b/.test(c))return true;
   const english=/^(?:(?:could|can|would)\s+you\s+)?(?:add|update|delete|remove|create|alter|change|move|set)\b/.test(c);
   const turkish=/\b(?:ekle(?:yin|yiniz|yelim|sene|r\s+misin)?|guncelle(?:yin|yiniz|yelim|sene)?|olustur(?:un|unuz|alim|sene)?|kur(?:un|unuz|alim)?|sil(?:in|iniz|elim)?|degistir(?:in|iniz|elim)?)\b/.test(c);
   const identifiedRecord=/\b(?:of|for)\s+(?:[a-z_]+\s+){1,3}\d+\b/.test(c);
   return (english||turkish)&&(physical.test(c)||english&&identifiedRecord);
  });
 }
 function requiredEffect(mode,sourceWrites=false){
  // These modes come from explicit UI controls, not inferred natural language.
  return mode==='seed'||mode==='build'||mode==='fix'&&sourceWrites?'write':null;
 }
 return {reportEditOnly,storageHint,requestsResults,readOnlyRequested,requiredEffect};
});
