const {parentPort}=require('node:worker_threads'),path=require('node:path'),{collect}=require('./sql-seed-evidence.cjs');
(async()=>{
 const SQL=await require('./renderer/vendor/sql-wasm-snapshot.js')({locateFile:f=>path.join(__dirname,'renderer/vendor',f)});
 parentPort.once('message',request=>{
  let db;
  try{db=new SQL.Database(request.database);db.exec('PRAGMA query_only=ON');parentPort.postMessage({ok:true,evidence:collect(db,request.options)});}
  catch(error){parentPort.postMessage({ok:false,code:'SEED_EVIDENCE_ERROR',error:error.message});}
  finally{db?.close();}
 });
 parentPort.postMessage({ready:true});
})().catch(error=>parentPort.postMessage({ok:false,code:'SEED_EVIDENCE_INIT',error:error.message}));
