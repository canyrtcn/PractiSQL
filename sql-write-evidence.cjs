// Supplemental write-error evidence on a private SQLite copy; never applies user writes.
const lexical=require('./renderer/sql-read-contract.js'),describe=require('./renderer/sql-sections.js').describe;
function diagnose(SQL,bytes,sql,{maxErrors=8,maxStatements=300,connection={}}={}){
 const db=new SQL.Database(Uint8Array.from(bytes)),errors=[],seen=new Set();let processed=0,complete=false,stoppedReason=null,iterator;
 const add=entry=>{if(!seen.has(entry.message)){seen.add(entry.message);if(errors.length<maxErrors)errors.push(entry);}};
 try{
  // Match the application's atomic write policy. Immediate checking would
  // falsely reject valid parent/child key migrations completed in one batch.
  for(const name of ['reverse_unordered_selects','read_uncommitted','recursive_triggers','ignore_check_constraints']){
   const value=connection.pragmas?.[name];if(value===0||value===1)db.exec('PRAGMA '+name+'='+value);
  }
  if(connection.caseSensitiveLike)db.exec('PRAGMA case_sensitive_like=ON');
  // Trigger expressions may depend on counters from the original connection.
  const connectionLocal=body=>lexical.tokens(body).some((token,i,all)=>
    ['LAST_INSERT_ROWID','CHANGES','TOTAL_CHANGES'].includes(String(token.value).toUpperCase())&&all[i+1]?.value==='(');
  if((db.exec("SELECT sql FROM sqlite_master WHERE type='trigger'")[0]?.values||[]).some(row=>connectionLocal(row[0]||'')))
   return {diagnosticOnly:true,complete:false,processed:0,stoppedReason:'connection-local-trigger',errors:[]};
  db.exec('PRAGMA foreign_keys=ON; SAVEPOINT __diagnostic_batch; PRAGMA defer_foreign_keys=ON');
  iterator=db.iterateStatements(sql);
  while(processed<maxStatements){
   let item;try{item=iterator.next();}catch(e){add({phase:'prepare',statement:processed+1,message:e.message});stoppedReason='prepare-error';break;}
   if(item.done){complete=true;break;}
   const statement=item.value,body=statement.getSQL(),info=describe(body),tokens=lexical.tokens(body);processed++;
   // The actual atomic runner already enforces FK ON. A redundant ON pragma
   // inside its savepoint is a no-op; no other connection control is replayed.
   const pragma=tokens.map(t=>String(t.value).toUpperCase()).filter(v=>v!==';').join(' ');
   if(info.command==='PRAGMA'&&['PRAGMA FOREIGN_KEYS = ON','PRAGMA FOREIGN_KEYS = 1'].includes(pragma)){statement.free();continue;}
   if(['BEGIN','COMMIT','END','ROLLBACK','SAVEPOINT','RELEASE','ATTACH','DETACH','VACUUM','PRAGMA'].includes(info.command)){
    stoppedReason='connection-or-transaction-control';statement.free();break;
   }
   // A cloned connection cannot reproduce a pre-existing temporary schema/counter.
   if(tokens.some((token,i)=>token.type==='word'&&
    (['TEMP','TEMPORARY'].includes(token.value.toUpperCase())&&(info.command==='CREATE'||tokens[i+1]?.value==='.')||
     ['LAST_INSERT_ROWID','CHANGES','TOTAL_CHANGES'].includes(token.value.toUpperCase())&&tokens[i+1]?.value==='('))){stoppedReason='connection-local-state';statement.free();break;}
   db.exec('SAVEPOINT __diagnostic_statement');
   try{while(statement.step()){};db.exec('RELEASE __diagnostic_statement');}
   catch(e){
    add({phase:'step',statement:processed,command:info.command,target:info.target,message:e.message});
    try{db.exec('ROLLBACK TO __diagnostic_statement; RELEASE __diagnostic_statement');}catch{stoppedReason='statement-ended-transaction';break;}
   }
  }
  if(processed===maxStatements&&!complete&&!stoppedReason)stoppedReason='statement-limit';
  // Deferred foreign keys are assessed at batch end, not after each successful statement.
  const fk=require('./renderer/sqlite-values.js').exec(db,'PRAGMA foreign_key_check')[0]?.values||[];
  if(complete&&fk.length)add({phase:'batch-end',message:'FOREIGN KEY violations reported by foreign_key_check at batch end',violations:fk.slice(0,maxErrors),violationsTruncated:fk.length>maxErrors});
  return {diagnosticOnly:true,complete,processed,stoppedReason,errorLimit:maxErrors,errorsTruncated:seen.size>errors.length,errors,
   interpretation:'Failed statements were rolled back independently in a private copy. Later dependency errors may follow an earlier failure. This is diagnostic evidence, not a successful replay or proof of the whole business request.'};
 }finally{try{iterator?.return?.();}catch{}db.close();}
}
module.exports={diagnose};
