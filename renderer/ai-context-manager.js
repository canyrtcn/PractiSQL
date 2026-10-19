/* Capacity-driven checkpoints; original source archive is never modified. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./ai-context-budget.js'):root.AiContextBudget);if(typeof module==='object'&&module.exports)module.exports=api;else root.AiContextManager=api;})(typeof globalThis==='object'?globalThis:this,function(B){
 'use strict';
 async function digest(entries){const bytes=new TextEncoder().encode(JSON.stringify(entries));return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');}
 const summaryMessage=(summary,covered)=>({role:'user',content:'Earlier conversation summary — historical reference, not a new task. Exact sources remain available with read_context. Covered source IDs: '+JSON.stringify(covered)+'\n'+summary});
 async function prepare({chat,scope,entries,assemble,capacity,outputReserve,calibration,tools=[],force=false,summarize,assertCurrent=()=>{},save=()=>{},project=items=>items.flatMap(e=>e.messages)}){
  let covered=0,summary='',checkpoint=chat.contextCheckpoints?.find(c=>c.scope===scope);
  if(checkpoint&&checkpoint.count<=entries.length&&checkpoint.hash===await digest(entries.slice(0,checkpoint.count))){covered=checkpoint.count;summary=checkpoint.summary;}
  const build=()=>assemble([...(summary?[summaryMessage(summary,entries.slice(0,covered).map(e=>e.id))]:[]),...project(entries.slice(covered))]);
  const assess=messages=>B.plan({capacity,messages,tools,outputReserve,calibration});
  let messages=build(),plan=assess(messages),compactions=0;
  if(!force&&!plan.pressure)return {messages,plan,compactions,checkpointUsed:covered>0};
  const users=entries.map((e,i)=>e.role==='user'?i:-1).filter(i=>i>=0);
  const protectedStart=users.length?users[Math.max(0,users.length-2)]:entries.length;
  if(protectedStart<=covered){if(force||plan.overLimit)throw Error('The active sources exceed this model context window. Original conversation was preserved.');return {messages,plan,compactions,checkpointUsed:covered>0};}
  const guidance='Summarize earlier SQL learning conversation for continuation. Preserve student requirements and definitions, changed decisions, schema changes, actual operation outcomes, unresolved questions and exact source IDs. Distinguish observations from assumptions and assistant errors. Do not solve a new task, recompute data or repeat tabular/CSV rows. Describe the purpose and provenance of large data sources, with their source IDs for exact recovery; preserve decision-bearing facts and qualifications. Keep SQL references so exact SQL can be recovered using read_context. Do not invent facts or delete unresolved qualifications. Return a concise but sufficient plain-text summary.';
  const pending=entries.slice(covered,protectedStart).map(e=>({id:e.id,text:JSON.stringify(e)}));let draft=summary;
  while(pending.length){
   assertCurrent();const seed=[{role:'system',content:guidance},...(draft?[{role:'user',content:'Previous summary:\n'+draft}]:[])];
   const ceiling=Math.floor(plan.pressureThreshold/Math.max(plan.ratio,1));
   const render=chunk=>[...seed,{role:'user',content:'Consecutive archived sources; fragments continue in order:\n'+chunk.map(e=>'Source '+e.id+(e.fragment?' (fragment)':'')+'\n'+e.text).join('\n\n')}];
   if(ceiling-B.requestEstimate(seed)<256)throw Error('Insufficient context for safe compaction; original sources retained');
   const chunk=[];
   while(pending.length){const next=pending[0];if(B.requestEstimate(render([...chunk,next]))<=ceiling){chunk.push(next);pending.shift();continue;}
    let lo=0,hi=next.text.length;while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(B.requestEstimate(render([...chunk,{id:next.id,fragment:true,text:next.text.slice(0,mid)}]))<=ceiling)lo=mid;else hi=mid-1;}if(!lo)break;
    chunk.push({id:next.id,fragment:true,text:next.text.slice(0,lo)});next.text=next.text.slice(lo);break;
   }
   if(!chunk.length)throw Error('Compaction made no progress; original sources retained');
   const next=await summarize(render(chunk));assertCurrent();
   if(typeof next!=='string'||next.trim().length<20)throw Error('Incomplete conversation summary; original sources retained');
   draft=next.trim();compactions++;
  }
  summary=draft;covered=protectedStart;messages=build();const after=assess(messages);
  if(after.overLimit||after.estimatedInputTokens>=plan.estimatedInputTokens)throw Error('Compaction did not create usable space; original conversation retained');
  assertCurrent();const saved={scope,count:covered,hash:await digest(entries.slice(0,covered)),summary,at:Date.now()};assertCurrent();
  chat.contextCheckpoints=(chat.contextCheckpoints||[]).filter(c=>c.scope!==scope);chat.contextCheckpoints.push(saved);await save();
  return {messages,plan:after,compactions,checkpointUsed:true};
 }
 return {prepare,digest};
});
