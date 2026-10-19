(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.PhysicalForeignKeys=api;})(typeof globalThis==="object"?globalThis:this,function(){
// Conservative candidate: exact physical FK tuples, using complete local metadata.
// No model calls, guessed links, query changes or student-specific schema rules.
const fold=s=>String(s).replace(/[A-Z]/g,c=>c.toLowerCase());
const normalize=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').toLowerCase();
const identifier='(?:`[^`\\n]+`|"(?:[^"\\n]|"")*"|\\[[^\\]\\n]+\\]|[\\p{L}_][\\p{L}\\p{N}_$]*)';
const unquote=s=>s.startsWith('`')?s.slice(1,-1):s.startsWith('"')?s.slice(1,-1).replace(/""/g,'"'):s.startsWith('[')?s.slice(1,-1):s;
function columnList(text){
 const items=text.split(',').map(s=>s.trim()),valid=new RegExp('^'+identifier+'$','u');
 return items.length&&items.every(s=>valid.test(s))?items.map(unquote):null;
}
// Both physical-arrow checkers use the same assertion scope. A deliberately
// wrong, historical or hypothetical diagram is not an asserted current fact.
function assertionLines(answer,{textDiagrams=false}={}){
 const result=[];let physical=false,inFence=false,inspectFence=false,offset=0,previous='',excludedScope=false;
 for(const line of String(answer).split('\n')){
  const start=offset;offset+=line.length+1;
  if(/^\s*```/.test(line)){if(inFence){inFence=false;inspectFence=false;}else{inFence=true;inspectFence=textDiagrams&&/^\s*```\s*(?:text|plaintext)?\s*$/.test(line);}continue;}
  if(inFence&&!inspectFence||/^\s*>/.test(line))continue;
  const n=normalize(line.replace(/`[^`]+`/g,' ')),explicit=/\bphysical\s+(?:fk|foreign\s+key)|(?:physical|fiziksel).*(?:direction|yon|fk)|(?:direction|yon).*(?:physical|fiziksel)/.test(n);
  const exclusions=/\b(?:hypothetical|suppose|imagine|old\s+schema|previously|before\s+(?:the\s+)?change|logical|conceptual|incorrect|invalid|wrong|not\s+(?:a\s+)?(?:physical|foreign)|no\s+such)\b|varsay|eski\s+sema|degisiklikten\s+once|mantiksal|kavramsal|yanlis|hatali|fiziksel\s+degil/;
  if(/^\s*#{1,6}\s/.test(line)||/^\s*(?:---|___|\*\*\*)\s*$/.test(line)){physical=explicit;previous='';excludedScope=exclusions.test(n);}
  if(explicit)physical=true;
  const decline=excludedScope||exclusions.test(n+' '+previous);
  if(n.trim())previous=n.slice(-240);
  if(!physical||decline)continue;
  result.push({line,start});
 }return result;
}
function claims(answer,evidence){
 if(evidence.foreignKeyInventoryComplete!==true||!Array.isArray(evidence.foreignKeyInventory))return [];
 const facts=evidence.foreignKeyInventory,tables=new Map((evidence.tables||[]).map(t=>[fold(t.table),new Set(t.columns.map(c=>fold(typeof c==='string'?c:c.name)))]));
 const expression=new RegExp('('+identifier+')[ \\t]*\\(([^()\\n]+)\\)[ \\t]*(→|[─═-]*>|←|<[─═-]*)[ \\t]*('+identifier+')[ \\t]*\\(([^()\\n]+)\\)','gu');
 const result=[];
 for(const {line,start} of assertionLines(answer)){
  for(const match of line.matchAll(expression)){
   let child=unquote(match[1]),parent=unquote(match[4]),childColumns=columnList(match[2]),parentColumns=columnList(match[5]);
   if(match[3]==='←'||match[3].startsWith('<'))[child,parent,childColumns,parentColumns]=[parent,child,parentColumns,childColumns];
   if(!childColumns||!parentColumns||!tables.has(fold(child))||!tables.has(fold(parent)))continue;
   if(childColumns.some(c=>!tables.get(fold(child)).has(fold(c)))||parentColumns.some(c=>!tables.get(fold(parent)).has(fold(c))))continue;
   const relevant=facts.filter(f=>fold(f.child)===fold(child)&&fold(f.parent)===fold(parent));
   // All pairings must form ONE actual group; presentation order may differ.
   if(relevant.some(f=>f.parentColumnsResolved!==false&&f.columns.length===childColumns.length&&childColumns.length===parentColumns.length&&f.columns.every(c=>childColumns.some((v,i)=>fold(v)===fold(c.childColumn)&&fold(parentColumns[i])===fold(c.parentColumn)))))continue;
   if(relevant.some(f=>f.parentColumnsResolved===false||f.columns.some(c=>c.parentColumn===null)))continue;
   result.push({kind:'incorrect-physical-fk-tuple',child,parent,childColumns,parentColumns,actual:relevant.map(f=>({child:f.child,parent:f.parent,columns:f.columns.map(c=>({childColumn:c.childColumn,parentColumn:c.parentColumn}))})),snippet:line.trim().slice(0,350),start:start+match.index,end:start+match.index+match[0].length,line,lineStart:start,raw:match[0]});
  }
 }return result;
}
function review(answer,evidence){return claims(answer,evidence).map(({start,end,line,lineStart,raw,...issue})=>issue);}
function correct(answer,evidence){
 const found=claims(answer,evidence),replacements=[];
 const code=name=>'`'+name+'`';
 for(const issue of found){
  // Only a complete, isolated diagram item. Embedded prose is never rewritten.
  const prefix=issue.line.slice(0,issue.start-issue.lineStart),suffix=issue.line.slice(issue.end-issue.lineStart);
  const overlaps=issue.actual.every(f=>f.columns.some(c=>issue.childColumns.some((v,i)=>fold(v)===fold(c.childColumn)&&fold(issue.parentColumns[i]||'')===fold(c.parentColumn)))||(f.columns.length===issue.childColumns.length&&f.columns.length===issue.parentColumns.length&&f.columns.every(c=>issue.childColumns.some(v=>fold(v)===fold(c.childColumn))&&issue.parentColumns.some(v=>fold(v)===fold(c.parentColumn)))));
  if(!/^\s*[-*]\s+$/.test(prefix)||!/^\s*[.;]?\s*$/.test(suffix)||!issue.actual.length||!overlaps||issue.actual.some(f=>[f.child,f.parent,...f.columns.flatMap(c=>[c.childColumn,c.parentColumn])].some(n=>String(n).includes('`'))))continue;
  const lines=issue.actual.map(f=>prefix+code(f.child)+' ('+f.columns.map(c=>code(c.childColumn)).join(', ')+') → '+code(f.parent)+' ('+f.columns.map(c=>code(c.parentColumn)).join(', ')+')'+suffix);
  replacements.push({start:issue.lineStart,end:issue.lineStart+issue.line.length,text:lines.join('\n')});
 }
 let corrected=String(answer);for(const r of replacements.sort((a,b)=>b.start-a.start))corrected=corrected.slice(0,r.start)+r.text+corrected.slice(r.end);
 return {answer:corrected,changed:replacements.length>0,correctedLines:replacements.length};
}
// Resolve only violations already reported by SQLite. The parent column is on
// the left; unary + removes child affinity so the comparison follows FK rules.
// This also works for WITHOUT ROWID, shadowed rowid aliases and implicit PKs.
function violations(database,options={}){
 const q=name=>'"'+String(name).replace(/"/g,'""')+'"';
 const rows=sql=>database.exec(sql)[0]?.values||[],result=[],seen=new Set();
 const limit=Number.isInteger(options.limit)&&options.limit>0?options.limit:5001;
 const cells=typeof module==='object'&&module.exports?require('./sqlite-values.js'):globalThis.SqliteValues;
 const format=value=>ArrayBuffer.isView(value)?"X'"+Array.from(value).map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase()+"'":cells.text(value);
 for(const [table,,parent,id] of rows('PRAGMA foreign_key_check')){
  const groupKey=JSON.stringify([table,parent,id]);if(seen.has(groupKey))continue;seen.add(groupKey);
  const primary=rows('PRAGMA table_info('+q(parent)+')').filter(c=>c[5]>0).sort((a,b)=>a[5]-b[5]);
  const pairs=rows('PRAGMA foreign_key_list('+q(table)+')').filter(f=>f[0]===id).sort((a,b)=>a[1]-b[1]).map(f=>({child:f[3],parent:f[4]??primary[f[1]]?.[1]}));
  if(!pairs.length||pairs.some(p=>!p.child||!p.parent))throw Error('Unresolved physical foreign key: '+table+' → '+parent);
  const query='SELECT DISTINCT '+pairs.map(p=>'c.'+q(p.child)).join(',')+' FROM '+q(table)+' AS c WHERE '+pairs.map(p=>'c.'+q(p.child)+' IS NOT NULL').join(' AND ')+' AND NOT EXISTS (SELECT 1 FROM '+q(parent)+' AS p WHERE '+pairs.map(p=>'p.'+q(p.parent)+' = +c.'+q(p.child)).join(' AND ')+') LIMIT '+limit;
  const invalid=rows(query);if(!invalid.length)throw Error('SQLite FK violation could not be resolved: '+table+' → '+parent);
  result.push({table,col:pairs.map(p=>p.child).join('+'),parent,pk:pairs.map(p=>p.parent).join('+'),bad:invalid.map(row=>pairs.length===1?format(row[0]):'('+row.map(format).join(', ')+')'),valid:pairs.length===1?rows('SELECT '+q(pairs[0].parent)+' FROM '+q(parent)+' LIMIT 60').map(row=>format(row[0])):[],declared:true,foreignKeyId:id,childColumns:pairs.map(p=>p.child),parentColumns:pairs.map(p=>p.parent)});
 }
 return result;
}
// Materialize the identities of the children actually joined by SQLite's FK
// comparison. A child's own collation must not retarget its siblings.
function linkedPredicate(database,child,parent,pairs,parentPredicate){
 const q=name=>'"'+String(name).replace(/"/g,'""')+'"',rows=sql=>database.exec(sql)[0]?.values||[];
 const info=rows('PRAGMA table_xinfo('+q(child)+')'),names=new Set(info.map(c=>fold(c[1])));
 const withoutRowid=rows('PRAGMA table_list').some(t=>fold(t[1])===fold(child)&&t[4]===1);
 const alias=withoutRowid?null:['rowid','_rowid_','oid'].find(name=>!names.has(name));
 const keys=alias?[alias]:info.filter(c=>c[5]>0).sort((a,b)=>a[5]-b[5]).map(c=>c[1]);
 if(!keys.length)return null;
 const literal=column=>"CASE WHEN typeof("+column+")='text' THEN 'CAST(X'''||hex("+column+")||''' AS TEXT)' ELSE quote("+column+") END";
 const selection=alias?['CAST(c.'+q(alias)+' AS TEXT)']:keys.map(k=>literal('c.'+q(k)));
 const found=rows('SELECT DISTINCT '+selection.join(',')+' FROM '+q(child)+' AS c WHERE EXISTS (SELECT 1 FROM '+q(parent)+' AS p WHERE ('+parentPredicate+') AND '+pairs.map(pair=>'p.'+q(pair.parent)+' = +c.'+q(pair.child)).join(' AND ')+')');
 if(!found.length)return null;
 // A nullable PK in a table with all rowid aliases shadowed is not a unique
 // locator. Do not infer an automatic update for such a row.
 if(!alias&&found.some(row=>row.some(value=>value==='NULL')))return null;
 return alias?q(alias)+' IN ('+found.map(row=>"'"+row[0]+"'").join(',')+')':'('+keys.map(q).join(',')+') IN (VALUES '+found.map(row=>'('+row.join(',')+')').join(',')+')';
}
// Ask the same SQLite build how a literal is stored in this child's column.
// Only a one-cell disposable DB is written; the source connection is read-only.
function assignedLiteral(database,table,column,literalSql,createDatabase){
 const q=name=>'"'+String(name).replace(/"/g,'""')+'"',rows=sql=>database.exec(sql)[0]?.values||[];
 const field=rows('PRAGMA table_xinfo('+q(table)+')').find(c=>fold(c[1])===fold(column));if(!field)return null;
 const type=String(field[2]||'').toUpperCase(),strict=rows('PRAGMA table_list').some(t=>fold(t[1])===fold(table)&&t[5]===1);
 const affinity=strict&&type==='ANY'?'BLOB':type.includes('INT')?'INTEGER':/CHAR|CLOB|TEXT/.test(type)?'TEXT':!type||type.includes('BLOB')?'BLOB':/REAL|FLOA|DOUB/.test(type)?'REAL':'NUMERIC';
 const scratch=createDatabase();
 try{
  scratch.exec('CREATE TABLE assigned(value '+affinity+')');scratch.exec('INSERT INTO assigned VALUES('+literalSql+')');
  return scratch.exec("SELECT CASE WHEN typeof(value)='text' THEN 'CAST(X'''||hex(value)||''' AS TEXT)' ELSE quote(value) END FROM assigned")[0].values[0][0];
 }finally{scratch.close();}
}
return {review,correct,violations,linkedPredicate,assignedLiteral,assertionLines};

});
