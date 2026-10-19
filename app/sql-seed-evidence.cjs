// Bounded observations of current keys/unique tuples; no proposed task or answer.
const quote=x=>'"'+String(x).replaceAll('"','""')+'"';
function collect(db,{maxTuples=12,maxCharacters=6000,maxTables=32}={}){
 if(!Number.isInteger(maxTuples)||maxTuples<1||maxTuples>32||!Number.isInteger(maxCharacters)||maxCharacters<1024||maxCharacters>16000||!Number.isInteger(maxTables)||maxTables<1||maxTables>128)throw Error('Invalid bounded seed evidence budget');
 const filter="type='table' AND name NOT LIKE 'sqlite_%'",totalTables=db.exec('SELECT COUNT(*) FROM sqlite_master WHERE '+filter)[0].values[0][0];
 const tables=db.exec('SELECT name,sql FROM sqlite_master WHERE '+filter+' ORDER BY name LIMIT '+maxTables)[0]?.values||[],facts=[];
 for(const [table,ddl] of tables){
  const info=db.exec('PRAGMA table_xinfo('+quote(table)+')')[0]?.values||[],pk=info.filter(c=>c[5]>0).sort((a,b)=>a[5]-b[5]),indexes=db.exec('PRAGMA index_list('+quote(table)+')')[0]?.values||[];
  const automaticIntegerKey=pk.length===1&&String(pk[0][2]).toUpperCase()==='INTEGER'&&!/\bWITHOUT\s+ROWID\b/i.test(ddl)&&!indexes.some(i=>i[3]==='pk');
  const entry={table,primaryKey:pk.map(c=>c[1]),automaticIntegerKey,uniqueTuples:[],unrepresentedUniqueIndexes:[]};
  if(automaticIntegerKey)entry.largestExistingIntegerKey=db.exec('SELECT CAST(MAX('+quote(pk[0][1])+') AS TEXT) FROM '+quote(table))[0].values[0][0];
  for(const index of indexes.filter(i=>i[2]===1)){
   const keys=(db.exec('PRAGMA index_xinfo('+quote(index[1])+')')[0]?.values||[]).filter(c=>c[5]===1);
   if(index[4]!==0||!keys.length||keys.some(c=>c[1]<0||c[2]===null)){
    const definition=db.exec('SELECT sql FROM sqlite_master WHERE type=\'index\' AND name=\''+String(index[1]).replaceAll("'","''")+'\'')[0]?.values[0]?.[0];
    entry.unrepresentedUniqueIndexes.push({index:index[1],reason:index[4]!==0?'partial-index':'expression-or-unresolved-key',definition:typeof definition==='string'&&definition.length<=400?definition:null});continue;
   }
   const columns=keys.map(c=>c[2]),where=columns.map(c=>quote(c)+' IS NOT NULL').join(' AND '),limit=maxTuples+1;
   // Never transfer a huge BLOB/string, or round a 64-bit INTEGER through a JS number.
   const projections=columns.flatMap(c=>{const q=quote(c);return ['typeof('+q+')','CASE typeof('+q+') WHEN \'integer\' THEN CAST('+q+' AS TEXT) WHEN \'blob\' THEN hex(substr('+q+',1,16)) WHEN \'text\' THEN substr(CAST('+q+' AS BLOB),1,321) ELSE '+q+' END','CASE WHEN typeof('+q+') IN (\'blob\',\'text\') THEN length(CAST('+q+' AS BLOB)) ELSE NULL END'];});
   const tuples=db.exec('SELECT '+projections.join(',')+' FROM '+quote(table)+' WHERE '+where+' LIMIT '+limit)[0]?.values||[],truncatedCells=[];
   const trimmed=tuples.slice(0,maxTuples).map((row,i)=>columns.map((c,j)=>{
    const [type,value,bytes]=row.slice(j*3,j*3+3);let result=value,shortened=false;
    if(type==='integer'){const number=Number(value);result=Number.isSafeInteger(number)?number:{sqliteType:'integer',decimal:value};}
    else if(type==='text'){
     try{const decoded=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(value);shortened=bytes>321||decoded.length>80;result=decoded.slice(0,80);}
     catch{shortened=true;result={sqliteType:'text',hexPrefix:Array.from(value.slice(0,16),b=>b.toString(16).padStart(2,'0')).join('').toUpperCase(),bytes,encoding:'non-UTF8-or-cut-UTF8'};}
    }
    else if(type==='blob'){shortened=bytes>16;result=shortened?{sqliteType:'blob',hexPrefix:value,bytes}:{sqliteType:'blob',hex:value};}
    else if(type==='real'&&!Number.isFinite(value)){shortened=true;result={sqliteType:'real',special:value>0?'positive-infinity':value<0?'negative-infinity':'not-a-number'};}
    if(shortened)truncatedCells.push({row:i,column:c});return result;
   }));
   entry.uniqueTuples.push({columns,collations:keys.map(c=>c[4]),observedNonNullTuples:trimmed,complete:tuples.length<=maxTuples&&truncatedCells.length===0,truncatedCells});
  }
  facts.push(entry);
 }
 const result={kind:'Observed current main SQLite key and uniqueness facts; no rows are reserved or inserted. TEMP tables and trigger effects are not evaluated.',meaning:'A complete list covers only existing non-NULL tuples for that particular global UNIQUE/PK. NULL tuples are omitted, not forbidden. Partial/shortened lists cannot prove absence. Compare with real SQLite collation. Typed objects preserve exact large integer decimals or BLOB hex; a prefix is incomplete. unrepresentedUniqueIndexes are not summarized global tuple rules. Automatic integer keys may be omitted and actual inserted keys used for links; do not guess future keys. Reuse existing lookup rows only when permitted. Do not bypass explicit collision exercises or exact insert requests.',tables:[],omittedTables:totalTables-tables.length};
 for(const fact of facts){result.tables.push(fact);if(JSON.stringify(result).length>maxCharacters){result.tables.pop();result.omittedTables++;}}
 while(JSON.stringify(result).length>maxCharacters&&result.tables.length){result.tables.pop();result.omittedTables++;}
 if(JSON.stringify(result).length>maxCharacters)throw Error('Evidence envelope exceeds budget');
 return result;
}
module.exports={collect};
