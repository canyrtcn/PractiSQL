/* Local, metadata-only SQL suggestions. Suggestions never execute SQL. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SqlCompletion=api;})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const identifier=/[\p{L}_][\p{L}\p{N}_$]*/uy;
 const reserved=new Set(('SELECT FROM WHERE GROUP ORDER BY HAVING LIMIT OFFSET JOIN INNER LEFT RIGHT FULL CROSS OUTER ON USING UNION ALL AS AND OR NOT SET VALUES RETURNING WHEN THEN ELSE END ASC DESC INTO UPDATE DELETE INSERT WITH RECURSIVE').split(' '));
 const keywords=('SELECT FROM WHERE GROUP BY ORDER BY HAVING LIMIT OFFSET JOIN LEFT JOIN INNER JOIN CROSS JOIN ON USING AS AND OR NOT IN IS NULL LIKE BETWEEN EXISTS DISTINCT WITH RECURSIVE UNION ALL ASC DESC INSERT INTO UPDATE SET DELETE FROM CREATE TABLE VALUES RETURNING CASE WHEN THEN ELSE END').split(' ');
 const functions=['COUNT','SUM','AVG','MIN','MAX','COALESCE','NULLIF','ROUND','LOWER','UPPER','LENGTH','SUBSTR','ROW_NUMBER','LAG','LEAD','DATE','STRFTIME'];
 const quote=name=>'"'+String(name).replaceAll('"','""')+'"';
 const spelling=name=>/^[\p{L}_][\p{L}\p{N}_$]*$/u.test(name)&&!reserved.has(name.toUpperCase())?name:quote(name);
 function joinCondition(a,b){
  const possibilities=[];
  for(const [child,parent]of [[a,b],[b,a]]){
   const groups=new Map();
   for(const fk of child.table.foreignKeys||[]){
    if(String(fk.table).toLowerCase()!==parent.table.name.toLowerCase()||!fk.from||!fk.to)continue;
    const rows=groups.get(fk.id)||[];rows.push(fk);groups.set(fk.id,rows);
   }
   for(const rows of groups.values()){
    rows.sort((x,y)=>x.seq-y.seq);
    if(rows.some((fk,i)=>fk.seq!==i))continue;
    const ref=(source,column)=>spelling(source.alias||source.table.name)+'.'+spelling(column);
    possibilities.push(rows.map(fk=>ref(child,fk.from)+' = '+ref(parent,fk.to)).join(' AND '));
   }
  }
  return possibilities.length===1?possibilities[0]:null;
 }
 function scan(text,start=0,stop=false){
  const tokens=[];let depth=0,statementStart=start;
  for(let i=start;i<text.length;){
   const ch=text[i],next=text[i+1];if(/\s/.test(ch)){i++;continue;}
   if(ch==='-'&&next==='-'){const end=text.indexOf('\n',i+2);if(end<0)return {tokens,depth,blocked:true,statementStart};i=end+1;continue;}
   if(ch==='/'&&next==='*'){const end=text.indexOf('*/',i+2);if(end<0)return {tokens,depth,blocked:true,statementStart};i=end+2;continue;}
   if(['\'','"','`','['].includes(ch)){
    const end=ch==='['?']':ch;let value='',j=i+1,closed=false;
    while(j<text.length){if(text[j]===end){if(ch!=='['&&text[j+1]===end){value+=end;j+=2;continue;}j++;closed=true;break;}value+=text[j++];}
    if(!closed)return {tokens,depth,blocked:true,statementStart};
    tokens.push({value,upper:value.toUpperCase(),start:i,end:j,depth,quoted:true,string:ch==='\''});i=j;continue;
   }
   if(ch===';'&&depth===0){if(stop)break;tokens.length=0;statementStart=++i;continue;}
   identifier.lastIndex=i;const word=identifier.exec(text);
   if(word){const value=word[0];tokens.push({value,upper:value.toUpperCase(),start:i,end:identifier.lastIndex,depth});i=identifier.lastIndex;continue;}
   if(ch===')')depth=Math.max(0,depth-1);
   tokens.push({value:ch,upper:ch,start:i,end:i+1,depth});if(ch==='(')depth++;i++;
  }
  return {tokens,depth,blocked:false,statementStart};
 }
 function create(vocabulary={}){
  const words=vocabulary.keywords||keywords,funcs=vocabulary.functions||functions,types=vocabulary.types||['INTEGER','TEXT','REAL','BLOB','NUMERIC'];
  let previous='',previousStart=0;
  return function suggest({text,position=text.length,mode='word',schema=[]}){
   if(!['word','next1','next3','line'].includes(mode))mode='word';
   if(position<0||position>text.length)return null;
   if(/[\p{L}\p{N}_$]/u.test(text[position]||''))return null;
   const before=text.slice(0,position),start=previousStart>0&&before.startsWith(previous.slice(0,previousStart))?previousStart:0;
   const parsed=scan(before,start);previous=before;previousStart=parsed.statementStart;
   if(parsed.blocked)return null;
   const typed=/[\p{L}_][\p{L}\p{N}_$]*$/u.exec(before)?.[0]||'';
   if(mode==='word'&&typed.length<2)return null;
   const tokens=parsed.tokens.slice(),partial=tokens.at(-1);
   if(typed&&partial?.end===position&&!partial.quoted)tokens.pop();
   // A completed statement or untouched empty editor is not a request for a new query.
   if(!typed&&!tokens.length)return null;
   const last=tokens.at(-1),upper=last?.upper;
   if(!typed&&!last?.quoted&&['=','<','>','!','+','-','/','%','|','LIMIT','OFFSET'].includes(upper))return null;
   // A future FROM belongs to the same statement, never to a later batch item.
   const entire=scan(text,parsed.statementStart,true).tokens;
   const scopes=[];for(const token of tokens){if(token.value==='('&&!token.quoted)scopes.push(token.start);else if(token.value===')'&&!token.quoted)scopes.pop();}
   // Function/expression parentheses share the surrounding query's aliases.
   // A real nested SELECT starts its own source scope.
   let depth=parsed.depth;
   while(depth>0&&!tokens.some(t=>t.depth===depth&&t.start>scopes[depth-1]&&!t.quoted&&['SELECT','WITH'].includes(t.upper)))depth--;
   const scopeStart=depth?scopes[depth-1]:parsed.statementStart;
   const scopeEnd=depth?entire.find(t=>t.start>=position&&t.value===')'&&t.depth===depth-1)?.start??Infinity:Infinity;
   const inScope=t=>t.start>=scopeStart&&t.start<scopeEnd&&t.depth===depth;
   const same=tokens.filter(inScope),allSame=entire.filter(inScope);
   const tables=new Map(schema.map(t=>[String(t.name).toLowerCase(),t])),sources=[];
   for(let i=0;i<allSame.length;i++){
    if(allSame[i].quoted||!['FROM','JOIN','UPDATE','INTO'].includes(allSame[i].upper))continue;
    let tableAt=i+1,token=allSame[tableAt];if(!token||token.string||token.value==='(')continue;
    // Optional schema qualification (main.table) does not create a new table.
    if(allSame[tableAt+1]?.value==='.')token=allSame[tableAt+2];
    const table=tables.get(token?.value.toLowerCase());if(!table)continue;
    const at=allSame.indexOf(token),next=allSame[at+1]?.upper==='AS'?allSame[at+2]:allSame[at+1];
    const alias=next&&!next.string&&(next.quoted||/^[\p{L}_]/u.test(next.value))&&!reserved.has(next.upper)?next.value:null;
    sources.push({table,alias});
   }
   const uniqueSources=sources.filter((s,i)=>sources.findIndex(t=>(t.alias||t.table.name).toLowerCase()===(s.alias||s.table.name).toLowerCase())===i);
   const parent=uniqueSources.at(-1);
   const linkedTargets=parent?schema.filter(t=>!uniqueSources.some(s=>s.table===t)).map(table=>({table,condition:joinCondition(parent,{table})})).filter(t=>t.condition):[];
   const currentJoin=uniqueSources.length>=2?joinCondition(uniqueSources.at(-2),uniqueSources.at(-1)):null;
   let clause='';for(const token of same)if(!token.quoted&&['SELECT','FROM','JOIN','ON','WHERE','HAVING','GROUP','ORDER','SET','VALUES','INTO','UPDATE'].includes(token.upper))clause=token.upper;
   const columns=source=>(source?.table.columns||[]).map(c=>typeof c==='string'?c:c.name);
   const columnNames=uniqueSources.flatMap(s=>columns(s).flatMap(c=>{
    const qualified=(s.alias?spelling(s.alias)+'.':uniqueSources.length>1?spelling(s.table.name)+'.':'')+spelling(c);
    return qualified!==spelling(c)&&uniqueSources.filter(other=>columns(other).includes(c)).length===1?[qualified,spelling(c)]:[qualified];
   }));
   const qualifier=last?.value==='.'?tokens.at(-2)?.value:null;
   let candidates=[];
   if(qualifier){const source=uniqueSources.find(s=>(s.alias||s.table.name).toLowerCase()===qualifier.toLowerCase())||(!uniqueSources.length&&tables.has(qualifier.toLowerCase())?{table:tables.get(qualifier.toLowerCase())}:null);candidates=columns(source).map(spelling);}
   else if(['FROM','JOIN','INTO','UPDATE'].includes(upper))candidates=schema.map(t=>spelling(t.name));
   else if(upper==='ORDER'||upper==='GROUP')candidates=['BY'];
   else if(['LEFT','INNER','CROSS','RIGHT','FULL'].includes(upper))candidates=['JOIN'];
   else if(upper==='IS')candidates=['NULL','NOT NULL'];
   else if(upper==='NOT')candidates=['NULL','IN','LIKE','BETWEEN','EXISTS'];
   else if(['SELECT','WHERE','ON','HAVING','AND','OR','BY','SET',',','('].includes(upper))candidates=[...columnNames,...(upper==='SELECT'?['*','DISTINCT']:[]),...funcs];
   else if(clause==='SELECT')candidates=[...columnNames,'FROM','AS',...funcs];
   else if(clause==='FROM'||clause==='JOIN')candidates=['WHERE','JOIN','LEFT JOIN','INNER JOIN','GROUP BY','ORDER BY','LIMIT'];
   else if(clause==='ON')candidates=[...columnNames,'AND','OR','WHERE','GROUP BY','ORDER BY'];
   else if(clause==='WHERE'||clause==='HAVING')candidates=[...columnNames,'AND','OR','IS','IN','LIKE','GROUP BY','ORDER BY','LIMIT'];
   else if(clause==='GROUP'||clause==='ORDER')candidates=[...columnNames,'ASC','DESC','HAVING','LIMIT'];
   else candidates=tokens.some(t=>t.upper==='CREATE')?types:words;
   if(upper==='ON'&&!typed&&currentJoin)candidates=[currentJoin];
   if(!typed&&!qualifier&&last&&(last.quoted||/^[\p{L}\p{N}_]/u.test(last.value))&&!reserved.has(upper)){
    if(clause==='SELECT')candidates=allSame.some(t=>!t.quoted&&t.upper==='FROM')?[]:['FROM'];
    else if(clause==='JOIN'&&currentJoin)candidates=['ON '+currentJoin];
    else return null;
   }
   let matches=[...new Set(candidates)].filter(c=>!typed||c.replace(/^"/,'').toLowerCase().startsWith(typed.toLowerCase()));
   if(typed&&matches.some(c=>c.toLowerCase()===typed.toLowerCase()))return null;
   // Never choose an unrelated first table or column when the next token is ambiguous.
   if(!typed&&matches.length>1){if(upper==='SELECT')matches=['*'];else if(['FROM','JOIN','WHERE','ON','AND','OR','BY','SET',',','('].includes(upper))return null;}
   let top=matches[0];if(!top)return null;
   if(mode!=='word'){
    const completed=top.toUpperCase();
    const atEnd=!text.slice(position).trim(),hasFrom=allSame.some(t=>!t.quoted&&t.upper==='FROM');
    if(completed==='SELECT')top+=' *'+(!hasFrom?' FROM'+(schema.length===1?' '+spelling(schema[0].name)+(atEnd?';':''):''):'');
    else if(completed==='FROM'&&uniqueSources.length===0&&schema.length===1)top+=' '+spelling(schema[0].name)+(atEnd?';':'');
    else if(['ORDER','GROUP'].includes(completed))top+=' BY';
    else if(completed==='JOIN'&&atEnd&&linkedTargets.length===1)top+=' '+spelling(linkedTargets[0].table.name)+' ON '+linkedTargets[0].condition;
    else if(upper==='JOIN'&&atEnd){const target=linkedTargets.find(t=>spelling(t.table.name)===top);if(target)top+=' ON '+target.condition;}
    else if(completed==='BY'&&uniqueSources.length===1&&columns(uniqueSources[0]).length===1)top+=' '+columnNames[0];
    else if(upper==='FROM'&&mode==='line'&&matches.length===1&&atEnd)top+=';';
    else if(upper==='SELECT'&&top==='*'&&!hasFrom)top+=' FROM'+(schema.length===1?' '+spelling(schema[0].name)+(atEnd?';':''):'');
   }
   const chunks=top.match(/"(?:[^"]|"")*"|[^\s]+/g)||[];
   const budget=mode==='word'?1:mode==='next1'?(typed?2:1):mode==='next3'?(typed?4:3):Infinity;
   if(chunks.length>budget)top=chunks.slice(0,budget).join(' ');
   if(top.toLowerCase()===typed.toLowerCase())return null;
   return {start:position-typed.length,word:typed,top};
  };
 }
 return {create,scan};
});
