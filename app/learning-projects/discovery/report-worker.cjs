'use strict';
// Isolated report evaluation on canonical records or a copied student workspace.
const {parentPort,workerData,threadId}=require('node:worker_threads');
const path=require('node:path');
const {prepareVerifiedDataset,digest}=require('./verified-csv.cjs');
const {evaluate,assess}=require('./report-measures.cjs');
const {describe}=require('./report-brief.cjs');
const {singleReport}=require('../../learning-projects/engine.cjs');
const values=require('../../renderer/sqlite-values.js');
const {verifySource}=require('./workspace-source.cjs');
const Errors=require('./project-errors.js');
(async()=>{
 let db;
 try{
  const {download,spec,sql,plans,reports,operation,database}=workerData;
  if(!['assess','assess-batch','prepare-plans'].includes(operation))throw Error('PROJECT_REPORT_OPERATION');
  const submissions=operation==='assess'?[{spec,sql}]:reports;
  if(operation!=='prepare-plans'&&submissions.some(r=>typeof r.sql!=='string'||r.sql.length>100000||!singleReport(r.sql)))throw Error('PROJECT_REPORT_ONLY');
  const SQL=await require('../../renderer/vendor/sql-wasm-snapshot.js')({locateFile:f=>path.resolve(__dirname,'../../renderer/vendor',f)});
  const source=prepareVerifiedDataset(download,SQL);
  if(operation==='prepare-plans'){
   if(!Array.isArray(plans)||!plans.length||plans.length>8)throw Error('PROJECT_REPORT_INPUT');
   const prepared=plans.map((p,i)=>Errors.at('/tasks/'+i+'/report',()=>{
    const expected=evaluate(p,source.receipt,download.bytes);
    return {spec:p,specSha256:expected.specSha256,outputRows:expected.values.length,brief:{tr:describe(p,source.receipt,'tr'),en:describe(p,source.receipt,'en')}};
   }));
   parentPort.postMessage({ok:true,result:{source:source.receipt,plans:prepared,businessMeaningVerified:false,awardsAllowed:false,execution:{threadId}}});return;
  }
  db=new SQL.Database(database||source.database);db.exec('PRAGMA query_only=ON');
  const workspaceSha256=database?digest(database):null;
  // The canonical bytes were just rebuilt from the complete verified CSV.
  // Byte identity proves more than row equality. Any different snapshot still
  // takes the full integrity/schema/multiset path, including added views.
  const workspaceVerification=database?(workspaceSha256===source.receipt.databaseSha256?
   {sourceTable:'main.source_data',sourceRows:source.receipt.rowCount,method:'Exact SHA-256 identity with the canonical database rebuilt from the complete verified original CSV.'}:
   verifySource(SQL,source.database,db,source.receipt)):null;
  const results=[];
  for(const submission of submissions){
  const {spec,sql}=submission;
  parentPort.postMessage({phase:'prepare'});
  const expected=evaluate(spec,source.receipt,download.bytes);
  parentPort.postMessage({phase:'sql'});
  let actual;
  try{
   const results=[];let limited=false;
   for(const statement of db.iterateStatements(sql)){
    const columns=statement.getColumnNames(),rows=[];
    while(statement.step()){
     if(rows.length===5000){limited=true;break;}
     rows.push(values.row(statement.get(null,{useBigInt:true})));
    }
    if(columns.length)results.push({columns,values:rows,limited});
   }
   actual=results.length===1?results[0]:null;
  }catch(error){parentPort.postMessage({ok:false,code:'PROJECT_REPORT_SQL',error:String(error.message)});return;}
  const assessment=assess(actual,expected);
  results.push({...assessment,numericCorrect:assessment.correct,sourceSha256:source.receipt.sha256,specSha256:expected.specSha256,sqlSha256:digest(sql),sourceRows:source.receipt.rowCount,expectedRows:expected.values.length,actual,assignmentReviewed:false,awardsAllowed:false,...(database?{workspaceSha256,workspaceVerification}:{}),evaluationSource:database?'Read-only execution on the submitted workspace snapshot; complete original source rows verified before execution. Additional student tables/views are available.':'Rebuilt from the complete verified original CSV; no student workspace inspection.',execution:{threadId}});
  }
  parentPort.postMessage({ok:true,result:operation==='assess'?results[0]:{reports:results.map((r,i)=>({id:submissions[i].id,...r})),allNumericCorrect:results.every(r=>r.numericCorrect),sourcePreparations:1,workspaceVerifications:database?1:0,execution:{threadId}}});
 }catch(error){parentPort.postMessage({ok:false,...Errors.pack(error)});}
 finally{db?.close();parentPort.close();}
})();
