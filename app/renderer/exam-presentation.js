/* Extract display-only code without changing the stored question or model messages. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ExamPresentation=api;})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  function parts(question){
    const text=String(question?.q||''),result=[],fences=[...text.matchAll(/```(?:sql|sqlite)?\s*\n([\s\S]*?)```/gi)];
    if(fences.length){let offset=0;for(const match of fences){if(match.index>offset)result.push({text:text.slice(offset,match.index)});result.push({sql:match[1].trim()});offset=match.index+match[0].length;}if(offset<text.length)result.push({text:text.slice(offset)});return result;}
    if(question?.type==='explain'){
      const match=/\b(SELECT\s+(?:(?:DISTINCT|ALL)\s+)?(?:[\w"`*(']|\[)|WITH\s+(?:RECURSIVE\s+)?[\w"`]+\s+AS\s*\()/i.exec(text);
      if(match){const start=match.index,sql=text.slice(start).trim();if(/\b(?:FROM|WHERE|ORDER\s+BY|GROUP\s+BY)\b/i.test(sql)||/^SELECT\s+[\d'"(]/i.test(sql)){if(start)result.push({text:text.slice(0,start).trim()});result.push({sql});return result;}}
    }
    return [{text}];
  }
  return {parts};
});
