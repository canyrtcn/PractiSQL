const {workerData,parentPort}=require('node:worker_threads');
const {capture,buildSqlite}=require('./database-transfer.cjs');
(async()=>{try{parentPort.postMessage({ok:true,...await buildSqlite(await capture(workerData))});}catch(error){parentPort.postMessage({ok:false,error:String(error.message).replaceAll(String(workerData.password||'\0'),'[redacted]')});}})();
