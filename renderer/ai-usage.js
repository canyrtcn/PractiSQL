/* Numeric usage only, in memory. No messages, API keys or account data. */
(function(root){
  'use strict';
  const entries=[],attempts=[];
  function clean(usage){
    if(!usage||typeof usage!=='object')return null;
    const out={};
    for(const key of ['input_tokens','output_tokens','prompt_tokens','completion_tokens','total_tokens','cache_creation_input_tokens','cache_read_input_tokens'])if(Number.isFinite(usage[key])&&usage[key]>=0)out[key]=usage[key];
    for(const key of ['input_tokens_details','output_tokens_details','prompt_tokens_details','completion_tokens_details']){
      const value=usage[key];if(value&&typeof value==='object'){const details={};for(const k of ['cached_tokens','reasoning_tokens'])if(Number.isFinite(value[k])&&value[k]>=0)details[k]=value[k];if(Object.keys(details).length)out[key]=details;}
    }
    return Object.keys(out).length?out:null;
  }
  function record(usage,model,provider){entries.push({model,provider,reportedUsage:clean(usage)});if(entries.length>128)entries.shift();}
  function recordAttempt(value){
    const purpose=['answer','sql-repair','sql-quote-repair','format-recovery','operation-repair','teaching-repair','exam-generation','exam-grading','project-review','connection-test','context-compaction'].includes(value.purpose)?value.purpose:'other';
    const retry=['output-budget','temperature','capacity','empty','transport','context-read'].includes(value.retry)?value.retry:null;
    attempts.push({model:String(value.model||'').slice(0,100),provider:String(value.provider||'').slice(0,24),transport:['chat','messages','responses','chatgpt'].includes(value.transport)?value.transport:'other',purpose,retry,status:Number.isInteger(value.status)&&value.status>=100&&value.status<=599?value.status:null,failed:!!value.failed,elapsedMs:Number.isFinite(value.elapsedMs)&&value.elapsedMs>=0?value.elapsedMs:null,timing:value.transport==='chatgpt'?'rpc-completion':'response-headers'});
    if(attempts.length>128)attempts.shift();
  }
  const api={clean,record,recordAttempt,attempts:()=>attempts.map(e=>({...e})),snapshot:()=>entries.map(e=>({...e,reportedUsage:e.reportedUsage?JSON.parse(JSON.stringify(e.reportedUsage)):null}))};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.AiUsage=api;
})(typeof window!=='undefined'?window:globalThis);
