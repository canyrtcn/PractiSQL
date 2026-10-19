/* Preserve native frames, including signed/opaque reasoning, within a request. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AiToolProtocol=api;})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 function definitions(transport,tools){return tools.map(d=>transport==='messages'?{name:d.name,description:d.description,input_schema:d.parameters}:transport==='responses'?{type:'function',...d,strict:true}:{type:'function',function:{...d,strict:true}});}
 function calls(transport,reply){
  if(transport==='messages')return (reply.content||[]).filter(x=>x.type==='tool_use').map(x=>({id:x.id,name:x.name,args:x.input}));
  if(transport==='responses')return (reply.output||[]).filter(x=>x.type==='function_call').map(x=>({id:x.call_id,name:x.name,args:x.arguments}));
  return (reply.choices?.[0]?.message?.tool_calls||[]).map(x=>({id:x.id,name:x.function?.name,args:x.function?.arguments}));
 }
 function append(transport,prior,reply,outputs){
  if(transport==='messages')return [...prior,{role:'assistant',content:structuredClone(reply.content)},{role:'user',content:outputs.map(x=>({type:'tool_result',tool_use_id:x.id,content:x.text,...(x.error?{is_error:true}:{})}))}];
  if(transport==='responses')return [...prior,...structuredClone(reply.output||[]),...outputs.map(x=>({type:'function_call_output',call_id:x.id,output:x.text}))];
  return [...prior,structuredClone(reply.choices[0].message),...outputs.map(x=>({role:'tool',tool_call_id:x.id,content:x.text}))];
 }
 async function perform(transport,reply,context){
  const found=calls(transport,reply);if(!found.length)return null;
  if(!context)throw Error('Unexpected tool request without a source reader');
  context.assertCurrent?.();const ids=new Set(),outputs=[];
  for(const call of found){
   if(typeof call.id!=='string'||!call.id||ids.has(call.id))throw Error('Invalid tool call identity');ids.add(call.id);
   if(context.calls>=context.maxCalls)throw Error('Context inspection did not finish within its request budget');
   context.calls++;let result;
   try{const args=typeof call.args==='string'?JSON.parse(call.args):call.args;result=call.name==='read_context'?await context.reader.read(args):call.name==='inspect_database'&&context.dataReader?await context.dataReader.read(args):{error:'Unknown read-only tool'};}catch{result={error:'Context source could not be read; no result was recovered'};}
   context.assertCurrent?.();const text=JSON.stringify(result);outputs.push({id:call.id,text,error:!!result.error});context.observations.push({tool:call.name,result});
  }
  return outputs;
 }
 return {definitions,calls,append,perform};
});
