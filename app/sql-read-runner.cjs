const {Worker}=require('node:worker_threads');
const path=require('node:path');
function createReadRunner({timeoutMs=10000,initTimeoutMs=30000}={}){
  let worker=null,ready=false,active=null,timer=null,initialTimer=null,sequence=0,disposed=false;
  const queue=[],terminating=new Set();
  const failure=(code,error)=>({ok:false,code,error});
  function finish(result){clearTimeout(timer);timer=null;const job=active;active=null;job?.resolve(result);pump();}
  function stopWorker(){const current=worker;worker=null;ready=false;clearTimeout(initialTimer);initialTimer=null;if(current){const stopping=current.terminate().catch(()=>{});terminating.add(stopping);stopping.finally(()=>terminating.delete(stopping));}}
  function failWorker(result){stopWorker();finish(result);}
  function pump(){
    if(disposed||active||!queue.length)return;
    if(!worker){
      const current=new Worker(path.join(__dirname,'sql-read-worker.cjs'));worker=current;
      initialTimer=setTimeout(()=>{if(worker===current){queue.shift()?.resolve(failure('SQL_READ_INIT','SQL read worker did not initialize.'));failWorker(failure('SQL_READ_INIT','SQL read worker did not initialize.'));}},initTimeoutMs);
      current.on('message',message=>{
        if(worker!==current)return;
        if(message.ready){clearTimeout(initialTimer);initialTimer=null;ready=true;pump();return;}
        if(message.initError){const job=queue.shift();job?.resolve(failure('SQL_READ_INIT',message.initError));failWorker(failure('SQL_READ_INIT',message.initError));return;}
        if(active&&message.id===active.id)finish(message);
      });
      current.on('error',error=>{if(worker===current){const job=active?null:queue.shift();job?.resolve(failure('SQL_READ_WORKER',error.message));failWorker(failure('SQL_READ_WORKER',error.message));}});
      current.on('exit',()=>{if(worker===current){const job=active?null:queue.shift();job?.resolve(failure('SQL_READ_WORKER','SQL read worker exited.'));failWorker(failure('SQL_READ_WORKER','SQL read worker exited.'));}});
    }
    if(!ready)return;
    active=queue.shift();const job=active;
    timer=setTimeout(()=>{if(active===job)failWorker(failure('SQL_READ_TIMEOUT','SQL read execution exceeded its time limit.'));},timeoutMs);
    worker.postMessage({id:job.id,database:job.database,sql:job.sql,limit:job.limit,connection:job.connection});
  }
  return {
    execute(database,sql,limit=5000,connection={}){
      if(disposed)return Promise.resolve(failure('SQL_READ_CANCELLED','SQL read runner closed.'));
      if(!(database instanceof Uint8Array)||typeof sql!=='string'||!sql.trim()||!Number.isInteger(limit)||limit<1||limit>5000)return Promise.resolve(failure('SQL_READ_INPUT','Invalid SQL read input.'));
      return new Promise(resolve=>{queue.push({id:++sequence,database:new Uint8Array(database),sql,limit,connection,resolve});pump();});
    },
    async dispose(){disposed=true;clearTimeout(timer);timer=null;active?.resolve(failure('SQL_READ_CANCELLED','SQL read runner closed.'));active=null;for(const job of queue.splice(0))job.resolve(failure('SQL_READ_CANCELLED','SQL read runner closed.'));stopWorker();await Promise.all([...terminating]);},
    state(){return {queued:queue.length,active:!!active,worker:!!worker,terminating:terminating.size};}
  };
}
module.exports={createReadRunner};
