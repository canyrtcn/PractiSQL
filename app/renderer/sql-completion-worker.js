/* Completion analysis runs outside the renderer's typing and layout thread. */
importScripts('./sql-completion.js');
let suggest=SqlCompletion.create(),schema=[];
self.onmessage=event=>{
  const request=event.data;
  if(request.type==='vocabulary'){suggest=SqlCompletion.create(request.value);return;}
  if(request.type==='schema'){schema=request.value;return;}
  if(request.type==='suggest')self.postMessage({id:request.id,suggestion:suggest({...request.value,schema})});
};
