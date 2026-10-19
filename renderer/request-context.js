// Preserve the exact question and every live fact; current schema precedes past dialogue.
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RequestContext=api;})(typeof globalThis==='object'?globalThis:this,function(){
function arrange(messages,request,lang){
 const copy=structuredClone(messages),last=copy.at(-1),marker=lang==='tr'?'\n\nBağlam:\n':lang==='en'?'\n\nContext:\n':null;
 if(!marker||typeof request!=='string'||!request)return {changed:false,repositioned:false,messages:copy};
 let changed=false,repositioned=false;
 if(last?.role==='user'&&typeof last.content==='string'&&last.content.startsWith(request+marker)){
  last.content=last.content.slice(request.length);copy.push({role:'user',content:request});changed=true;
 }
 if(copy.length>=3&&copy.at(-1)?.role==='user'&&copy.at(-1).content===request&&copy.at(-2)?.role==='user'&&typeof copy.at(-2).content==='string'&&copy.at(-2).content.startsWith(marker)){
  let prefix=0;while(copy[prefix]?.role==='system')prefix++;
  const at=copy.length-2;
  if(at>prefix){const context=copy.splice(at,1)[0];copy.splice(prefix,0,context);changed=true;repositioned=true;}
 }
 // UI-specific prompts may quote or shorten the question, or omit it (Fix).
 // Retain the complete current text as the final request without inferring intent.
 if(copy.at(-1)?.role!=='user'||copy.at(-1)?.content!==request){copy.push({role:'user',content:request});changed=true;}
 return {changed,repositioned,messages:copy};
}
return {arrange};
});
