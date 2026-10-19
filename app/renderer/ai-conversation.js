/* Lossless chronological projection. Compaction is a separate operation. */
(function(root,factory){const api=factory(()=>typeof module==='object'&&module.exports?require('./ai-answer-envelope.js'):root.AiAnswerEnvelope);if(typeof module==='object'&&module.exports)module.exports=api;else root.AiConversation=api;})(typeof globalThis==='object'?globalThis:this,function(answerEnvelope){
 'use strict';
 const inScope=(m,o)=>o.scope===undefined||m.scope===o.scope;
 function quoteMessage(q,question){return JSON.stringify({quotedAssistantExcerpt:q.text,sourceMessage:q.messageId,sourceQuestion:q.sourceQuestion,sourceDatabase:q.sourceDatabase,sourceExecution:q.execution,question:String(question||'')});}
 function content(m){
  if(m.role==='assistant'&&m.aiAnswer?.version===1)return answerEnvelope().transcript(m.aiAnswer);
  if(m.role==='user'&&m.aiRequest?.version===1&&typeof m.aiRequest.text==='string'){
   const r=m.aiRequest;return 'Earlier UI action and selected sources: '+JSON.stringify({action:r.action,actionData:r.actionData,sources:r.sources})+'\nStudent request:\n'+r.text;
  }
  return m.quote?'Quoted excerpt: '+quoteMessage(m.quote,m.content):String(m.content||'');
 }
 function providerContent(m){return m.role==='assistant'&&answerEnvelope().is(m.aiAnswer)?answerEnvelope().assistantTranscript(m.aiAnswer):content(m);}
 function entries(chat,options={}){
  const messages=(chat?.messages||[]).slice();if(options.excludeCurrentUser!==false&&messages.at(-1)?.role==='user')messages.pop();
  const out=[];
  for(const m of messages)if(!m.hidden&&['user','assistant'].includes(m.role)&&inScope(m,options)&&content(m)){
   out.push({id:'message:'+m.id,at:m.ts||0,messages:[{role:m.role,content:content(m)}],role:m.role});
   const observations=typeof module==='object'&&module.exports?require('./ai-database-observations.js'):globalThis.AiDatabaseObservations;
   for(const source of observations.sources(m))out.push({id:source.id,at:source.at,role:'observation',messages:[{role:'user',content:'Recorded database inspection (historical evidence, not a new request): '+source.text}]});
   if(m.execution)out.push({id:'outcome:'+m.id,at:m.ts||0,messages:[{role:'user',content:'Recorded execution outcome (application evidence, not a new request): '+JSON.stringify({messageId:m.id,...m.execution})}],role:'outcome'});
  }
  for(const op of chat?.operations||[])if(inScope(op,options)){const results=typeof module==='object'&&module.exports?require('./operation-results.js'):globalThis.OperationResults;out.push({id:'operation:'+op.id,at:op.at||0,role:'operation',messages:[{role:'user',content:'Recorded database operation (historical evidence, not a new request): '+JSON.stringify(results.context(op))}]});}
  return out.sort((a,b)=>a.at-b.at);
 }
 function context(chat,options={}){const all=entries(chat,options);return {entries:all,messages:all.flatMap(e=>e.messages),notes:'',missingTurns:[],storedTurns:all.filter(e=>e.role==='user').length,storedOperations:all.filter(e=>e.role==='operation').length};}
 function recent(messages,options={}){const chat={messages};return sqlProjection(chat,options)(entries(chat,{...options,excludeCurrentUser:!!options.excludeCurrentUser}));}
 // Optional provider-only projection. The archive and compaction entries stay
 // exact. A stored operation link plus the existing execution transform proves
 // correspondence; this is not a search for semantically similar SQL.
 function sqlProjection(chat,{scope,splitSql}={}){
  const presentations=new Map(),bindings=new Map();
  for(const m of chat?.messages||[])if(!m.hidden&&m.role==='assistant'&&inScope(m,{scope})&&m.id&&answerEnvelope().is(m.aiAnswer)){
   const id='message:'+m.id;
   if(presentations.has(id))presentations.set(id,null);
   else presentations.set(id,{original:content(m),text:providerContent(m)});
  }
  const flatten=items=>items.flatMap(e=>{
   const p=presentations.get(e.id),m=e.messages[0];
   return p&&e.role==='assistant'&&e.messages.length===1&&m.role==='assistant'&&m.content===p.original?[{...m,content:p.text}]:e.messages;
  });
  if(typeof splitSql!=='function')return flatten;
  const results=typeof module==='object'&&module.exports?require('./operation-results.js'):globalThis.OperationResults;
  const operations=new Map(),ambiguous=new Set();
  for(const op of chat?.operations||[])if(op.scope===scope){if(operations.has(op.id))ambiguous.add(op.id);operations.set(op.id,op);}
  const candidates=new Map();
  for(const m of chat?.messages||[]){
   if(m.hidden||m.role!=='assistant'||m.scope!==scope||!m.id||!answerEnvelope().is(m.aiAnswer)||m.execution?.status!=='completed')continue;
   const op=operations.get(m.execution.operation);
   if(!op||ambiguous.has(op.id)||op.source!=='ai'||op.status!=='completed'||typeof op.sql!=='string'||!op.sql)continue;
   let statements;try{statements=splitSql(m.aiAnswer.sql);}catch{continue;}
   if(!Array.isArray(statements)||!statements.length||statements.some(s=>typeof s!=='string')||statements.join(';\n')!==op.sql)continue;
   const messageId='message:'+m.id,operationId='operation:'+op.id,entry=results.context(op),original='Recorded database operation (historical evidence, not a new request): '+JSON.stringify(entry);
   delete entry.sql;
   entry.sqlReference={source:messageId,relation:'Same statement texts in the same order; outer whitespace and separating semicolons normalized by the application. Exact executed SQL remains in '+operationId+' via read_context.'};
   const replacement='Recorded database operation (historical evidence, not a new request): '+JSON.stringify(entry);
   const binding={messageId,operationId,sourceText:content(m),original,replacement};
   if(candidates.has(operationId))ambiguous.add(op.id);else candidates.set(operationId,binding);
  }
  for(const [id,b]of candidates)if(!ambiguous.has(id.slice('operation:'.length)))bindings.set(id,b);
  return function project(visible){
   const positions=new Map(),duplicates=new Set();
   visible.forEach((e,i)=>{if(positions.has(e.id))duplicates.add(e.id);positions.set(e.id,i);});
   const changes=new Map();
   for(const b of bindings.values()){
    const sourceIndex=positions.get(b.messageId),operationIndex=positions.get(b.operationId);
    if(sourceIndex===undefined||operationIndex===undefined||sourceIndex>=operationIndex||duplicates.has(b.messageId)||duplicates.has(b.operationId))continue;
    const source=visible[sourceIndex],operation=visible[operationIndex];
    if(source.role!=='assistant'||operation.role!=='operation'||source.messages.length!==1||operation.messages.length!==1||source.messages[0].content!==b.sourceText||operation.messages[0].content!==b.original)continue;
    if(b.replacement.length>=b.original.length)continue;
    changes.set(operationIndex,b.replacement);
   }
   return flatten(visible.map((e,i)=>changes.has(i)?{...e,messages:[{...e.messages[0],content:changes.get(i)}]}:e));
  };
 }
 function sessionId(chat,scope,create){
  if(!chat||!scope)throw new TypeError('Conversation scope required');
  if(!Array.isArray(chat.providerSessions))chat.providerSessions=[];
  const old=chat.providerSessions.find(s=>s.scope===scope&&typeof s.id==='string'&&s.id);if(old)return {id:old.id,changed:false};
  const id=create();if(typeof id!=='string'||!id)throw new TypeError('Session identity required');chat.providerSessions.push({scope,id});return {id,changed:true};
 }
 return {entries,content,providerContent,context,recent,sqlProjection,quoteMessage,sessionId};
});
