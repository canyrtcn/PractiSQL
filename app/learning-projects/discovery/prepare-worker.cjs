'use strict';
const {parentPort,workerData,threadId}=require('node:worker_threads');
const path=require('node:path');
const {prepareVerifiedDataset,matchDownloadedFile}=require('./verified-csv.cjs');
(async()=>{
 try{
  if(workerData.operation==='verify'){
   parentPort.postMessage({ok:true,match:matchDownloadedFile(workerData.receipt,workerData.bytes),execution:{threadId}});return;
  }
  if(workerData.operation!=='prepare')throw Error('PROJECT_PREPARE_OPERATION');
  const SQL=await require('../../renderer/vendor/sql-wasm-snapshot.js')({locateFile:f=>path.resolve(__dirname,'../../renderer/vendor',f)});
  const prepared=prepareVerifiedDataset(workerData,SQL);
  parentPort.postMessage({ok:true,...prepared,execution:{threadId}},[prepared.database.buffer]);
 }catch(error){parentPort.postMessage({ok:false,error:String(error.message||error)});}
 finally{parentPort.close();}
})();
