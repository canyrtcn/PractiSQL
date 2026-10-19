/* Factual UI sources. This module never decides which source a question refers to. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AiUiEvidence=api;})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  function excerpt(value,limit){const text=String(value??'');return {text:text.slice(0,limit),complete:text.length<=limit,characters:text.length};}
  function cell(value){
    if(value instanceof Uint8Array)return {blobBytes:value.byteLength};
    if(typeof value==='string'&&value.length>40)return {text:value.slice(0,40),complete:false,characters:value.length};
    return value;
  }
  function collect({editorSql,error,results=[],origin=()=>null,current}){
    const selected=results.slice(0,3).map((result,index)=>{
      const source=origin(result),columns=(result.columns||[]).slice(0,8),values=(result.values||[]).slice(0,10);
      return {displayIndex:index+1,origin:source?{database:source.database,scope:source.scope,chat:source.chat,revision:source.revision,
        sameScope:source.scope===current.scope,sameChat:source.chat===current.chat,sameRevision:source.scope===current.scope&&source.revision===current.revision,
        statement:source.statement?excerpt(source.statement,3000):null,batch:source.statement?undefined:excerpt(source.batch||'',3000),statementIndex:source.statementIndex}:null,
        columns,columnCount:(result.columns||[]).length,columnsComplete:columns.length===(result.columns||[]).length,
        rows:values.map(row=>row.slice(0,columns.length).map(cell)),displayedRowCount:(result.values||[]).length,rowsComplete:values.length===(result.values||[]).length,
        totalQueryRowCountKnown:false};
    });
    // Budget only samples, not provenance. Never leave a half-serialized row or
    // attach a sample to the editor buffer instead of its actual SQL source.
    const sampleSize=()=>JSON.stringify(selected.map(r=>({columns:r.columns,rows:r.rows}))).length;
    while(sampleSize()>1500&&selected.some(r=>r.rows.length)){
      const largest=selected.filter(r=>r.rows.length).sort((a,b)=>JSON.stringify(b.rows).length-JSON.stringify(a.rows).length)[0];largest.rows.pop();largest.rowsComplete=false;
    }
    return {current:{database:current.database,scope:current.scope,chat:current.chat,revision:current.revision},
      editorBuffer:{sql:excerpt(editorSql,3000),execution:'not_asserted'},
      lastError:error?{text:String(error),associatedSql:'unknown'}:null,
      displayedResults:selected,displayedResultCount:results.length,allDisplayedResultsIncluded:selected.length===results.length};
  }
  function render(evidence,language){
    const label=language==='tr'?'Arayüzdeki ayrı kaynaklar (gözlenen durum; güncel görev değildir). Editör metni çalıştırılmış olmayabilir. Sonuç örnekleri origin içindeki SQL’e aittir; güncel veritabanının tüm kayıtlarını veya mevcut editörün sonucunu temsil ettikleri varsayılmamalı. Kaynağı bilinmeyen hata editöre bağlanmamalı.':'Separate UI sources (observed state, not the current task). The editor buffer may not have run. Result samples belong to the SQL in origin; do not assume they represent all current database rows or the current editor result. Do not assign an error with unknown provenance to the editor.';
    return label+'\n'+JSON.stringify(evidence);
  }
  return {collect,render};
});
