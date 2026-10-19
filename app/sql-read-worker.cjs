// Read-only database copies run outside both Electron UI and main event loops.
const {parentPort}=require('node:worker_threads');
const path=require('node:path');
const sqliteValues=require('./renderer/sqlite-values.js');
(async()=>{
  const SQL=await require('sql.js')({locateFile:file=>path.join(__dirname,'node_modules','sql.js','dist',file)});
  const registerFunction=SQL.cwrap('sqlite3_create_function_v2','number',['number','string','number','number','number','number','number','number','number']);
  parentPort.on('message',request=>{
    let db,statementStarted=false;const callbacks=[];
    try{
      db=new SQL.Database(new Uint8Array(request.database));db.exec('PRAGMA query_only=ON;PRAGMA foreign_keys=ON;');
      // SQLite opens snapshots lazily; load the catalog before attributing a
      // failure to the learner's statement. This does not scan user table rows.
      db.exec('SELECT name FROM sqlite_schema LIMIT 1;');
      for(const name of ['foreign_keys','reverse_unordered_selects','read_uncommitted','recursive_triggers','ignore_check_constraints','short_column_names','full_column_names']){const value=request.connection?.pragmas?.[name];if(value===0||value===1)db.exec('PRAGMA '+name+'='+value);}
      if(request.connection?.caseSensitiveLike)db.exec('PRAGMA case_sensitive_like=ON');
      for(const [i,name] of ['last_insert_rowid','changes','total_changes'].entries()){
        const value=request.connection?.counters?.[i];
        if(typeof value==='string'&&/^-?\d+$/.test(value)){
          const integer=BigInt(value),callback=SQL.addFunction(context=>SQL._sqlite3_result_int64(context,integer),'viii');callbacks.push(callback);
          db.handleError(registerFunction(db.db,name,0,1,0,callback,0,0,0));
        }
      }
      statementStarted=true;
      const results=[];let limited=false;const iterator=db.iterateStatements(request.sql);
      for(const statement of iterator){
        const columns=statement.getColumnNames(),values=[];let resultLimited=false;
        while(statement.step()){
          if(values.length>=request.limit){limited=true;resultLimited=true;break;}
          values.push(sqliteValues.row(statement.get(null,{useBigInt:true})));
        }
        if(columns.length)results.push({columns,values,...(resultLimited?{limited:true}:{})});
      }
      parentPort.postMessage({id:request.id,ok:true,results,limited});
    }catch(error){parentPort.postMessage({id:request.id,ok:false,code:statementStarted?'SQL_READ_ERROR':'SQL_READ_DATABASE',error:error.message});}
    finally{db?.close();for(const callback of callbacks)SQL.removeFunction(callback);}
  });
  parentPort.postMessage({ready:true});
})().catch(error=>{parentPort.postMessage({initError:error.message});});
