'use strict';
const Errors=require('./project-errors.js');
const {Worker}=require('node:worker_threads');
const path=require('node:path');
// A bounded optional prototype, not a natural-language router or normal chat guard.
// Source metadata/spec must come from the reviewed project record, not submission UI.
function runJob({download,spec,sql,plans,reports,database},{signal,prepareTimeoutMs=600000,sqlTimeoutMs=10000}={},operation){
 if(signal?.aborted)return Promise.reject(Error('PROJECT_REPORT_ABORTED'));
 if(![prepareTimeoutMs,sqlTimeoutMs].every(n=>Number.isSafeInteger(n)&&n>0))return Promise.reject(Error('PROJECT_REPORT_OPTIONS'));
 if(!(download?.bytes instanceof Uint8Array)||download.bytes.length>64*1024*1024)return Promise.reject(Error('PROJECT_REPORT_INPUT'));
 if(database!==undefined&&(!['assess','assess-batch'].includes(operation)||!(database instanceof Uint8Array)||!database.length||database.length>128*1024*1024))return Promise.reject(Error('PROJECT_WORKSPACE_INPUT'));
 if(operation==='assess'&&(typeof sql!=='string'||!sql.trim()||sql.length>100000))return Promise.reject(Error('PROJECT_REPORT_INPUT'));
 if(operation==='prepare-plans'&&(!Array.isArray(plans)||!plans.length||plans.length>8))return Promise.reject(Error('PROJECT_REPORT_INPUT'));
 if(operation==='assess-batch'&&(!Array.isArray(reports)||!reports.length||reports.length>8||new Set(reports.map(r=>r?.id)).size!==reports.length||reports.some(r=>typeof r?.id!=='string'||!r.id.trim()||typeof r.sql!=='string'||!r.sql.trim()||r.sql.length>100000)))return Promise.reject(Error('PROJECT_REPORT_INPUT'));
 return new Promise((resolve,reject)=>{
  const bytes=new Uint8Array(download.bytes),workspace=database===undefined?undefined:new Uint8Array(database);let worker;
  try{worker=new Worker(path.join(__dirname,'report-worker.cjs'),{workerData:{operation,download:{...download,bytes},spec,sql,plans,reports,database:workspace},transferList:[bytes.buffer,...(workspace?[workspace.buffer]:[])],resourceLimits:{maxOldGenerationSizeMb:512}});}catch(error){reject(error);return;}
  let done=false,timer;
  function finish(error,result){
   if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);
   // The result is a complete clone from a read-only workspace snapshot. Keep
   // cancellation and deadlines observable even if thread teardown is delayed.
   worker.unref();void worker.terminate().catch(()=>{});
   error?reject(error):resolve(result);
  }
  function abort(){finish(Error('PROJECT_REPORT_ABORTED'));}
  worker.once('error',error=>finish(Error(error.code==='ERR_WORKER_OUT_OF_MEMORY'?'PROJECT_REPORT_MEMORY':'PROJECT_REPORT_WORKER')));
  worker.once('exit',()=>{if(!done)finish(Error('PROJECT_REPORT_INCOMPLETE'));});
  worker.on('message',message=>{
   if(done)return;
   if(signal?.aborted){abort();return;}
   if(message?.phase==='sql'||message?.phase==='prepare'){clearTimeout(timer);const sqlPhase=message.phase==='sql';timer=setTimeout(()=>finish(Error(sqlPhase?'PROJECT_REPORT_TIMEOUT':'PROJECT_REPORT_PREPARE_TIMEOUT')),sqlPhase?sqlTimeoutMs:prepareTimeoutMs);return;}
   if(message?.ok&&message.result)finish(null,message.result);
   else finish(Errors.unpack({code:message?.code||'PROJECT_REPORT_FAILED',issues:message?.issues}));
  });
  timer=setTimeout(()=>finish(Error('PROJECT_REPORT_PREPARE_TIMEOUT')),prepareTimeoutMs);
  signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
 });
}
const assessSubmission=(input,options)=>runJob(input,options,'assess');
const assessReports=(input,options)=>runJob(input,options,'assess-batch');
const prepareReportPlans=(input,options)=>runJob(input,options,'prepare-plans');
module.exports={assessSubmission,assessReports,prepareReportPlans};
