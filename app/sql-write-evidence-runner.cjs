// A failed diagnosis is unavailable evidence, never SQL success or an intent verdict.
const {Worker}=require('node:worker_threads'),path=require('node:path');
async function diagnoseCopy(database,sql,{timeoutMs=3000,initTimeoutMs=30000,maxErrors=8,maxStatements=300,connection={},signal}={}){
 if(!(database instanceof Uint8Array)||database.length>64*1024*1024||typeof sql!=='string'||!sql.trim()||sql.length>1024*1024||!Number.isInteger(maxErrors)||maxErrors<1||maxErrors>16||!Number.isInteger(maxStatements)||maxStatements<1||maxStatements>1000||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>10000||!Number.isInteger(initTimeoutMs)||initTimeoutMs<1||initTimeoutMs>30000)return {ok:false,code:'DIAGNOSTIC_INPUT',error:'Invalid or oversized diagnostic input'};
 if(signal?.aborted)return {ok:false,code:'DIAGNOSTIC_CANCELLED',error:'Diagnostic cancelled'};
 const worker=new Worker(path.join(__dirname,'sql-write-evidence-worker.cjs'));let timer,onAbort;
 try{return await new Promise(resolve=>{
  let settled=false;const finish=result=>{if(settled)return;settled=true;clearTimeout(timer);resolve(result);};
  onAbort=()=>finish({ok:false,code:'DIAGNOSTIC_CANCELLED',error:'Diagnostic cancelled'});signal?.addEventListener('abort',onAbort,{once:true});
  timer=setTimeout(()=>finish({ok:false,code:'DIAGNOSTIC_INIT_TIMEOUT',error:'Diagnostic initialization timed out'}),initTimeoutMs);
  worker.on('message',m=>{if(settled)return;if(m.ready){clearTimeout(timer);timer=setTimeout(()=>finish({ok:false,code:'DIAGNOSTIC_TIMEOUT',error:'Diagnostic execution timed out'}),timeoutMs);worker.postMessage({database:new Uint8Array(database),sql,options:{maxErrors,maxStatements,connection}});}else finish(m);});
  worker.on('error',e=>finish({ok:false,code:'DIAGNOSTIC_WORKER',error:e.message}));worker.on('exit',()=>finish({ok:false,code:'DIAGNOSTIC_WORKER',error:'Diagnostic worker exited'}));
 });}finally{clearTimeout(timer);signal?.removeEventListener('abort',onAbort);await worker.terminate();}
}
function createEvidenceRunner(){
 const jobs=new Map();let disposed=false;
 return {
  execute(database,sql,options={}){
   if(disposed)return Promise.resolve({ok:false,code:'DIAGNOSTIC_CANCELLED',error:'Diagnostic runner closed'});
   if(jobs.size>=2)return Promise.resolve({ok:false,code:'DIAGNOSTIC_BUSY',error:'Diagnostic capacity reached'});
   const controller=new AbortController(),job=diagnoseCopy(database,sql,{...options,signal:controller.signal});jobs.set(controller,job);
   job.then(()=>jobs.delete(controller),()=>jobs.delete(controller));return job;
  },
  async dispose(){disposed=true;for(const controller of jobs.keys())controller.abort();await Promise.allSettled([...jobs.values()]);},
  state(){return {active:jobs.size,disposed};}
 };
}
module.exports={diagnoseCopy,createEvidenceRunner};
