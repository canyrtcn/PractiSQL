/* Actual captured result values, distinct from a small conversation preview. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OperationResults=api;})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const cells=typeof module==='object'&&module.exports?require('./sqlite-values.js'):globalThis.SqliteValues;
 const legacyNumericEvidence='Legacy numeric capture: SQLite integers outside the safe JavaScript range may have been rounded. Historical digits cannot be recovered from this archive; a new query is a separate observation.';
 function value(v){
  if(v instanceof Uint8Array)return {sqliteType:'blob',encoding:'hex',value:Array.from(v,b=>b.toString(16).padStart(2,'0')).join('')};
  if(typeof v==='number'&&!Number.isFinite(v))return {sqliteType:'real',value:String(v)};
  return v;
 }
 function capture(results,identity,origin=()=>null){return {version:1,valueEncoding:'sqlite-integer-text-v1',...identity,results:results.map((r,index)=>({index,columns:[...r.columns],values:r.values.map(row=>row.map(value)),rowCountExact:r.limited!==true,limited:r.limited===true,...(origin(r)||{})}))};}
 function preview(record){return {resultValueEncoding:record.valueEncoding,resultCount:record.results.length,resultsOmitted:Math.max(0,record.results.length-3),results:record.results.slice(0,3).map(r=>{let cellsComplete=true;const sample=r.values.slice(0,3).map(row=>row.map(v=>{if(cells.integerText(v)!==null||cells.realText(v)!==null)return v;if(v&&typeof v==='object'){cellsComplete=false;return v.sqliteType==='blob'?'[BLOB '+v.value.length/2+' bytes]':JSON.stringify(v);}if(typeof v==='string'&&v.length>100){cellsComplete=false;return v.slice(0,100)+'…';}return v;}));return {...(Number.isInteger(r.statementIndex)?{statementIndex:r.statementIndex}:{}),columns:r.columns,rows:r.values.length,rowCountExact:r.rowCountExact,limited:r.limited,sample,sampleComplete:r.values.length<=3&&cellsComplete&&r.rowCountExact};})};}
 function needsArchive(operation){return operation.resultsOmitted>0||(operation.results||[]).some(r=>r.sampleComplete!==true);}
 function context(operation){
  const {resultArchiveInline,resultArchive,...entry}=operation;
  if(resultArchive){entry.resultSource='result:'+entry.id;entry.resultEvidence=needsArchive(operation)?'Preview only; exact captured results are available through read_context. Results marked limited contain only rows returned by the application, not the entire SQL result.':'All captured result cells are included in this preview.';}
  else if(Array.isArray(entry.results)&&entry.resultCount===undefined){entry.resultEvidence='Legacy preview: additional result sets, rows, long text or BLOB values may not have been retained. Do not treat sampleComplete as proof of exact cells. Rerunning SQL would be a new observation, not recovery of the earlier result.';}
  if((entry.results?.length||resultArchive)&&!entry.resultValueEncoding)entry.numericEvidence=legacyNumericEvidence;
  return entry;
 }
 return {capture,preview,context,needsArchive,legacyNumericEvidence};
});
