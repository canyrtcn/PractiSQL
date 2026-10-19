// Read-only source adapters; local snapshots are built atomically in a new SQLite DB.
const fs=require('node:fs');
const qid=name=>'"'+String(name).replace(/"/g,'""')+'"';
const mysqlId=name=>'`'+String(name).replace(/`/g,'``')+'`';
const sqlserverId=name=>'['+String(name).replace(/]/g,']]')+']';
function validate(input){
  if(!input || !['postgres','mysql','mssql'].includes(input.engine))throw Error('Select PostgreSQL, MySQL or SQL Server.');
  for(const key of ['host','database','user'])if(typeof input[key]!=='string'||!input[key].trim()||input[key].length>255)throw Error('Connection field required: '+key);
  const port=Number(input.port);if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid port.');
  return {...input,port,schema:String(input.schema||({postgres:'public',mssql:'dbo',mysql:input.database}[input.engine])).trim(),password:String(input.password||''),tls:input.tls!==false,trustCertificate:input.trustCertificate===true};
}
async function connect(input){
  const c=validate(input),common={host:c.host,port:c.port,user:c.user,password:c.password,database:c.database};
  if(c.engine==='postgres'){
    const pg=require('pg');const client=new pg.Client({...common,connectionTimeoutMillis:10000,query_timeout:30000,ssl:c.tls?{rejectUnauthorized:!c.trustCertificate}:false,types:{getTypeParser(oid,format){return [20,1700,1082,1114,1184].includes(oid)?value=>value:pg.types.getTypeParser(oid,format);}}});
    await client.connect();return {c,quote:qid,query:async(sql,params=[])=>{let i=0;return(await client.query(sql.replace(/\?/g,()=>'$'+(++i)),params)).rows;},begin:()=>client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY'),end:async()=>{try{await client.query('ROLLBACK');}finally{await client.end();}}};
  }
  if(c.engine==='mysql'){
    const client=await require('mysql2/promise').createConnection({...common,connectTimeout:10000,supportBigNumbers:true,bigNumberStrings:true,dateStrings:true,decimalNumbers:false,ssl:c.tls?{rejectUnauthorized:!c.trustCertificate}:undefined,multipleStatements:false});
    return {c,quote:mysqlId,query:async(sql,params=[])=>{const [rows]=await client.query({sql,timeout:30000},params);return rows;},begin:async()=>{await client.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');await client.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');},end:async()=>{try{await client.query('ROLLBACK');}finally{await client.end();}}};
  }
  const mssql=require('mssql');const pool=new mssql.ConnectionPool({server:c.host,port:c.port,user:c.user,password:c.password,database:c.database,connectionTimeout:10000,requestTimeout:30000,pool:{max:1,min:0,idleTimeoutMillis:1000},options:{encrypt:c.tls,trustServerCertificate:c.trustCertificate,useUTC:true}});await pool.connect();
  const transaction=new mssql.Transaction(pool);let begun=false;
  return {c,quote:sqlserverId,query:async(sql,params=[])=>{const request=begun?new mssql.Request(transaction):pool.request();let i=0;params.forEach((v,j)=>request.input('p'+j,v));return(await request.query(sql.replace(/\?/g,()=>'@p'+(i++)))).recordset;},begin:async()=>{await transaction.begin(mssql.ISOLATION_LEVEL.REPEATABLE_READ);begun=true;},end:async()=>{try{if(begun)await transaction.rollback();}finally{await pool.close();}}};
}
const sourceType=type=>/^(smallint|integer|int|int2|int4|tinyint|bit|boolean|bool|mediumint)$/i.test(type)?'INTEGER':/^(real|double precision|double|float|float4|float8)$/i.test(type)?'REAL':/binary|blob|bytea|image/i.test(type)?'BLOB':'TEXT';
function sqliteValue(value,type){
  if(value==null)return null;if(Buffer.isBuffer(value))return new Uint8Array(value);
  if(value instanceof Date)return value.toISOString();if(typeof value==='boolean')return value?1:0;
  if(typeof value==='bigint')return value.toString();if(typeof value==='object')return JSON.stringify(value);
  if(type==='TEXT')return String(value);return value;
}
async function capture(input,options={}){
  const adapter=await (options.connect||connect)(input),{c,query,quote}=adapter;
  const metadataQuery=async(...args)=>(await query(...args)).map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key.toLowerCase(),value])));
  const tableLimit=100,rowLimit=50000,totalLimit=100000;let total=0;
  try{
    await adapter.begin();
    const tables=await metadataQuery("SELECT table_name FROM information_schema.tables WHERE table_schema=? AND table_type='BASE TABLE' ORDER BY table_name",[c.schema]);
    if(!tables.length)throw Error('No readable tables found in schema '+c.schema+'.');if(tables.length>tableLimit)throw Error('Too many tables. Maximum per snapshot: '+tableLimit+'.');
    const columns=await metadataQuery('SELECT table_name,column_name,data_type,is_nullable,column_default,ordinal_position FROM information_schema.columns WHERE table_schema=? ORDER BY table_name,ordinal_position',[c.schema]);
    const constraints=await metadataQuery("SELECT tc.table_name,tc.constraint_name,tc.constraint_type,kcu.column_name,kcu.ordinal_position FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name=kcu.constraint_name AND tc.table_schema=kcu.table_schema AND tc.table_name=kcu.table_name WHERE tc.table_schema=? AND tc.constraint_type IN ('PRIMARY KEY','UNIQUE') ORDER BY tc.table_name,tc.constraint_name,kcu.ordinal_position",[c.schema]);
    let fks;
    if(c.engine==='postgres')fks=await query("SELECT t.relname AS table_name,co.conname AS constraint_name,pn.nspname AS target_schema,p.relname AS target_table,a.attname AS column_name,pa.attname AS target_column,k.ordinality AS ordinal_position,CASE co.confdeltype WHEN 'c' THEN 'CASCADE' WHEN 'n' THEN 'SET NULL' WHEN 'd' THEN 'SET DEFAULT' WHEN 'r' THEN 'RESTRICT' ELSE 'NO ACTION' END AS delete_rule,CASE co.confupdtype WHEN 'c' THEN 'CASCADE' WHEN 'n' THEN 'SET NULL' WHEN 'd' THEN 'SET DEFAULT' WHEN 'r' THEN 'RESTRICT' ELSE 'NO ACTION' END AS update_rule FROM pg_constraint co JOIN pg_class t ON t.oid=co.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace JOIN pg_class p ON p.oid=co.confrelid JOIN pg_namespace pn ON pn.oid=p.relnamespace JOIN LATERAL unnest(co.conkey,co.confkey) WITH ORDINALITY k(child_num,parent_num,ordinality) ON true JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=k.child_num JOIN pg_attribute pa ON pa.attrelid=p.oid AND pa.attnum=k.parent_num WHERE co.contype='f' AND n.nspname=? ORDER BY t.relname,co.conname,k.ordinality",[c.schema]);
    else if(c.engine==='mysql')fks=await query('SELECT k.table_name,k.constraint_name,k.referenced_table_schema AS target_schema,k.referenced_table_name AS target_table,k.column_name,k.referenced_column_name AS target_column,k.ordinal_position,r.delete_rule,r.update_rule FROM information_schema.key_column_usage k JOIN information_schema.referential_constraints r ON r.constraint_schema=k.constraint_schema AND r.constraint_name=k.constraint_name AND r.table_name=k.table_name WHERE k.table_schema=? AND k.referenced_table_name IS NOT NULL ORDER BY k.table_name,k.constraint_name,k.ordinal_position',[c.schema]);
    else fks=await query("SELECT t.name AS table_name,f.name AS constraint_name,ps.name AS target_schema,p.name AS target_table,c.name AS column_name,pc.name AS target_column,k.constraint_column_id AS ordinal_position,REPLACE(f.delete_referential_action_desc,'_',' ') AS delete_rule,REPLACE(f.update_referential_action_desc,'_',' ') AS update_rule FROM sys.foreign_keys f JOIN sys.foreign_key_columns k ON k.constraint_object_id=f.object_id JOIN sys.tables t ON t.object_id=f.parent_object_id JOIN sys.schemas s ON s.schema_id=t.schema_id JOIN sys.tables p ON p.object_id=f.referenced_object_id JOIN sys.schemas ps ON ps.schema_id=p.schema_id JOIN sys.columns c ON c.object_id=t.object_id AND c.column_id=k.parent_column_id JOIN sys.columns pc ON pc.object_id=p.object_id AND pc.column_id=k.referenced_column_id WHERE s.name=? ORDER BY t.name,f.name,k.constraint_column_id",[c.schema]);
    fks=fks.map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key.toLowerCase(),value])));
    const available=new Set(tables.map(t=>t.table_name));
    if(fks.some(f=>f.target_schema!==c.schema||!available.has(f.target_table)))throw Error('A foreign key targets another schema or an unreadable table. Import that complete dependency scope; partial snapshots are not applied.');
    const snapshot={engine:c.engine,schema:c.schema,tables:[],warnings:['This is a SQLite learning copy. Source CHECK expressions, defaults, collations, generated expressions, triggers, views, procedures and secondary indexes are not migrated. BIGINT and DECIMAL values use TEXT to preserve precision. SET DEFAULT foreign keys cannot be reproduced without source defaults; such imports are rejected.']};
    if(fks.some(f=>f.delete_rule==='SET DEFAULT'||f.update_rule==='SET DEFAULT'))throw Error('SET DEFAULT relationships require dialect-specific defaults and cannot be imported faithfully.');
    for(const {table_name:name} of tables){
      const cols=columns.filter(col=>col.table_name===name);if(!cols.length)throw Error('Missing column metadata: '+name);
      const qualified=quote(c.schema)+'.'+quote(name),projection=cols.map(col=>c.engine==='mssql' && /^(bigint|decimal|numeric|money|smallmoney)$/i.test(col.data_type)?'CAST('+quote(col.column_name)+' AS VARCHAR(100)) AS '+quote(col.column_name):quote(col.column_name)).join(',');
      const rows=await query(c.engine==='mssql'?`SELECT TOP (${rowLimit+1}) ${projection} FROM ${qualified}`:`SELECT ${projection} FROM ${qualified} LIMIT ${rowLimit+1}`);
      total+=rows.length;if(rows.length>rowLimit||total>totalLimit)throw Error('Snapshot row limit exceeded (50,000 per table; 100,000 total). Nothing was imported.');
      snapshot.tables.push({name,columns:cols.map(col=>({name:col.column_name,type:sourceType(col.data_type),sourceType:col.data_type,notNull:col.is_nullable==='NO'})),constraints:constraints.filter(k=>k.table_name===name),fks:fks.filter(f=>f.table_name===name),rows:rows.map(row=>cols.map(col=>sqliteValue(row[col.column_name],sourceType(col.data_type))))});
    }
    return snapshot;
  }finally{await adapter.end();}
}
async function buildSqlite(snapshot){
  const SQL=await require('./renderer/vendor/sql-wasm-snapshot.js')({locateFile:f=>require('node:path').join(__dirname,'renderer/vendor',f)}),db=new SQL.Database();
  try{
    db.exec('PRAGMA foreign_keys=ON;BEGIN;PRAGMA defer_foreign_keys=ON;');
    for(const t of snapshot.tables){
      const defs=t.columns.map(c=>qid(c.name)+' '+c.type+(c.notNull?' NOT NULL':''));
      const groups=new Map();for(const c of t.constraints){if(!groups.has(c.constraint_name))groups.set(c.constraint_name,[]);groups.get(c.constraint_name).push(c);}
      for(const g of groups.values()){g.sort((a,b)=>a.ordinal_position-b.ordinal_position);defs.push((g[0].constraint_type==='PRIMARY KEY'?'PRIMARY KEY':'UNIQUE')+' ('+g.map(c=>qid(c.column_name)).join(',')+')');}
      const relations=new Map();for(const f of t.fks){if(!relations.has(f.constraint_name))relations.set(f.constraint_name,[]);relations.get(f.constraint_name).push(f);}
      for(const g of relations.values()){g.sort((a,b)=>a.ordinal_position-b.ordinal_position);for(const action of [g[0].delete_rule,g[0].update_rule])if(!['NO ACTION','RESTRICT','CASCADE','SET NULL'].includes(action))throw Error('Unsupported FK action: '+action);defs.push('FOREIGN KEY ('+g.map(f=>qid(f.column_name)).join(',')+') REFERENCES '+qid(g[0].target_table)+' ('+g.map(f=>qid(f.target_column)).join(',')+') ON DELETE '+g[0].delete_rule+' ON UPDATE '+g[0].update_rule);}
      db.exec('CREATE TABLE '+qid(t.name)+' ('+defs.join(',')+');');
    }
    for(const t of snapshot.tables){const statement=db.prepare('INSERT INTO '+qid(t.name)+' ('+t.columns.map(c=>qid(c.name)).join(',')+') VALUES ('+t.columns.map(()=>'?').join(',')+')');try{for(const row of t.rows)statement.run(row);}finally{statement.free();}}
    if(db.exec('PRAGMA foreign_key_check')[0]?.values.length)throw Error('Snapshot has foreign-key violations.');db.exec('COMMIT');
    if(db.exec('PRAGMA quick_check')[0].values[0][0]!=='ok')throw Error('Snapshot integrity check failed.');
    return {bytes:Array.from(db.export()),tables:snapshot.tables.length,rows:snapshot.tables.reduce((n,t)=>n+t.rows.length,0),warnings:snapshot.warnings};
  }finally{db.close();}
}
function setup({ipcMain,dialog,win}){
  ipcMain.handle('transfer:remote',async(_event,input)=>{
    try{validate(input);}catch(error){return {ok:false,error:error.message};}
    return new Promise(resolve=>{
      const worker=new(require('node:worker_threads').Worker)(require('node:path').join(__dirname,'database-transfer-worker.cjs'),{workerData:input});let done=false;
      const finish=result=>{if(done)return;done=true;clearTimeout(timer);worker.terminate();resolve(result);};
      const timer=setTimeout(()=>finish({ok:false,error:'Connection/import exceeded two minutes. No local data was changed.'}),120000);
      worker.once('message',finish);worker.once('error',()=>finish({ok:false,error:'Database import worker failed. No local data was changed.'}));worker.once('exit',code=>{if(!done)finish({ok:false,error:'Database import ended before a complete snapshot was produced.'});});
    });
  });
  ipcMain.handle('transfer:save',async(_event,{name,extension,bytes,text})=>{
    if(!['sqlite','sql','csv'].includes(extension))throw Error('Unsupported export type.');
    const suggested=String(name||'database').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,80)+'.'+extension;
    const choice=await dialog.showSaveDialog(win(),{defaultPath:suggested,filters:[{name:extension.toUpperCase(),extensions:[extension]}]});if(choice.canceled)return {canceled:true};
    const content=extension==='sqlite'?Buffer.from(bytes):Buffer.from(String(text),'utf8');if(content.length>200*1024*1024)throw Error('Export exceeds 200 MB.');await fs.promises.writeFile(choice.filePath,content);return {saved:true};
  });
}
module.exports={validate,connect,capture,buildSqlite,sourceType,sqliteValue,setup};
