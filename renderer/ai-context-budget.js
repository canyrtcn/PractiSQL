/* Capacity and usage accounting; no task classification or SQL rewriting. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AiContextBudget=api;})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const positive=n=>Number.isSafeInteger(n)&&n>0?n:null;
 function limits(m){
  if(!m||typeof m!=='object')return null;const l=m.limit||{};
  const context=positive(l.context)||positive(m.context_length)||positive(m.context_window)||positive(m.contextWindow)||positive(m.max_context_window)||(m.type==='model'?positive(m.max_input_tokens):null);
  const input=positive(l.input)||positive(m.inputTokenLimit)||positive(m.max_input_tokens),output=positive(l.output)||positive(m.outputTokenLimit)||positive(m.max_output_tokens)||positive(m.max_tokens);
  return context||input||output?{context,input,output}:null;
 }
 function resolve({provider,model,advertised}){
  const actual=limits(advertised);if(actual&&(actual.context||actual.input))return {...actual,known:true,source:'provider-model-metadata'};
  return {context:provider==='google'||/(^|[/:-])gemini([/.-]|$)/i.test(model||'')?128000:256000,input:null,output:actual?.output||null,known:false,source:'user-configured-fallback'};
 }
 // Lightweight estimate, not a tokenizer. Actual counts stay separate.
 function estimate(value){let n=0;for(const c of String(value??''))n+=c.charCodeAt(0)<128?.25:c.length;return Math.ceil(n);}
 function requestEstimate(messages,tools=[]){return 12+messages.reduce((n,m)=>n+8+estimate(JSON.stringify(m)),0)+(tools.length?estimate(JSON.stringify(tools))+32:0);}
 function inputUsage(usage,transport){
  if(!usage)return null;let n=usage.prompt_tokens??usage.input_tokens;
  if(!Number.isFinite(n)||n<0)return null;
  if(transport==='messages')n+=(usage.cache_read_input_tokens||0)+(usage.cache_creation_input_tokens||0);
  return n;
 }
 function plan({capacity,messages=[],tools=[],outputReserve=16384,calibration}){
  const window=capacity.context||capacity.input;
  const reserve=Math.min(positive(outputReserve)||16384,capacity.output||Infinity);
  const usable=Math.max(0,Math.min(capacity.input||Infinity,capacity.context?capacity.context-reserve:Infinity));
  const threshold=Math.max(0,Math.min(Math.floor(window*.8),usable));
  const raw=requestEstimate(messages,tools),ratio=calibration?.estimate>0&&calibration?.input>0?calibration.input/calibration.estimate:1;
  const tokens=Math.ceil(raw*ratio);
  return {capacity,outputReserve:reserve,inputLimit:usable,pressureThreshold:threshold,estimatedInputTokens:tokens,rawEstimate:raw,pressure:tokens>=threshold,overLimit:tokens>usable,measurement:calibration?'provider-calibrated-estimate':'heuristic-token-estimate',ratio};
 }
 return {limits,resolve,estimate,requestEstimate,inputUsage,plan};
});
