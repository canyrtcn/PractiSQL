// Optional first-request evidence: bounded private copy, never an SQL success verdict.
const {Worker}=require('node:worker_threads'),path=require('node:path');
async function collectCopy(database,{timeoutMs=350,totalTimeoutMs=900,maxTuples=12,maxCharacters=6000,maxTables=32,signal}={}){
 if(!(database instanceof Uint8Array)||database.length>16*1024*1024||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>1000||!Number.isInteger(totalTimeoutMs)||totalTimeoutMs<1||totalTimeoutMs>2000||!Number.isInteger(maxTuples)||maxTuples<1||maxTuples>32||!Number.isInteger(maxCharacters)||maxCharacters<1024||maxCharacters>16000||!Number.isInteger(maxTables)||maxTables<1||maxTables>128)return {ok:false,code:'SEED_EVIDENCE_INPUT'};
 if(signal?.aborted)return {ok:false,code:'SEED_EVIDENCE_CANCELLED'};
 const worker=new Worker(path.join(__dirname,'sql-seed-evidence-worker.cjs'));let totalTimer,executionTimer,onAbort;
 try{return await new Promise(resolve=>{
  let settled=false;const finish=result=>{if(settled)return;settled=true;clearTimeout(totalTimer);clearTimeout(executionTimer);resolve(result);};
  onAbort=()=>finish({ok:false,code:'SEED_EVIDENCE_CANCELLED'});signal?.addEventListener('abort',onAbort,{once:true});
  totalTimer=setTimeout(()=>finish({ok:false,code:'SEED_EVIDENCE_TIMEOUT'}),totalTimeoutMs);
  worker.on('message',m=>{if(settled)return;if(m.ready){executionTimer=setTimeout(()=>finish({ok:false,code:'SEED_EVIDENCE_TIMEOUT'}),timeoutMs);worker.postMessage({database:new Uint8Array(database),options:{maxTuples,maxCharacters,maxTables}});}else finish(m);});
  worker.on('error',()=>finish({ok:false,code:'SEED_EVIDENCE_WORKER'}));worker.on('exit',()=>finish({ok:false,code:'SEED_EVIDENCE_WORKER'}));
 });}finally{clearTimeout(totalTimer);clearTimeout(executionTimer);signal?.removeEventListener('abort',onAbort);await worker.terminate();}
}
function createSeedRunner(){
 const jobs=new Map();let disposed=false;
 return {
  collect(database,options={}){
   if(disposed)return Promise.resolve({ok:false,code:'SEED_EVIDENCE_CANCELLED'});
   if(jobs.size)return Promise.resolve({ok:false,code:'SEED_EVIDENCE_BUSY'});
   const controller=new AbortController(),job=collectCopy(database,{...options,signal:controller.signal});jobs.set(controller,job);job.then(()=>jobs.delete(controller),()=>jobs.delete(controller));return job;
  },
  async dispose(){disposed=true;for(const controller of jobs.keys())controller.abort();await Promise.allSettled([...jobs.values()]);},
  state(){return {active:jobs.size,disposed};}
 };
}
module.exports={collectCopy,createSeedRunner};
