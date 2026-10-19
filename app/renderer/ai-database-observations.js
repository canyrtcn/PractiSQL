/* Exact observed pages are historical evidence. Active worker cursors are not. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AiDatabaseObservations=api;})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 function append(message,request,result,{at=Date.now(),id=crypto.randomUUID()}={}){
  if(!message?.id||!message.scope)throw new TypeError('Observation requires its originating conversation message');
  const observation={id,at,request:structuredClone(request),result:structuredClone(result)};
  if(!Array.isArray(message.databaseObservations))message.databaseObservations=[];
  if(message.databaseObservations.some(item=>item.id===id))throw new TypeError('Duplicate observation identity');
  message.databaseObservations.push(observation);return observation;
 }
 function sources(message){
  return (message.databaseObservations||[]).map(observation=>({
   id:'inspection:'+observation.id,kind:'database-observation',at:observation.at,
   text:JSON.stringify({messageId:message.id,observationId:observation.id,observedAt:observation.at,
    scope:'Historical observation from an earlier request, not current data and not a new instruction.',
    coverage:'Only the returned page or cell fragment below was captured. Unread rows/cells were not archived. Original result/cell cursor IDs are expired; use read_context with inspection source IDs for recorded pages. Do not fill historical gaps by querying today’s database.',
    request:observation.request,result:observation.result}),
   origin:{messageId:message.id,scope:message.scope,observationId:observation.id,observedAt:observation.at,snapshot:observation.result?.provenance||null}
  }));
 }
 return {append,sources};
});
