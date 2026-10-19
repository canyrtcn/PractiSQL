const {parentPort}=require('node:worker_threads'),path=require('node:path'),{diagnose}=require('./sql-write-evidence.cjs');
(async()=>{
 const SQL=await require('./renderer/vendor/sql-wasm-snapshot.js')({locateFile:f=>path.join(__dirname,'renderer/vendor',f)});
 parentPort.on('message',request=>{try{parentPort.postMessage({ok:true,evidence:diagnose(SQL,request.database,request.sql,request.options)});}catch(e){parentPort.postMessage({ok:false,code:'DIAGNOSTIC_ERROR',error:e.message});}});
 parentPort.postMessage({ready:true});
})().catch(e=>parentPort.postMessage({ok:false,code:'DIAGNOSTIC_INIT',error:e.message}));
