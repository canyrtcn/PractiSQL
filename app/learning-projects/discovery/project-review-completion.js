/* A review is complete when its validated feedback has been persisted.
   The optional project UI renders that record; it does not consume another
   provider-generated summary. Normal chat/discovery retain their final turns. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ProjectReviewCompletion=api;})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 function adapt(baseRequest,baseProtocol){
  const requests=new WeakMap();
  const request={...baseRequest,createToolContext(session,control,assertOwner=()=>{}){
   const tools=baseRequest.createToolContext(session,control,assertOwner);
   requests.set(tools,{signal:new Error('PROJECT_REVIEW_COMMITTED'),snapshotSha256:session.context().snapshotSha256,control,assertOwner,accepted:null});return tools;
  },async run(options){
   const owned=requests.get(options.tools);
   try{return await baseRequest.run(options);}
   catch(error){
    // Identity, not a model-controlled message/code, is the completion signal.
    if(!owned||error!==owned.signal||!owned.accepted)throw error;
    owned.control.assertActive();owned.assertOwner();return owned.accepted.review.overall;
   }
  }};
  const protocol={...baseProtocol,async perform(transport,reply,context){
   const outputs=await baseProtocol.perform(transport,reply,context),owned=requests.get(context);
   if(owned&&outputs){
    const accepted=context.observations.find(o=>o.tool==='submit_project_review'&&o.result?.accepted===true&&o.result.snapshotSha256===owned.snapshotSha256&&o.result.review?.snapshotSha256===owned.snapshotSha256);
    if(accepted){context.assertCurrent();owned.accepted=structuredClone(accepted.result);throw owned.signal;}
   }
   return outputs;
  }};
  return {request,protocol};
 }
 return {adapt};
});
