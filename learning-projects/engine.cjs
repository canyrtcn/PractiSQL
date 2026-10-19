const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{createReadRunner}=require('../sql-read-runner.cjs'),lex=require('../renderer/sql-read-contract.js'),{catalogue,tasks,normalized,compare}=require('./rubrics.cjs');
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function singleReport(sql){
 const ts=lex.tokens(sql);if(!ts.length)return false;let depth=0,ended=false;const top=[];
 for(const t of ts){if(ended)return false;if(t.type==='symbol'&&t.value==='(')depth++;if(t.type==='symbol'&&t.value===')')depth--;if(depth<0)return false;if(!depth&&t.type==='symbol'&&t.value===';')ended=true;if(!depth&&t.type==='word')top.push(t.value.toUpperCase());}
 return depth===0&&(top[0]==='SELECT'||top[0]==='WITH'&&top.find(w=>['SELECT','INSERT','UPDATE','DELETE','REPLACE'].includes(w))==='SELECT');
}
function createService({timeoutMs=3000}={}){
 let canonicalPromise;const runner=createReadRunner({timeoutMs});
 async function canonical(){
  if(!canonicalPromise)canonicalPromise=(async()=>{
   const text=normalized(fs.readFileSync(path.join(__dirname,'data/day.csv'),'utf8'));if(digest(Buffer.from(text))!==catalogue.normalizedSha256)throw Error('PROJECT_SOURCE_UNAVAILABLE');
   const lines=text.split('\n'),columns=lines.shift().split(',');if(JSON.stringify(columns)!==JSON.stringify(catalogue.columns)||lines.length!==catalogue.rows)throw Error('PROJECT_SOURCE_UNAVAILABLE');
   const rows=lines.map(line=>line.split(',').map((value,i)=>i===1?value:Number(value)));if(rows.some(r=>r.length!==columns.length||r.some((v,i)=>i!==1&&!Number.isFinite(v))))throw Error('PROJECT_SOURCE_UNAVAILABLE');
   const SQL=await require('../renderer/vendor/sql-wasm-snapshot.js')({locateFile:f=>path.join(__dirname,'../renderer/vendor',f)}),db=new SQL.Database();
   try{
    db.exec('CREATE TABLE bike_days('+columns.map((c,i)=>'"'+c+'" '+(i===0?'INTEGER PRIMARY KEY':i===1?'TEXT NOT NULL':['temp','atemp','hum','windspeed'].includes(c)?'REAL NOT NULL':'INTEGER NOT NULL')).join(',')+')');
    const insert=db.prepare('INSERT INTO bike_days VALUES('+columns.map(()=>'?').join(',')+')');try{for(const row of rows)insert.run(row);}finally{insert.free();}
    const bytes=db.snapshot(),expected=new Map(tasks.map(t=>[t.id,structuredClone(db.exec(t.expected('bike_days'))[0].values)]));
    return {SQL,bytes,rows,expected,sourceRowsDigest:digest(Buffer.from(JSON.stringify(rows)))};
   }finally{db.close();}
  })();
  try{return await canonicalPromise;}catch(error){canonicalPromise=null;throw error;}
 }
 async function importFile(bytes){
  if(!(bytes instanceof Uint8Array)||bytes.length>256*1024)return {ok:false,code:'PROJECT_SOURCE_FILE'};
  let text;try{text=normalized(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{return {ok:false,code:'PROJECT_SOURCE_FILE'};}
  if(digest(Buffer.from(text))!==catalogue.normalizedSha256)return {ok:false,code:'PROJECT_SOURCE_MISMATCH'};
  const source=await canonical();return {ok:true,catalogue:{...catalogue},database:new Uint8Array(source.bytes),sourceRowsDigest:source.sourceRowsDigest};
 }
 async function evaluate({id,database,reports}){
  if(id!==catalogue.id||!(database instanceof Uint8Array)||database.length>8*1024*1024||!Array.isArray(reports)||reports.length<1||reports.length>tasks.length)return {ok:false,code:'PROJECT_SUBMISSION_INPUT'};
  const seen=new Set();for(const r of reports){if(!tasks.some(t=>t.id===r.id)||seen.has(r.id)||typeof r.sql!=='string'||r.sql.length>100000||!singleReport(r.sql))return {ok:false,code:'PROJECT_REPORT_ONLY'};seen.add(r.id);}
  const source=await canonical(),copy=new Uint8Array(database),db=new source.SQL.Database(copy);
  try{
   db.exec('PRAGMA query_only=ON');const kind=db.exec("SELECT type FROM sqlite_master WHERE name='bike_days'")[0]?.values[0]?.[0];if(kind!=='table')return {ok:false,code:'PROJECT_DATA_CHANGED'};
   const columns=db.exec('PRAGMA table_xinfo(bike_days)')[0]?.values||[];if(columns.length!==catalogue.columns.length||columns.some((c,i)=>c[1]!==catalogue.columns[i]||c[6]!==0))return {ok:false,code:'PROJECT_DATA_CHANGED'};
   const rows=db.exec('SELECT '+catalogue.columns.map(c=>'"'+c+'"').join(',')+' FROM bike_days ORDER BY instant LIMIT 732')[0]?.values||[];
   if(digest(Buffer.from(JSON.stringify(rows)))!==source.sourceRowsDigest)return {ok:false,code:'PROJECT_DATA_CHANGED'};
  }catch{return {ok:false,code:'PROJECT_DATA_CHANGED'};}finally{db.close();}
  const results=[];
  for(const report of reports){
   const task=tasks.find(t=>t.id===report.id),run=await runner.execute(copy,report.sql,1000);
   if(!run.ok){results.push({id:task.id,correct:false,points:0,code:run.code,error:run.error});continue;}
   const output=run.results.length===1&&!run.limited?run.results[0]:null,expected=source.expected.get(task.id),correct=compare(output,expected,task.columns);
   const mismatches=[];if(output&&!correct&&output.columns.length===task.columns){for(let i=0;i<Math.min(output.values.length,expected.length)&&mismatches.length<3;i++)for(let j=0;j<task.columns&&mismatches.length<3;j++){const got=output.values[i][j],wanted=expected[i][j];if(typeof wanted==='number'&&typeof got==='number'?Math.abs(got-wanted)>Math.max(1e-7,Math.abs(wanted)*1e-9):got!==wanted)mismatches.push({row:i+1,column:j+1,observed:got,expected:wanted});}}
   results.push({id:task.id,correct,points:correct?task.points:0,sqlHash:digest(Buffer.from(report.sql)),result:output,expectedRows:expected.length,expectedColumns:task.columns,mismatches,...(!output?{code:'PROJECT_INCOMPLETE_OUTPUT'}:{})});
  }
  return {ok:true,id,datasetHash:digest(copy),sourceRowsDigest:source.sourceRowsDigest,results,numericPoints:results.reduce((n,r)=>n+r.points,0),numericMaximum:80,complete:results.length===tasks.length&&results.every(r=>r.correct),interpretationReviewed:false};
 }
 return {catalogue:()=>({...catalogue,tasks:tasks.map(({expected,...t})=>t)}),importFile,evaluate,dispose:()=>runner.dispose()};
}
module.exports={createService,singleReport};
