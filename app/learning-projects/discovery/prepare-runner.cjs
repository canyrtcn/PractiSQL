'use strict';
const {Worker}=require('node:worker_threads');
const path=require('node:path');
// A complete snapshot is delivered only after parsing/import finishes. Cancellation
// terminates the worker; no user DB, file path, connection or model is passed in.
function runInWorker(download,{signal,timeoutMs=600000}={}){
 if(signal?.aborted)return Promise.reject(Error('PROJECT_PREPARE_ABORTED'));
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1)return Promise.reject(Error('PROJECT_PREPARE_OPTIONS'));
 if(!(download?.bytes instanceof Uint8Array)||download.bytes.length>64*1024*1024)return Promise.reject(Error('PROJECT_PREPARE_INPUT'));
 return new Promise((resolve,reject)=>{
  // Do not detach memory owned by the caller. Only this dedicated copy transfers.
  const bytes=new Uint8Array(download.bytes);let worker;
  try{worker=new Worker(path.join(__dirname,'prepare-worker.cjs'),{workerData:{...download,bytes},transferList:[bytes.buffer],resourceLimits:{maxOldGenerationSizeMb:512}});}catch(error){reject(error);return;}
  let done=false,timer;
  function finish(error,value){
   if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);
   // A terminal message owns a complete, cloned result. This worker only owns
   // copied input and an in-memory database, never a user's live connection.
   // Request settlement must not depend on asynchronous thread teardown.
   worker.unref();void worker.terminate().catch(()=>{});
   error?reject(error):resolve(value);
  }
  function abort(){finish(Error('PROJECT_PREPARE_ABORTED'));}
  worker.once('message',message=>{
   if(signal?.aborted){abort();return;}
   if(download.operation==='verify'&&message?.ok&&message.match?.matches===true)finish(null,{match:message.match,execution:message.execution});
   else if(download.operation==='prepare'&&message?.ok&&message.database instanceof Uint8Array&&message.receipt)finish(null,{database:message.database,receipt:message.receipt,execution:message.execution});
   else finish(Error(message?.error||'PROJECT_PREPARE_FAILED'));
  });
  worker.once('error',error=>finish(Error(error.code==='ERR_WORKER_OUT_OF_MEMORY'?'PROJECT_PREPARE_MEMORY':'PROJECT_PREPARE_WORKER')));
  worker.once('exit',()=>{if(!done)finish(Error('PROJECT_PREPARE_INCOMPLETE'));});
  timer=setTimeout(()=>finish(Error('PROJECT_PREPARE_TIMEOUT')),timeoutMs);
  signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
 });
}
const prepareInWorker=(download,options)=>runInWorker({...download,operation:'prepare'},options);
const verifyFileInWorker=(receipt,bytes,options)=>runInWorker({operation:'verify',receipt,bytes},options);
module.exports={prepareInWorker,verifyFileInWorker};
