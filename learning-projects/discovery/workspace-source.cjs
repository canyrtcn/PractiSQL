'use strict';
const {digest}=require('./verified-csv.cjs');
const values=require('../../renderer/sqlite-values.js');
const fail=()=>{throw Error('PROJECT_WORKSPACE_SOURCE_CHANGED');};
// Compare a multiset, including duplicate counts and exact stored values. A
// harmless row reordering is allowed; deleting one duplicate is not.
function verifySource(SQL,canonicalBytes,workspace,receipt){
 let canonical;
 try{
  const health=workspace.exec('PRAGMA main.quick_check');
  if(health.length!==1||health[0].values.length!==1||health[0].values[0].length!==1||health[0].values[0][0]!=='ok')fail();
  const kind=workspace.exec("SELECT type FROM main.sqlite_schema WHERE name='source_data'");if(kind[0]?.values.length!==1||kind[0].values[0][0]!=='table')fail();
  const info=workspace.exec('PRAGMA main.table_xinfo("source_data")')[0]?.values||[];
  if(info.length!==receipt.columns.length||info.some((c,i)=>c[1]!==receipt.columns[i].name||String(c[2]).toUpperCase()!==receipt.columns[i].storage||c[6]!==0))fail();
  canonical=new SQL.Database(canonicalBytes);const expected=canonical.prepare('SELECT * FROM main.source_data'),actual=workspace.prepare('SELECT * FROM main.source_data');
  try{
   const counts=new Map();let expectedRows=0,actualRows=0;
   while(expected.step()){
    const key=digest(JSON.stringify(values.row(expected.get(null,{useBigInt:true}))));counts.set(key,(counts.get(key)||0)+1);expectedRows++;
   }
   while(actual.step()){
    if(++actualRows>expectedRows)fail();const key=digest(JSON.stringify(values.row(actual.get(null,{useBigInt:true})))),count=counts.get(key);if(!count)fail();
    if(count===1)counts.delete(key);else counts.set(key,count-1);
   }
   if(actualRows!==receipt.rowCount||actualRows!==expectedRows||counts.size)fail();
   return {sourceTable:'main.source_data',sourceRows:actualRows,method:'Exact stored row multiset with multiplicity; SHA-256 row identities, canonical original CSV, source columns and SQLite integrity.'};
  }finally{expected.free();actual.free();}
 }catch(error){if(error.message==='PROJECT_WORKSPACE_SOURCE_CHANGED')throw error;fail();}
 finally{canonical?.close();}
}
module.exports={verifySource};
