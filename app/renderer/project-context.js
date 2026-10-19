/* Optional project adapter for the application's existing context lifecycle. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?{
 Conversation:require('./project-conversation.js'),Manager:require('./ai-context-manager.js'),Budget:require('./ai-context-budget.js'),Sources:require('./ai-context-sources.js')
}:{Conversation:root.ProjectConversation,Manager:root.AiContextManager,Budget:root.AiContextBudget,Sources:root.AiContextSources});if(typeof module==='object'&&module.exports)module.exports=api;else root.ProjectContext=api;})(typeof globalThis==='object'?globalThis:this,function(dependencies){
 'use strict';
 const {Conversation,Manager,Budget,Sources}=dependencies;
 function create({capacity,calibration=()=>undefined,storage,invoke}){
  if(typeof capacity!=='function'||typeof invoke!=='function'||!storage?.getItem||!storage?.setItem)throw Error('PROJECT_CONTEXT_DEPENDENCIES');
  async function prepare({history=[],assemble,purpose,route,control,tools,presentation='messages'}){
   if(!['project-discovery','project-business-review'].includes(purpose)||!['messages','record'].includes(presentation)||typeof assemble!=='function'||!tools?.projectHandlers)throw Error('PROJECT_CONTEXT_INPUT');
   const assertCurrent=()=>{control.assertActive();tools.assertCurrent();};assertCurrent();
   const original=Conversation.history(history),shown=presentation==='record'?structuredClone(original):Conversation.messages(original);
   const scope=purpose+':'+await Manager.digest(original.slice(0,2));assertCurrent();
   const key='practisql.projectContext.v1:'+scope,raw=storage.getItem(key),chat=raw?JSON.parse(raw):{};
   if(chat.contextCheckpoints&&!Array.isArray(chat.contextCheckpoints))throw Error('PROJECT_CONTEXT_CHECKPOINT');
   for(const c of chat.contextCheckpoints||[])if(c.scope!==scope||!Number.isSafeInteger(c.count)||c.count<0||c.count%2||typeof c.summary!=='string'||!c.summary.trim()||!/^[a-f0-9]{64}$/.test(c.hash))throw Error('PROJECT_CONTEXT_CHECKPOINT');
   const entries=shown.map((m,i)=>({id:'project:turn:'+i,role:m.role,messages:[m]}));
   const reader=Sources.create({chat:{messages:[]},scope,current:entries.map((e,i)=>({id:e.id,kind:original[i].role,text:presentation==='record'?JSON.stringify(original[i]):shown[i].content,origin:{scope,role:original[i].role,execution:'not_asserted'}}))});
   const resolved=await control.wait(capacity(route));assertCurrent();
   const captured={...route,capacity:resolved},definitions=[...tools.definitions,structuredClone(Sources.definition)];
   const prepared=await Manager.prepare({chat,scope,entries,assemble,capacity:resolved,outputReserve:16384,calibration:calibration(captured),tools:definitions,assertCurrent,
    summarize:messages=>control.wait(invoke(messages,undefined,'context-compaction',{...captured,purpose:'context-compaction',contextTools:null,wire:undefined,answerRecord:false,answerExecutionAllowed:false,requestControl:control})),
    save:()=>{assertCurrent();storage.setItem(key,JSON.stringify(chat));}});
   assertCurrent();
   if(prepared.checkpointUsed){tools.definitions=definitions;tools.projectHandlers.read_context=args=>{assertCurrent();return reader.read(args);};}
   const plan=Budget.plan({capacity:resolved,messages:prepared.messages,tools:tools.definitions,outputReserve:16384,calibration:calibration(captured)});
   if(plan.overLimit)throw Error('The active sources exceed this model context window. Original conversation was preserved.');
   return {...prepared,plan,route:captured};
  }
  return {prepare};
 }
 return {create};
});
