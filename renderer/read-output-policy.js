// Complete narrowly explicit output requirements; never infer a population or metric.
// A proposal is accepted only after SQLite returns the same rows (apart from the
// requested rank restriction). Unknown language, ambiguous names and bounded
// previews are left to the existing read validation/repair path.
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./sql-read-contract.js'):root.SqlReadContract);if(typeof module==='object'&&module.exports)module.exports=api;else root.ReadOutputPolicy=api;})(typeof globalThis==='object'?globalThis:this,function(core){
 'use strict';
 const normalize=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').toLowerCase();
 const quote=s=>'"'+String(s).replace(/"/g,'""')+'"';
 const word=t=>t?.type==='word'?t.value.toUpperCase():'';
 const numbers={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20,bir:1,iki:2,uc:3,dort:4,bes:5,alti:6,yedi:7,sekiz:8,dokuz:9,on:10,'on bir':11,'on iki':12,'on uc':13,'on dort':14,'on bes':15,'on alti':16,'on yedi':17,'on sekiz':18,'on dokuz':19,yirmi:20};
 const numberPattern='(?:[1-9]\\d{0,5}|'+Object.keys(numbers).sort((a,b)=>b.length-a.length).join('|')+')';
 function plainRequest(request){
  const text=normalize(request);
  // Instructions embedded in quoted examples, alternatives or hypothetical
  // exercises are not a proof that an output requirement is intended.
  if(/```|~~~|["“”]|\b(?:example|hypothetical|suppose|perhaps|maybe|instead|ornek|varsay|veya|belki)\b/.test(text))return null;
  return text.replace(/`([^`]+)`/g,'$1');
 }
 function rankRequirement(request){
  const text=plainRequest(request);if(!text)return null;
  if(/\b(?:if|eger|unranked)\b|(?:include|preserve|dahil).{0,20}\bnull\b/.test(text))return null;
  const methods=[...new Set((text.match(/\b(?:dense_rank|row_number)\b/g)||[]).concat(/\brank\s*\(|\b(?:use|using|with)\s+rank\b|\brank\s+ile\b/.test(text)?['rank']:[]))];
  if(methods.length!==1)return null;
  const matches=[...text.matchAll(new RegExp('\\b(?:top|first|ilk)\\s+('+numberPattern+')\\s+(?:ranks?\\b|sir(?:a|ayi|alar|alari)\\b)','g'))];
  if(matches.length!==1)return null;
  const match=matches[0],cap=numbers[match[1]]??Number(match[1]);
  if(!Number.isSafeInteger(cap)||cap<1||cap>999999)return null;
  const prefix=text.slice(Math.max(0,match.index-65),match.index),suffix=text.slice(match.index+match[0].length,match.index+match[0].length+50);
  if(/\b(?:do\s+not|don't|dont|not|never|without|except|exclude)\b(?:\s+(?:keep|return|show|include|only|the|any)){0,4}\s*$/.test(prefix)||/^\s*(?:alma|almayin|gosterme|istemiyorum|haric|olmadan)\b/.test(suffix))return null;
  return {method:methods[0].toUpperCase(),cap};
 }
 function orderRequirement(request){
  const text=plainRequest(request);if(!text)return null;
  const clauses=[...text.matchAll(/\b(?:order(?:ed)?|sort(?:ed)?)\s+by\s+([^;\n]+?)(?=[.!?](?![\p{L}\p{N}_])|[;\n]|$)/gu)].map(m=>({body:m[1],at:m.index}));
  const turkish=[...text.matchAll(/(?:^|[;\n.!?]\s*)([^;\n.!?]+?)\s+ile\s+sirala(?:yin|yiniz)?\b/gu)].map(m=>({body:m[1],at:m.index}));
  clauses.push(...turkish);if(clauses.length!==1)return null;
  const clause=clauses[0],prefix=text.slice(Math.max(0,clause.at-45),clause.at);
  if(/\b(?:do\s+not|don't|dont|never|without|not)\s*$/.test(prefix)||/\b(?:siralamadan|siralamayin|siralamak istemiyorum)\b/.test(text))return null;
  const identifier='(?:"[^"\\n]+"|`[^`\\n]+`|\\[[^\\]\\n]+\\]|[\\p{L}_][\\p{L}\\p{N}_$]*)';
  const termPattern=new RegExp('^('+identifier+')(?:\\s*\\.\\s*('+identifier+'))?(?:\\s+(asc|desc|ascending|descending|artan|azalan))?$','u');
  const terms=clause.body.trim().split(/\s*,\s*|\s+then\s+|\s+sonra\s+/);
  if(!terms.length||terms.length>12)return null;
  const result=[];
  for(const item of terms){const match=termPattern.exec(item.trim());if(!match)return null;const unquote=s=>s.replace(/^(?:"|`|\[)|(?:"|`|\])$/g,'');result.push({table:match[2]?unquote(match[1]):null,name:unquote(match[2]||match[1]),direction:['desc','descending','azalan'].includes(match[3])?'DESC':'ASC'});}
  return result;
 }
 function shape(sql,results,options){
  if(!Array.isArray(results)||results.length!==1||!Array.isArray(results[0].values)||results[0].values.length>=(options.maxRows||5000))return null;
  const ts=core.tokens(sql);if(!ts.length)return null;
  let depth=0;const top=[];for(let i=0;i<ts.length;i++){const t=ts[i];if(t.type==='symbol'&&t.value===')')depth--;if(depth===0)top.push(i);if(t.type==='symbol'&&t.value==='(')depth++;if(depth<0)return null;}if(depth)return null;
  const semis=top.filter(i=>ts[i].type==='symbol'&&ts[i].value===';');if(semis.length>1||semis.length===1&&semis[0]!==ts.length-1)return null;
  if(!['SELECT','WITH'].includes(word(ts[0]))||top.some(i=>['LIMIT','OFFSET','UNION','EXCEPT','INTERSECT'].includes(word(ts[i]))))return null;
  if(ts.some(t=>['RANDOM','RANDOMBLOB','CHANGES','TOTAL_CHANGES','LAST_INSERT_ROWID','CURRENT_DATE','CURRENT_TIME','CURRENT_TIMESTAMP'].includes(word(t)))||ts.some(t=>t.type==='string'&&normalize(t.value)==='now')&&ts.some(t=>['DATE','TIME','DATETIME','JULIANDAY','UNIXEPOCH','STRFTIME'].includes(word(t))))return null;
  const analyzed=core.analyze(sql,{...options,ranking:true}),columns=analyzed?.length===1?analyzed[0]:null,result=results[0];
  if(!columns||columns.length!==result.columns?.length)return null;
  const names=result.columns.map(normalize);if(new Set(names).size!==names.length||columns.some((c,i)=>normalize(c.name)!==names[i]))return null;
  return {columns,result,body:String(sql).slice(0,ts.at(semis.length?-2:-1).end),ordered:top.some(i=>word(ts[i])==='ORDER'&&word(ts[i+1])==='BY')};
 }
 function resolveOrder(terms,columns,names){
  if(!terms)return null;
  const result=[];
  for(const term of terms){
   let hits=columns.flatMap((c,i)=>term.table?(c.origin&&normalize(c.origin.table)===term.table&&normalize(c.origin.column)===term.name?[i]:[]):normalize(c.name)===term.name?[i]:[]);
   if(!hits.length&&!term.table&&['rank','sira'].includes(term.name))hits=columns.flatMap((c,i)=>c.kind==='window-rank'?[i]:[]);
   if(hits.length!==1)return null;
   result.push({column:names[hits[0]],direction:term.direction});
  }
  return result;
 }
 function rankIssues(request,sql,results,options={}){
  const requirement=rankRequirement(request),s=requirement&&shape(sql,results,options);if(!s)return [];
  const ranked=s.columns.flatMap((c,i)=>c.kind==='window-rank'&&c.method===requirement.method?[i]:[]);if(ranked.length!==1)return [];
  const index=ranked[0],bad=s.result.values.filter(row=>typeof row[index]==='number'&&row[index]>requirement.cap);
  return bad.length?[{kind:'rank-cap',column:s.result.columns[index],method:requirement.method,requestedMaximum:requirement.cap,observedMaximum:Math.max(...bad.map(row=>row[index])),affectedReturnedRows:bad.length}]:[];
 }
 function complete(request,sql,results,options={}){
  const s=shape(sql,results,options);if(!s)return null;
  const requiredRank=rankRequirement(request),ranked=requiredRank?s.columns.flatMap((c,i)=>c.kind==='window-rank'&&c.method===requiredRank.method?[i]:[]):[];
  const rank=ranked.length===1&&rankIssues(request,sql,results,options).length?{...requiredRank,column:s.result.columns[ranked[0]],index:ranked[0]}:null;
  const terms=orderRequirement(request),order=resolveOrder(terms,s.columns,s.result.columns);
  const zeroColumns=core.zeroCountIssues(request,sql,results,options).map(issue=>s.result.columns.indexOf(issue.column)).filter(index=>index>=0);
  if((rank||zeroColumns.length)&&s.ordered&&!order)return null; // A wrapper must not lose an existing order.
  const addOrder=order&&!s.ordered;
  if(!rank&&!zeroColumns.length&&!addOrder)return null;
  const fields=s.result.columns.map((name,i)=>zeroColumns.includes(i)?'COALESCE('+quote(name)+', 0) AS '+quote(name):quote(name)).join(', '),clauses=[];
  let body=s.body;
  if(rank||zeroColumns.length)body='SELECT '+fields+'\nFROM (\n'+body+'\n) AS "__practisql_output"';
  if(rank){body+='\nWHERE '+quote(rank.column)+' <= '+rank.cap;clauses.push({kind:'rank-cap',method:rank.method,column:rank.column,maximum:rank.cap,partitioned:s.columns[rank.index].partitioned});}
  if(zeroColumns.length)clauses.push({kind:'zero-count',columns:zeroColumns.map(i=>s.result.columns[i])});
  if(order&&(rank||zeroColumns.length||addOrder)){body+='\nORDER BY '+order.map(t=>quote(t.column)+' '+t.direction).join(', ');clauses.push({kind:'output-order',terms:order});}
  return {sql:body+';',clauses,rank,zeroColumns,columns:s.result.columns};
 }
 function verify(plan,before,after){
  if(!plan||before?.length!==1||after?.length!==1||JSON.stringify(after[0].columns)!==JSON.stringify(before[0].columns))return false;
  const expected=(plan.rank?before[0].values.filter(row=>typeof row[plan.rank.index]==='number'&&row[plan.rank.index]<=plan.rank.cap):before[0].values).map(row=>row.map((value,i)=>value===null&&plan.zeroColumns?.includes(i)?0:value));
  const bag=rows=>{const counts=new Map();for(const row of rows){const key=JSON.stringify(row);counts.set(key,(counts.get(key)||0)+1);}return [...counts].sort((a,b)=>a[0].localeCompare(b[0]));};
  return JSON.stringify(bag(expected))===JSON.stringify(bag(after[0].values));
 }
 return {rankRequirement,orderRequirement,rankIssues,complete,verify};
});
