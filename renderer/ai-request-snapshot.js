/* A response-local copy of the request actually sent. No retrieval or intent rules. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AiRequestSnapshot=api;})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  function freeze(value){
    if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}
    return value;
  }
  function capture(messages){
    if(!Array.isArray(messages)||!messages.length)throw new TypeError('A request must contain messages');
    return freeze({messages:structuredClone(messages)});
  }
  function forRepair(snapshot,diagnostics){
    if(!snapshot)return structuredClone(diagnostics);
    // Keep the original roles and contents exactly, including the last question.
    // The repair's fresh SQLite evidence follows it. Its reconstructed system
    // prompt must not replace or duplicate the original teacher contract.
    return structuredClone([...snapshot.messages,...diagnostics.filter(message=>message.role!=='system')]);
  }
  return {capture,forRepair};
});
