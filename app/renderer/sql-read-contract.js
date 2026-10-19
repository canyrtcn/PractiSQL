/* Local proofs about returned read values. Unknown syntax is not treated as a violation. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SqlReadContract=api;})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const fold=s=>String(s).replace(/[A-Z]/g,c=>c.toLowerCase());
 const word=t=>t?.type==='word'?t.value.toUpperCase():'';
 const ident=t=>t&&['word','identifier'].includes(t.type);
 const symbol=(t,value)=>t?.type==='symbol'&&t.value===value;
 function tokens(sql){
  const text=String(sql),out=[];let i=0;
  while(i<text.length){
   if(/\s/.test(text[i])){i++;continue;}
   if(text.startsWith('--',i)){const end=text.indexOf('\n',i+2);i=end<0?text.length:end+1;continue;}
   if(text.startsWith('/*',i)){const end=text.indexOf('*/',i+2);if(end<0)return [];i=end+2;continue;}
   const start=i,c=text[i];
   if(['\'', '"','`','['].includes(c)){
    const close=c==='['?']':c;let value='',closed=false;i++;
    while(i<text.length){if(text[i]===close){if(close!==']'&&text[i+1]===close){value+=close;i+=2;continue;}i++;closed=true;break;}value+=text[i++];}
    if(!closed)return [];out.push({type:c==='\''?'string':'identifier',value,start,end:i});continue;
   }
   const match=text.slice(i).match(/^[\p{L}_$][\p{L}\p{N}_$]*|^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/u);
   if(match){i+=match[0].length;out.push({type:/^[\d.]/.test(match[0])?'number':'word',value:match[0],start,end:i});continue;}
   i++;out.push({type:'symbol',value:c,start,end:i});
  }return out;
 }
 function closeAt(ts,i){let n=0;for(let k=i;k<ts.length;k++){if(symbol(ts[k],'('))n++;else if(symbol(ts[k],')')&&--n===0)return k;}return -1;}
 function top(ts){const out=[];for(let i=0;i<ts.length;i++){out.push(i);if(ts[i].type==='symbol'&&ts[i].value==='('){const end=closeAt(ts,i);if(end<0)return [];i=end;}}return out;}
 function split(ts,separator){const parts=[];let start=0;for(const i of top(ts))if(ts[i].type==='symbol'&&ts[i].value===separator){parts.push(ts.slice(start,i));start=i+1;}parts.push(ts.slice(start));return parts.filter(p=>p.length);}
 function unparen(ts){while(symbol(ts[0],'(')&&closeAt(ts,0)===ts.length-1)ts=ts.slice(1,-1);return ts;}
 const boundary=new Set(['WHERE','GROUP','HAVING','WINDOW','ORDER','LIMIT','UNION','INTERSECT','EXCEPT','RETURNING']);
 const joinWords=new Set(['JOIN','LEFT','RIGHT','FULL','INNER','OUTER','CROSS','NATURAL','ON','USING','INDEXED','NOT']);
 function analyze(sql,options={}){
  const text=String(sql);
  function query(ts,outer=new Map(),depth=0){
   if(depth>10)return null;ts=unparen(ts);const ctes=new Map(outer);let pos=0;
   if(word(ts[pos])==='WITH'){
    pos++;if(word(ts[pos])==='RECURSIVE')pos++;
    do{
     if(!ident(ts[pos]))return null;const name=fold(ts[pos++].value);let names=null;
     if(ts[pos]?.value==='('){const end=closeAt(ts,pos);if(end<0)return null;names=split(ts.slice(pos+1,end),',').map(p=>p.length===1&&ident(p[0])?p[0].value:null);pos=end+1;}
     if(word(ts[pos++])!=='AS')return null;
     if(word(ts[pos])==='NOT')pos++;if(word(ts[pos])==='MATERIALIZED')pos++;
     if(ts[pos]?.value!=='(')return null;const end=closeAt(ts,pos);if(end<0)return null;
     ctes.set(name,null);let columns=query(ts.slice(pos+1,end),ctes,depth+1);
     if(names){if(!columns||names.length!==columns.length||names.some(n=>n===null))columns=null;else columns=columns.map((c,i)=>({...c,name:names[i]}));}
     ctes.set(name,columns);pos=end+1;
     if(ts[pos]?.value!==',')break;pos++;
    }while(pos<ts.length);
   }
   if(word(ts[pos])!=='SELECT')return null;
   const indexes=top(ts.slice(pos)).map(i=>i+pos);
   if(indexes.some(i=>['UNION','INTERSECT','EXCEPT'].includes(word(ts[i]))))return null;
   const from=indexes.find(i=>word(ts[i])==='FROM'),endFrom=from===undefined?ts.length:(indexes.find(i=>i>from&&boundary.has(word(ts[i])))??ts.length);
   const sources=[];let mergedStar=false;
   if(from!==undefined){
    const input=ts.slice(from+1,endFrom);let at=0,needSource=true;
    while(at<input.length){
     if(!needSource){if(input[at].value===','||word(input[at])==='JOIN'){at++;needSource=true;continue;}if(['NATURAL','USING'].includes(word(input[at])))mergedStar=true;if(input[at].value==='('){const end=closeAt(input,at);if(end<0)return null;at=end+1;}else at++;continue;}
     while(joinWords.has(word(input[at]))){if(word(input[at])==='NATURAL')mergedStar=true;at++;}
     let name=null,columns=null;
     if(input[at]?.value==='('){const end=closeAt(input,at);if(end<0)return null;columns=query(input.slice(at+1,end),ctes,depth+1);at=end+1;}
     else if(ident(input[at])){
      name=input[at++].value;while(input[at]?.value==='.'&&ident(input[at+1])){name=input[at+1].value;at+=2;}
      if(input[at]?.value==='('){const end=closeAt(input,at);if(end<0)return null;at=end+1;}
      else if(ctes.has(fold(name)))columns=ctes.get(fold(name));
      else {const cols=typeof options.columns==='function'?options.columns(name):options.columns?.[name];if(cols)columns=cols.map(c=>({name:typeof c==='string'?c:c.name,kind:'base',origin:{table:name,column:typeof c==='string'?c:c.name}}));}
     }else return null;
     let alias=name;if(word(input[at])==='AS'){at++;if(!ident(input[at]))return null;alias=input[at++].value;}
     else if(ident(input[at])&&!joinWords.has(word(input[at]))){alias=input[at++].value;}
     sources.push({name,alias,columns});needSource=false;
    }
   }
   function expression(expr){
    expr=unparen(expr);
    if(expr.length===1&&ident(expr[0])){const matches=sources.flatMap(s=>(s.columns||[]).filter(c=>fold(c.name)===fold(expr[0].value)));return matches.length===1?matches[0]:{kind:'unknown'};}
    if(expr.length===3&&ident(expr[0])&&expr[1].value==='.'&&ident(expr[2])){const source=sources.find(s=>fold(s.alias||s.name)===fold(expr[0].value));return source?.columns?.find(c=>fold(c.name)===fold(expr[2].value))||{kind:'unknown'};}
    if(options.ranking&&['DENSE_RANK','RANK','ROW_NUMBER'].includes(word(expr[0]))&&symbol(expr[1],'(')&&symbol(expr[2],')')&&word(expr[3])==='OVER'&&symbol(expr[4],'(')&&closeAt(expr,4)===expr.length-1){
     const window=expr.slice(5,-1),indexes=top(window);
     if(indexes.some(i=>word(window[i])==='ORDER'&&word(window[i+1])==='BY'))return {kind:'window-rank',method:word(expr[0]),partitioned:indexes.some(i=>word(window[i])==='PARTITION'&&word(window[i+1])==='BY')};
    }
    if(word(expr[0])==='COUNT'&&expr[1]?.value==='('){
     const end=closeAt(expr,1);if(end<0)return {kind:'unknown'};
     let tail=end+1;while(['FILTER','OVER'].includes(word(expr[tail]))&&expr[tail+1]?.value==='('){const finish=closeAt(expr,tail+1);if(finish<0)return {kind:'unknown'};tail=finish+1;}
     if(tail!==expr.length)return {kind:'unknown'};
     const args=expr.slice(word(expr[2])==='DISTINCT'?3:2,end),argument=expression(args);
     return {kind:'count',inputs:argument.origin?[argument.origin]:args.length===1&&args[0].value==='*'&&sources.length===1&&sources[0].name?[{table:sources[0].name,column:null}]:[]};
    }
    if(['COALESCE','IFNULL'].includes(word(expr[0]))&&expr[1]?.value==='('&&closeAt(expr,1)===expr.length-1){
     const args=split(expr.slice(2,-1),',');if(args.length===2&&args[1].length===1&&args[1][0].type==='number'&&Number(args[1][0].value)===0){const source=expression(args[0]);if(source.kind==='count')return {...source,zeroed:true};}
    }
    return {kind:'unknown'};
   }
   let start=pos+1;if(['DISTINCT','ALL'].includes(word(ts[start])))start++;
   const projected=split(ts.slice(start,from??(indexes.find(i=>i>pos&&boundary.has(word(ts[i])))??ts.length)),','),result=[];
   for(let expr of projected){
    let alias=null;const as=top(expr).find(i=>word(expr[i])==='AS');
    if(as!==undefined){if(as!==expr.length-2||!ident(expr[as+1]))return null;alias=expr[as+1].value;expr=expr.slice(0,as);}
    else if(expr.length>1&&ident(expr.at(-1))&&(expr.at(-2).value===')'||expr.length===2||expr.length===4&&expr[1].value==='.')){alias=expr.at(-1).value;expr=expr.slice(0,-1);}
    if(expr.length===1&&expr[0].value==='*'){if(mergedStar||sources.some(s=>!s.columns))return null;result.push(...sources.flatMap(s=>s.columns));continue;}
    if(expr.length===3&&ident(expr[0])&&expr[1].value==='.'&&expr[2].value==='*'){const source=sources.find(s=>fold(s.alias||s.name)===fold(expr[0].value));if(!source?.columns)return null;result.push(...source.columns);continue;}
    const name=alias||(expr.length===1&&ident(expr[0])?expr[0].value:expr.length===3&&expr[1].value==='.'?expr[2].value:text.slice(expr[0]?.start,expr.at(-1)?.end));
    result.push({...expression(expr),name});
   }
   return result;
  }
  return split(tokens(text),';').map(ts=>query(ts));
 }
 function requestsZeroCounts(request){
  const text=String(request||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').toLowerCase();
  const count=/\b(?:counts?|number|how many)\b|\bsay(?:isi|ilari|im|imlar)|\bkac\b|\badet/.test(text),zero=/\b(?:0|zero(?:s|es)?|sifir[a-z]*)\b/.test(text);
  const negative=/\b(?:do not|don't|dont|never)\s+(?:replace|convert|fill|use)\b.{0,35}\b(?:zero|0)\b|\b(?:keep|leave|preserve)\b.{0,25}\bnull\b|\b(?:sifir|0)\b.{0,20}(?:cevirme|donusturme|doldurma)|null\s+(?:kalsin|korunsun)/.test(text);
  return count&&zero&&!negative;
 }
 function zeroCountIssues(request,sql,results,options={}){
  if(!requestsZeroCounts(request)||!Array.isArray(results))return [];
  const statements=analyze(sql,options);if(statements.length!==results.length)return [];
  const issues=[];
  statements.forEach((columns,statement)=>{const result=results[statement];if(!columns||columns.length!==result?.columns?.length)return;
   columns.forEach((column,index)=>{if(column.kind!=='count')return;const rows=(result.values||[]).flatMap((row,i)=>row[index]===null?[i+1]:[]);if(rows.length)issues.push({kind:'zero-count',statement:statement+1,column:result.columns[index],observed:null,observedRows:rows.slice(0,3),affectedReturnedRows:rows.length});});
  });return issues;
 }
 return {analyze,zeroCountIssues,requestsZeroCounts,tokens};
});
