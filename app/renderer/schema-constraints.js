/* Actual SQLite metadata for prompting. No inferred column constraints or defaults. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SchemaConstraints=api;})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const quote=s=>'"'+String(s).replaceAll('"','""')+'"';
 function checks(sql){
  const text=String(sql||''),found=[];let i=0;
  function skipQuoted(){const start=text[i++],end=start==='['?']':start;while(i<text.length){if(text[i]===end){i++;if(start!=='['&&text[i]===end){i++;continue;}return;}i++;}}
  function skipComment(){if(text.startsWith('--',i)){const end=text.indexOf('\n',i+2);i=end<0?text.length:end+1;return true;}if(text.startsWith('/*',i)){const end=text.indexOf('*/',i+2);i=end<0?text.length:end+2;return true;}return false;}
  while(i<text.length){
   if(skipComment())continue;if("'\"`[".includes(text[i])){skipQuoted();continue;}
   const word=/^[A-Za-z_][A-Za-z0-9_$]*/.exec(text.slice(i));if(!word){i++;continue;}i+=word[0].length;
   if(word[0].toUpperCase()!=='CHECK')continue;while(i<text.length){if(skipComment())continue;if(/\s/.test(text[i])){i++;continue;}break;}
   if(text[i]!=='(')continue;const start=++i;let depth=1;
   while(i<text.length&&depth){if(skipComment())continue;if("'\"`[".includes(text[i])){skipQuoted();continue;}if(text[i]==='(')depth++;else if(text[i]===')')depth--;i++;}
   if(!depth)found.push(text.slice(start,i-1).trim());
  }
  return found;
 }
 function describe(db,table){
  const q=quote(table),info=db.exec('PRAGMA table_xinfo('+q+')')[0]?.values||[],indexes=db.exec('PRAGMA index_list('+q+')')[0]?.values||[],parts=[];
  const pk=info.filter(c=>c[5]>0).sort((a,b)=>a[5]-b[5]);if(pk.length)parts.push('PK:'+pk.map(c=>quote(c[1])).join('+'));
  const tableRow=db.exec('PRAGMA table_list')[0]?.values.find(r=>r[0]==='main'&&r[1]===table);
  if(pk.length===1&&String(pk[0][2]).toUpperCase()==='INTEGER'&&tableRow?.[4]===0&&!indexes.some(r=>r[3]==='pk'))parts.push('automatic INTEGER PRIMARY KEY');
  const nn=info.filter(c=>c[3]===1).map(c=>quote(c[1]));if(nn.length)parts.push('NOT NULL:'+nn.join(','));
  const defaults=info.filter(c=>c[4]!==null).map(c=>quote(c[1])+'='+JSON.stringify(String(c[4])));if(defaults.length)parts.push('DEFAULT:'+defaults.join(','));
  const generated=info.filter(c=>c[6]===2||c[6]===3).map(c=>quote(c[1]));if(generated.length)parts.push('GENERATED (do not INSERT):'+generated.join(','));
  for(const index of indexes.filter(r=>r[2]===1&&r[3]!=='pk')){
   const keys=(db.exec('PRAGMA index_xinfo('+quote(index[1])+')')[0]?.values||[]).filter(c=>c[5]===1);
   if(index[4]===0&&keys.length&&keys.every(c=>c[1]>=0&&typeof c[2]==='string'))parts.push('UNIQUE:('+keys.map(c=>quote(c[2])).join(',')+') [collation='+keys.map(c=>c[4]).join(',')+']');
   else{const definition=db.exec("SELECT sql FROM sqlite_master WHERE type='index' AND name="+"'"+String(index[1]).replaceAll("'","''")+"'")[0]?.values[0]?.[0];if(definition)parts.push('INDEX (scope/expression as declared):'+definition);}
  }
  const ddl=db.exec("SELECT sql FROM sqlite_master WHERE type='table' AND name="+"'"+String(table).replaceAll("'","''")+"'")[0]?.values[0]?.[0];for(const body of checks(ddl))parts.push('CHECK:('+body+')');
  const groups=new Map();for(const row of db.exec('PRAGMA foreign_key_list('+q+')')[0]?.values||[]){if(!groups.has(row[0]))groups.set(row[0],[]);groups.get(row[0]).push(row);}
  for(const group of groups.values()){
   group.sort((a,b)=>a[1]-b[1]);const first=group[0],parent=(db.exec('PRAGMA table_xinfo('+quote(first[2])+')')[0]?.values||[]).filter(c=>c[5]>0).sort((a,b)=>a[5]-b[5]);
   parts.push('FK:('+group.map(r=>quote(r[3])).join(',')+')->'+quote(first[2])+'('+group.map((r,i)=>r[4]===null?parent[i]?quote(parent[i][1]):'?':quote(r[4])).join(',')+') [UPDATE='+first[5]+',DELETE='+first[6]+']');
  }
  return parts.join('; ');
 }
 return {describe,checks};
});
