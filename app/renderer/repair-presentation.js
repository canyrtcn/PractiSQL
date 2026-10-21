/* Presentation policy only: exact answers and execution evidence stay in history. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RepairPresentation=api;})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const normalize=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').toLowerCase();
 function wantsDiagnostics(request){
  const text=normalize(request);
  return /\b(debug|fix|repair|duzelt|calismiyor)\b/.test(text)||/\b(error|errors|bug|fail(?:ed|ure)?|hata(?:yi|nin|si|sini|lari)?|yanlis)\b/.test(text)&&/\b(explain|why|how|what|anlat|acikla|neden|niye|ne demek|nerede|sebep|analiz)\b/.test(text);
 }
 function instruction(request,language){
  if(wantsDiagnostics(request))return '';
  return language==='tr'?'Sunum kuralı: Bu otomatik düzeltme uygulamanın iç turudur. Nihai açıklamada öğrencinin asıl isteğini yanıtla ve verdiğin son SQL’i anlat. Önceki denemenin hatasını, hata mesajını, takma ad sorununu veya düzeltme adımlarını anlatan bir bölüm ekleme. Nihai SQL bloğu ve tüm çalıştırma kuralları aynen geçerlidir.':'Presentation rule: This automatic repair is an internal application turn. In the final explanation, answer the original student request and teach the final SQL. Do not add a section describing the previous attempt, its error message, alias mistake or repair steps. The final SQL block and all execution rules still apply unchanged.';
 }
 function display(text,{automatic=false,completed=false,request=''}={}){
  if(!automatic||!completed||wantsDiagnostics(request))return String(text||'');
  const lines=String(text||'').split('\n'),out=[];let skippedLevel=0,fence=null;
  for(const line of lines){
   const marker=/^\s*(`{3,}|~{3,})([^\s]*)/.exec(line);
   if(fence){if(!skippedLevel||fence.executable)out.push(line);if(marker&&marker[1][0]===fence.char&&marker[1].length>=fence.length&&!marker[2])fence=null;continue;}
   if(marker){fence={char:marker[1][0],length:marker[1].length,executable:/^(sql|sqlite|sql-no-repair)$/i.test(marker[2])};if(!skippedLevel||fence.executable)out.push(line);continue;}
   const heading=/^\s*(#{1,6})\s+(.+)$/.exec(line);
   if(heading){
    if(skippedLevel&&heading[1].length<=skippedLevel)skippedLevel=0;
    const title=normalize(heading[2]).replace(/[^a-z\s]/g,' ').trim();
    if(/^(?:neden hata|hatanin (?:nedeni|sebebi)|hata (?:nedeni|sebebi|aciklamasi)|onceki (?:hata|deneme)|what went wrong|why (?:the |it |this )?(?:error|failed|query failed)|(?:internal |automatic )?repair (?:details|explanation)|error (?:cause|explanation))\b/.test(title))skippedLevel=heading[1].length;
   }
   if(!skippedLevel)out.push(line);
  }
  return out.join('\n').trim();
 }
 return {display,instruction,wantsDiagnostics};
});
