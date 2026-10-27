/* Local, metadata-only SQL suggestions. Suggestions never execute SQL. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SqlCompletion=api;})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const identifier=/[\p{L}_][\p{L}\p{N}_$]*/uy;
 const reserved=new Set(('SELECT FROM WHERE GROUP ORDER BY HAVING LIMIT OFFSET JOIN INNER LEFT RIGHT FULL CROSS OUTER NATURAL ON USING UNION ALL INTERSECT EXCEPT AS AND OR NOT SET VALUES RETURNING WHEN THEN ELSE END ASC DESC INTO UPDATE DELETE INSERT WITH RECURSIVE DISTINCT IS IN LIKE BETWEEN EXISTS NULL CASE OVER PARTITION WINDOW ROWS RANGE GROUPS UNBOUNDED PRECEDING FOLLOWING CURRENT ROW NULLS FIRST LAST COLLATE FILTER').split(' '));
 const keywords=('SELECT FROM WHERE GROUP BY ORDER BY HAVING LIMIT OFFSET JOIN LEFT JOIN INNER JOIN CROSS JOIN ON USING AS AND OR NOT IN IS NULL LIKE BETWEEN EXISTS DISTINCT WITH RECURSIVE UNION ALL ASC DESC INSERT INTO UPDATE SET DELETE FROM CREATE TABLE VALUES RETURNING CASE WHEN THEN ELSE END').split(' ');
 const functions=['COUNT','SUM','AVG','MIN','MAX','COALESCE','NULLIF','ROUND','LOWER','UPPER','LENGTH','SUBSTR','ROW_NUMBER','LAG','LEAD','DATE','STRFTIME'];
 const quote=name=>'"'+String(name).replaceAll('"','""')+'"';
 const spelling=name=>/^[\p{L}_][\p{L}\p{N}_$]*$/u.test(name)&&!reserved.has(name.toUpperCase())?name:quote(name);
 const is=(token,...values)=>token&&!token.quoted&&values.includes(token.upper);
 const phraseWords=text=>text.match(/(?:"(?:[^"]|"")*"|[^\s"])+/g)||[];
 const joins=['JOIN','LEFT JOIN','INNER JOIN','CROSS JOIN','RIGHT JOIN','FULL JOIN'];
 const followingSource=['WHERE',...joins,'GROUP BY','ORDER BY','LIMIT'];
 const followingPredicate=['AND','OR','GROUP BY','ORDER BY','LIMIT'];
 function caseContext(tokens,scopeStart){
  const stack=[];
  for(let index=0;index<tokens.length;index++){
   const token=tokens[index];if(token.start<scopeStart||token.quoted||tokens[index-1]?.value==='.')continue;
   if(token.value===')'){while(stack.length&&stack.at(-1).depth>token.depth)stack.pop();}
   if(is(token,'CASE'))stack.push({depth:token.depth,phase:'base'});
   else if(stack.at(-1)?.depth===token.depth){
    if(is(token,'END'))stack.pop();
    else if(is(token,'WHEN','THEN','ELSE'))stack.at(-1).phase=token.upper;
   }
  }
  return stack.at(-1);
 }
 function outputAliases(tokens,position){
  // Projection names belong to one SELECT, never a CTE, sibling or UNION arm.
  if(tokens.some(token=>is(token,'UNION','INTERSECT','EXCEPT')))return [];
  const begin=tokens.findLastIndex(token=>token.start<position&&is(token,'SELECT'));if(begin<0)return [];
  const finish=tokens.findIndex((token,index)=>index>begin&&is(token,'FROM','WHERE','GROUP','HAVING','ORDER','LIMIT','WINDOW'));
  const projection=tokens.slice(begin+1,finish<0?undefined:finish),groups=[[]];
  for(const token of projection){if(token.value===','&&!token.quoted)groups.push([]);else groups.at(-1).push(token);}
  const names=[];
  for(const group of groups){
   const alias=group.at(-1),previous=group.at(-2);if(!alias||!previous||alias.string||!alias.quoted&&(!/^[\p{L}_][\p{L}\p{N}_$]*$/u.test(alias.value)||reserved.has(alias.upper)))continue;
   const explicit=is(previous,'AS')&&group.length>2;
   const implicit=!is(previous,'AS','COLLATE')&&previous.end<alias.start&&(previous.quoted||previous.value===')'||is(previous,'END')||/^[\p{L}\p{N}_]/u.test(previous.value)&&!reserved.has(previous.upper));
   if(explicit||implicit)names.push(alias.value);
  }
  return names.filter((name,index)=>names.findIndex(other=>other.toLowerCase()===name.toLowerCase())===index&&names.filter(other=>other.toLowerCase()===name.toLowerCase()).length===1).map(spelling);
 }
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
   if(mode==='word'&&!typed)return null;
   const tokens=parsed.tokens.slice(),partial=tokens.at(-1);
   if(typed&&partial?.end===position&&!partial.quoted)tokens.pop();
   // A completed statement or untouched empty editor is not a request for a new query.
   if(!typed&&!tokens.length)return null;
   const last=tokens.at(-1),upper=last&&!last.quoted?last.upper:'';
   if(!typed&&!last?.quoted&&['=','<','>','!','+','-','/','%','|','LIMIT','OFFSET'].includes(upper))return null;
   // A future FROM belongs to the same statement, never to a later batch item.
   const entire=scan(text,parsed.statementStart,true).tokens.filter(t=>!typed||t.start!==position-typed.length||t.end!==position);
   const scopes=[];for(let i=0;i<tokens.length;i++){const token=tokens[i];if(token.value==='('&&!token.quoted)scopes.push({token,index:i});else if(token.value===')'&&!token.quoted)scopes.pop();}
   // Function/expression parentheses share the surrounding query's aliases.
   // A real nested SELECT starts its own source scope.
   let depth=parsed.depth;
   while(depth>0&&!tokens.some(t=>t.depth===depth&&t.start>scopes[depth-1].token.start&&is(t,'SELECT','WITH')))depth--;
   const scopeStart=depth?scopes[depth-1].token.start:parsed.statementStart;
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
    const alias=next&&!next.string&&(next.quoted||/^[\p{L}_]/u.test(next.value)&&!reserved.has(next.upper))?next.value:null;
    sources.push({table,alias});
   }
   const uniqueSources=sources.filter((s,i)=>sources.findIndex(t=>(t.alias||t.table.name).toLowerCase()===(s.alias||s.table.name).toLowerCase())===i);
   const relationship=(source,others)=>{const choices=[...new Set(others.map(other=>joinCondition(other,source)).filter(Boolean))];return choices.length===1?choices[0]:null;};
   const linkedTargets=uniqueSources.length?schema.filter(t=>!uniqueSources.some(s=>s.table===t)).map(table=>({table,condition:relationship({table},uniqueSources)})).filter(t=>t.condition):[];
   const currentJoin=uniqueSources.length>=2?relationship(uniqueSources.at(-1),uniqueSources.slice(0,-1)):null;
   // Source visibility follows SELECT scopes. Window clauses have a separate
   // grammar scope, so their ORDER BY cannot become the outer SELECT list.
   const windowScope=scopes.findLast(open=>open.token.depth>=depth&&(is(tokens[open.index-1],'OVER')||is(tokens[open.index-1],'AS')&&same.some(t=>is(t,'WINDOW'))));
   const grammarDepth=windowScope?windowScope.token.depth+1:depth;
   const local=windowScope?tokens.filter(t=>t.start>windowScope.token.start&&t.depth===grammarDepth):same;
   let clause='';for(const token of local)if(is(token,'SELECT','FROM','JOIN','ON','WHERE','HAVING','GROUP','ORDER','PARTITION','SET','VALUES','INTO','UPDATE','ROWS','RANGE','GROUPS'))clause=token.upper;
   const insideExpression=parsed.depth>grammarDepth;
   const atEnd=!entire.some(t=>t.start>=position&&t.start<scopeEnd);
   const hasFrom=allSame.some(t=>is(t,'FROM'));
   const columns=source=>(source?.table.columns||[]).map(c=>typeof c==='string'?c:c.name);
   const columnNames=uniqueSources.flatMap(s=>columns(s).flatMap(c=>{
    const qualified=(s.alias?spelling(s.alias)+'.':uniqueSources.length>1?spelling(s.table.name)+'.':'')+spelling(c);
    return qualified!==spelling(c)&&uniqueSources.filter(other=>columns(other).includes(c)).length===1?[qualified,spelling(c)]:[qualified];
   }));
   const qualifier=last?.value==='.'?tokens.at(-2)?.value:null;
   const wildcard=upper==='*'&&(is(tokens.at(-2),'SELECT','DISTINCT')||tokens.at(-2)?.value==='.'||clause==='SELECT'&&!insideExpression&&tokens.at(-2)?.value===',');
   const operand=last&&(wildcard||last.quoted||last.value===')'||is(last,'END','NULL','TRUE','FALSE')||/^[\p{L}\p{N}_]/u.test(last.value)&&!reserved.has(last.upper));
   const aliases=!windowScope&&['ORDER','HAVING'].includes(clause)?outputAliases(allSame,position):[];
   const expression=[...aliases,...columnNames,...funcs,'CASE','NULL'];
   const activeCase=caseContext(tokens,scopeStart),caseLevel=activeCase?.depth===parsed.depth;
   const frame=windowScope&&['ROWS','RANGE','GROUPS'].includes(clause);
   const frameTokens=frame?local.slice(local.findLastIndex(t=>is(t,'ROWS','RANGE','GROUPS'))+1):[];
   const frameBetween=frameTokens.some(t=>is(t,'BETWEEN')),frameEnd=frameTokens.some(t=>is(t,'AND'));
   let candidates=[];
   if(qualifier){const source=uniqueSources.find(s=>(s.alias||s.table.name).toLowerCase()===qualifier.toLowerCase())||(!uniqueSources.length&&tables.has(qualifier.toLowerCase())?{table:tables.get(qualifier.toLowerCase())}:null);candidates=columns(source).map(spelling);}
   else if(caseLevel&&upper==='CASE')candidates=['WHEN',...expression];
   else if(caseLevel&&['WHEN','THEN','ELSE'].includes(upper))candidates=[...expression,...(upper==='WHEN'?['NOT','EXISTS']:[])];
   else if(caseLevel&&operand){
    if(activeCase.phase==='base')candidates=['WHEN'];
    else if(activeCase.phase==='WHEN')candidates=['THEN','AND','OR','IS','IN','LIKE','BETWEEN'];
    else if(activeCase.phase==='THEN')candidates=['WHEN','ELSE','END'];
    else if(activeCase.phase==='ELSE')candidates=['END'];
   }
   else if(['FROM','JOIN','INTO','UPDATE'].includes(upper))candidates=schema.map(t=>spelling(t.name));
   else if(['ORDER','GROUP','PARTITION'].includes(upper))candidates=['BY'];
   else if(['LEFT','RIGHT','FULL'].includes(upper))candidates=['JOIN','OUTER JOIN'];
   else if(['INNER','CROSS','OUTER','NATURAL'].includes(upper))candidates=['JOIN'];
   else if(upper==='IS')candidates=['NULL','NOT NULL'];
   else if(upper==='NOT')candidates=is(tokens.at(-2),'IS')?['NULL']:['NULL','IN','LIKE','BETWEEN','EXISTS'];
   else if(upper==='NULLS')candidates=['FIRST','LAST'];
   else if(upper==='COLLATE')candidates=['NOCASE','BINARY','RTRIM'];
   else if(frame){
    if(upper==='UNBOUNDED')candidates=[frameEnd?'FOLLOWING':'PRECEDING'];
    else if(upper==='CURRENT')candidates=['ROW'];
    else if(upper==='AND')candidates=['CURRENT ROW','UNBOUNDED FOLLOWING'];
    else if(upper==='BETWEEN')candidates=['UNBOUNDED PRECEDING','CURRENT ROW'];
    else if(['ROWS','RANGE','GROUPS'].includes(upper))candidates=['UNBOUNDED PRECEDING','CURRENT ROW','BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW'];
    else if(upper==='PRECEDING'||upper==='FOLLOWING'||upper==='ROW')candidates=frameBetween&&!frameEnd?['AND CURRENT ROW']:[];
    else candidates=['PRECEDING','FOLLOWING'];
   }
   else if(windowScope&&last===windowScope.token)candidates=['PARTITION BY','ORDER BY','ROWS','RANGE','GROUPS'];
   else if(['SELECT','WHERE','ON','HAVING','AND','OR','BY','SET','DISTINCT',',','(','=','<','>','!','+','-','/','%','|'].includes(upper)||upper==='*'&&!wildcard){
    candidates=[...(upper==='SELECT'?['*','DISTINCT']:[]),...expression,...(['WHERE','ON','HAVING','AND','OR'].includes(upper)?['NOT','EXISTS']:[])];
   }
   else if(tokens.some(t=>is(t,'CREATE')))candidates=types;
   else if(operand){
    if(clause==='ORDER'&&!insideExpression)candidates=[...(!['ASC','DESC','FIRST','LAST'].includes(upper)?['ASC','DESC','COLLATE']:[]),'NULLS FIRST','NULLS LAST',...(windowScope?['ROWS','RANGE','GROUPS']:['LIMIT','OFFSET'])];
    else if(clause==='PARTITION'&&!insideExpression)candidates=['ORDER BY','ROWS','RANGE','GROUPS'];
    else if(clause==='SELECT'&&!insideExpression)candidates=[...(!hasFrom?['FROM']:[]),'AS'];
    else if((clause==='FROM'||clause==='JOIN')&&!insideExpression)candidates=[...(clause==='JOIN'?['ON','USING']:[]),'AS',...followingSource];
    else if(clause==='ON'&&!insideExpression)candidates=['AND','OR',...followingSource];
    else if(clause==='WHERE'||clause==='HAVING')candidates=['IS','IN','LIKE','BETWEEN',...followingPredicate];
    else if(clause==='GROUP'&&!insideExpression)candidates=['HAVING','ORDER BY','LIMIT'];
   }
   else if(['ASC','DESC','FIRST','LAST'].includes(upper)&&clause==='ORDER')candidates=['NULLS FIRST','NULLS LAST',...(windowScope?['ROWS','RANGE','GROUPS']:['LIMIT','OFFSET'])];
   else if(clause==='FROM'||clause==='JOIN')candidates=followingSource;
   else if(!tokens.length)candidates=words.filter(w=>['SELECT','INSERT','UPDATE','DELETE','CREATE','WITH','EXPLAIN','PRAGMA'].includes(w));
   if(upper==='ON'&&!typed&&currentJoin)candidates=[currentJoin];
   let matches=[...new Set(candidates)].filter(c=>!typed||c.replace(/^"/,'').toLowerCase().startsWith(typed.toLowerCase()));
   // Never choose an unrelated first table or column when the next token is ambiguous.
   if(!typed&&matches.length>1){if(upper==='SELECT')matches=['*'];else if(['LEFT','RIGHT','FULL'].includes(upper))matches=['JOIN'];else return null;}
   if(!typed&&operand&&!qualifier&&!caseLevel){if(clause==='SELECT')matches=!hasFrom?['FROM']:[];else if(clause==='JOIN'&&currentJoin)matches=['ON '+currentJoin];else return null;}
   let top=matches[0];if(!top)return null;
   if(mode!=='word'){
    const completed=top.toUpperCase();
    if(completed==='SELECT')top+=' *'+(!hasFrom?' FROM'+(schema.length===1?' '+spelling(schema[0].name)+(atEnd?';':''):''):'');
    else if(completed==='INSERT')top+=' INTO';
    else if(completed==='DELETE')top+=' FROM';
    else if(completed==='CREATE')top+=' TABLE';
    else if(completed==='FROM'&&uniqueSources.length===0&&schema.length===1)top+=' '+spelling(schema[0].name)+(atEnd?';':'');
    else if(['ORDER','GROUP','PARTITION'].includes(completed))top+=' BY';
    else if(/^(?:(?:LEFT|RIGHT|FULL)(?: OUTER)? |INNER |CROSS |NATURAL |OUTER )?JOIN$/.test(completed)&&atEnd&&linkedTargets.length===1)top+=' '+spelling(linkedTargets[0].table.name)+(!/CROSS|NATURAL/.test(completed)&&!['CROSS','NATURAL'].includes(upper)&&!is(tokens.at(-2),'NATURAL')?' ON '+linkedTargets[0].condition:'');
    else if(upper==='JOIN'&&atEnd){const target=linkedTargets.find(t=>spelling(t.table.name)===top);if(target)top+=' ON '+target.condition;}
    else if(completed==='ON'&&atEnd&&currentJoin)top+=' '+currentJoin;
    else if(completed==='BY'&&uniqueSources.length===1&&columns(uniqueSources[0]).length===1)top+=' '+columnNames[0];
    else if(upper==='FROM'&&mode==='line'&&matches.length===1&&atEnd)top+=';';
    else if(upper==='SELECT'&&top==='*'&&!hasFrom)top+=' FROM'+(schema.length===1?' '+spelling(schema[0].name)+(atEnd?';':''):'');
   }
   let chunks=phraseWords(top);
   // A continuation is inserted before existing SQL, never over its suffix.
   const right=text.slice(position).trimStart().toUpperCase();
   for(let i=1;i<chunks.length;i++){const suffix=chunks.slice(i).join(' ').toUpperCase();if(right.startsWith(suffix)&&(!right[suffix.length]||!/[\p{L}\p{N}_$]/u.test(right[suffix.length]))){chunks=chunks.slice(0,i);break;}}
   const budget=mode==='word'?1:mode==='next1'?(typed?2:1):mode==='next3'?(typed?4:3):Infinity;
   top=chunks.slice(0,budget).join(' ');
   if(top.toLowerCase()===typed.toLowerCase())return null;
   return {start:position-typed.length,word:typed,top};
  };
 }
 return {create,scan};
});
