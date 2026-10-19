/* SQLite SQL dump retains generated schema, NUL text, integer precision and BLOBs. */
(function(root){
 const qid=name=>'"'+String(name).replace(/"/g,'""')+'"';
 function sqlDump(bytes,SQL){const copy=new SQL.Database(bytes);try{
  const schema=copy.exec("SELECT type,name,sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1 WHEN 'view' THEN 2 ELSE 3 END")[0]?.values||[];
  const sql=['-- PractiSQL SQLite export. Import into an empty database.','PRAGMA foreign_keys=ON;','BEGIN;','PRAGMA defer_foreign_keys=ON;'];
  // All referenced tables and unique indexes must exist before the first INSERT.
  for(const [type,name,ddl]of schema.filter(r=>r[0]==='table'||r[0]==='index'))sql.push(ddl+';');
  for(const [type,name,ddl]of schema.filter(r=>r[0]==='table')){
   const cols=copy.exec('PRAGMA table_xinfo('+qid(name)+')')[0].values.filter(c=>c[6]===0).map(c=>c[1]);
   const rows=copy.exec('SELECT '+cols.map(c=>'CASE WHEN typeof('+qid(c)+")='text' AND instr("+qid(c)+",char(0))>0 THEN 'CAST(X'''||hex("+qid(c)+")||''' AS TEXT)' ELSE quote("+qid(c)+') END').join(',')+' FROM '+qid(name))[0]?.values||[];
   for(const row of rows)sql.push('INSERT INTO '+qid(name)+' ('+cols.map(qid).join(',')+') VALUES ('+row.join(',')+');');
  }
  if(copy.exec("SELECT 1 FROM sqlite_master WHERE name='sqlite_sequence'")[0]?.values.length)for(const [name,seq]of copy.exec('SELECT name,CAST(seq AS TEXT) FROM sqlite_sequence')[0]?.values||[])sql.push('DELETE FROM sqlite_sequence WHERE name='+"'"+String(name).replace(/'/g,"''")+"'; INSERT INTO sqlite_sequence(name,seq) VALUES ('"+String(name).replace(/'/g,"''")+"',"+seq+');');
  for(const [type,name,ddl]of schema.filter(r=>r[0]==='view'||r[0]==='trigger'))sql.push(ddl+';');sql.push('COMMIT;');return sql.join('\n');
 }finally{copy.close();}}
 function csvDump(bytes,SQL,table){const copy=new SQL.Database(bytes);try{
  const cols=copy.exec('PRAGMA table_xinfo('+qid(table)+')')[0]?.values.filter(c=>c[6]!==1).map(c=>c[1]);if(!cols?.length)throw Error('Table not found.');
  const raw=copy.exec('SELECT '+cols.flatMap(c=>['typeof('+qid(c)+')','CASE WHEN typeof('+qid(c)+")='integer' THEN CAST("+qid(c)+" AS TEXT) WHEN typeof("+qid(c)+")='text' THEN CAST("+qid(c)+' AS BLOB) ELSE '+qid(c)+' END']).join(',')+' FROM '+qid(table))[0]?.values||[];
  const decoder=new TextDecoder('utf-8',{ignoreBOM:true});const rows=raw.map(row=>cols.map((c,i)=>row[i*2]==='text'?decoder.decode(row[i*2+1]):row[i*2+1]));
  const quote=v=>'"'+String(v==null?'':v instanceof Uint8Array?'0x'+Array.from(v,x=>x.toString(16).padStart(2,'0')).join(''):v).replace(/"/g,'""')+'"';
  return '\uFEFF'+[cols,...rows].map(row=>row.map(quote).join(',')).join('\r\n');
 }finally{copy.close();}}
 root.DatabaseFormats={sqlDump,csvDump};if(typeof module==='object')module.exports=root.DatabaseFormats;
})(typeof window==='object'?window:globalThis);
