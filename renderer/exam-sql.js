/* Blank answers are assembled locally; execution and semantic grading stay separate. */
(function(root,factory){
 const api=factory(typeof module==='object'&&module.exports?require('./sql-read-contract.js'):root.SqlReadContract);
 if(typeof module==='object'&&module.exports)module.exports=api;else root.ExamSql=api;
})(typeof globalThis==='object'?globalThis:this,function(contract){
 'use strict';
 const placeholders=sql=>contract.tokens(sql).filter(token=>token.type==='word'&&token.value==='___');
 function template(question){
  if(question?.type!=='blank')return null;
  let sql=typeof question.sql==='string'?question.sql.trim():'';
  if(!sql){
   const text=String(question.q||''),fences=[...text.matchAll(/```(?:sql|sqlite)?\s*\n([\s\S]*?)```/gi)];
   if(fences.length===1)sql=fences[0][1].trim();
   else {const line=text.match(/(?:^|\n)[ \t]*((?:SELECT|WITH)\b[\s\S]*)/i);if(line)sql=line[1].trim();}
  }
  const tokens=contract.tokens(sql),gaps=placeholders(sql);
  if(!sql||sql.length>5000||!['SELECT','WITH'].includes(tokens[0]?.value.toUpperCase())||!gaps.length||gaps.length>8)return null;
  return {sql,gaps};
 }
 function substitute(source,values){
  const {sql,gaps}=source;let result='',start=0;
  gaps.forEach((gap,i)=>{result+=sql.slice(start,gap.start)+String(values[i]??'').trim();start=gap.end;});
  return result+sql.slice(start);
 }
 function resolve(question,answer={}){
  if(question.type!=='blank'){const sql=String(answer.sql||'').trim();return {sql,complete:!!sql,source:'query'};}
  const source=template(question);
  if(!source)return {sql:'',complete:false,error:'missing-template',source:'blank'};
  const raw=String(answer.sql||'').trim(),typed=Array.isArray(answer.fills);
  let sql=raw,method='completed-query';
  if(!raw||(!typed&&source.gaps.length===1&&!['SELECT','WITH'].includes(contract.tokens(raw)[0]?.value.toUpperCase()))){
   const values=typed?answer.fills:source.gaps.length===1?[raw||String(answer.text||'')]:[];
   if(values.length!==source.gaps.length||values.some(value=>!String(value??'').trim()))return {sql:'',complete:false,error:'unfilled',source:'blank',blankCount:source.gaps.length};
   sql=substitute(source,values);method='filled-template';
  }
  if(placeholders(sql).length)return {sql,complete:false,error:'unfilled',source:method,blankCount:source.gaps.length};
  return {sql,complete:true,source:method,blankCount:source.gaps.length};
 }
 function fullQueryBonus(questions,answers,grades){
  return questions.reduce((total,question,i)=>{
   const answer=answers[i]||{},solution=resolve(question,answer);
   return total+(question.type==='blank'&&grades[i]?.ok===true&&String(answer.sql||'').trim()&&solution.complete&&solution.source==='completed-query'?25:0);
  },0);
 }
 return {template,placeholders,substitute,resolve,fullQueryBonus};
});
