/* One user request owns its cancellation signal, including tool continuations. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AiRequestControl=api;})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 function create(){
  const controller=new AbortController();let phase='waiting';
  const assertActive=()=>{if(controller.signal.aborted)throw controller.signal.reason;};
  function wait(value){
   const work=Promise.resolve(value);
   return new Promise((resolve,reject)=>{
    const aborted=()=>reject(controller.signal.reason);
    controller.signal.addEventListener('abort',aborted,{once:true});
    if(controller.signal.aborted)aborted();
    work.then(result=>{assertActive();return result;}).then(resolve,reject).finally(()=>controller.signal.removeEventListener('abort',aborted));
   });
  }
  return {signal:controller.signal,assertActive,wait,
   cancel(){if(phase!=='waiting'||controller.signal.aborted)return false;controller.abort(Object.assign(new Error('The user cancelled this response request.'),{aiCancelled:true}));return true;},
   beginApplying(){assertActive();phase='applying';},
   finish(){phase='finished';},
   get phase(){return phase;}
  };
 }
 return {create};
});
