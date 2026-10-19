/* Recognize explicit provider input-window rejection, never arbitrary request failures. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AiContextRejection=api;})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const positive=n=>Number.isSafeInteger(Number(n))&&Number(n)>0?Number(n):null;
 function inspect(status,body){
  if(![400,413].includes(status))return null;
  let value=body;if(typeof value==='string'){try{value=JSON.parse(value);}catch{return null;}}
  const e=value?.error;if(!e||typeof e!=='object'||Array.isArray(e))return null;
  const code=String(e.code||''),type=String(e.type||e.status||''),message=String(e.message||'');
  const explicit=['context_length_exceeded','input_context_length_exceeded','input_token_limit_exceeded'].includes(code);
  const anthropic=type==='invalid_request_error'&&/^prompt is too long\b/i.test(message);
  const google=type==='INVALID_ARGUMENT'&&/^the input token count\b.*\bexceeds\b.*\bmaximum\b/i.test(message);
  if(!explicit&&!anthropic&&!google)return null;
  let inputTokens=null,limit=null,limitKind=null;
  let match=message.match(/^prompt is too long:\s*(\d+) tokens\s*>\s*(\d+) maximum\b/i);
  if(match){inputTokens=positive(match[1]);limit=positive(match[2]);limitKind='input';}
  match=message.match(/^the input token count\s*\((\d+)\)\s*exceeds the maximum number of tokens allowed\s*\((\d+)\)/i);
  if(match){inputTokens=positive(match[1]);limit=positive(match[2]);limitKind='input';}
  if(explicit){match=message.match(/maximum context length is (\d+) tokens/i);if(match){limit=positive(match[1]);limitKind='context';}match=message.match(/\((\d+) in (?:the )?messages,/i);if(match)inputTokens=positive(match[1]);}
  return {code:explicit?code:'provider_input_window_exceeded',inputTokens,limit,limitKind};
 }
 function httpError(status,body){const error=new Error('HTTP '+status+' '+String(body||'').slice(0,200)),overflow=inspect(status,body);if(overflow)error.contextOverflow=overflow;return error;}
 function accountError(error){const result=new Error(String(error?.message||'ChatGPT connection failed.'));if(['context_length_exceeded','input_context_length_exceeded','input_token_limit_exceeded'].includes(error?.code))result.contextOverflow={code:error.code,inputTokens:null,limit:null,limitKind:null};return result;}
 return {inspect,httpError,accountError};
});
