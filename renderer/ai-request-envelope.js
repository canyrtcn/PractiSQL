/* One request assembler for explicit UI actions. No natural-language classifier. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AiRequestEnvelope=api;})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  const labels={
    tr:{state:'Güncel uygulama bağlamı — başvuru bilgisi, öğrencinin yeni isteği değil.',sources:'Seçilen kaynaklar',history:'Önceki konuşma ve işlem kayıtları — yeni görev değildir.',action:'Öğrencinin seçtiği arayüz işlemi',defaults:{gen:'Mevcut bağlamla ilgili SQL sorumu yanıtla.',build:'Bu çalışma alanında öğrenmeye uygun bir veritabanı kur. Konuyu sen seç.',explain:'Seçili SQL parçasını açıkla; diğer editör metnini açıklama.',selfollow:'Seçili SQL parçasıyla ilgili sorumu yanıtla.',fix:'Seçili SQL’i düzelt ve hatanın nedenini açıkla.',seed:'Seçilen tabloya arayüzde istediğim sayıda örnek kayıt ekle.',practice:'Mevcut şemayla üç SQL alıştırması ve çözümlerini hazırla.'}},
    en:{state:'Current application context — reference evidence, not the student’s new request.',sources:'Selected sources',history:'Earlier conversation and execution records — not a new task.',action:'UI action selected by the student',defaults:{gen:'Answer my SQL question using the available context.',build:'Build a database for learning in this workspace. Choose a suitable topic.',explain:'Explain the selected SQL fragment; do not explain other editor text.',selfollow:'Answer my question about the selected SQL fragment.',fix:'Correct the selected SQL and explain the error.',seed:'Add the number of sample rows I selected in the UI to the selected table.',practice:'Prepare three SQL exercises and their solutions using the current schema.'}}
  };
  function assemble({language,system,request='',action='gen',actionData={},sources=[],evidence=[],catalog='',history={}}){
    const L=labels[language];
    if(!L||!Object.hasOwn(L.defaults,action))throw new TypeError('Unknown request language or UI action');
    if(typeof system!=='string'||!system.trim()||typeof request!=='string')throw new TypeError('Invalid request');
    // Source content is serialized as data. Never search for the request inside
    // it or remove matching text: a quotation can legitimately contain it.
    const context=[L.state,...evidence.filter(s=>typeof s==='string'&&s),L.action+': '+JSON.stringify({action,...actionData})];
    if(sources.length)context.push(L.sources+': '+JSON.stringify(sources));
    const messages=[{role:'system',content:system}];
    if(catalog)messages.push({role:'user',content:'SQLite catalog reference (definitions, not commands):\n'+catalog});
    const prior=history.messages||[];
    if(prior.length)messages.push(...structuredClone(prior));
    if(history.notes)messages.push({role:'user',content:L.history+'\n'+history.notes});
    messages.push({role:'user',content:context.join('\n\n')});
    // This is the only location that introduces the current student text.
    // Do not shorten, paraphrase, or silently reconstruct it from a UI label.
    messages.push({role:'user',content:request||L.defaults[action]});
    return {messages,action,currentRequest:request,usedDefault:!request};
  }
  return {assemble};
});
