/* Schema-free SQL structure practice. Answers are checked locally, without SQL execution. */
(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('./sql-read-contract.js'):root.SqlReadContract);
  if(typeof module==='object'&&module.exports)module.exports=api;else root.SqlExercises=api;
})(typeof globalThis==='object'?globalThis:this,function(contract){
  'use strict';
  const choices=Object.freeze([10,15,20]);
  const allowed=new Set(('SELECT|FROM|WHERE|AND|OR|NOT|DISTINCT|AS|JOIN|INNER JOIN|LEFT JOIN|LEFT OUTER JOIN|CROSS JOIN|ON|GROUP BY|HAVING|ORDER BY|LIMIT|OFFSET|UNION|UNION ALL|ALL|INTERSECT|EXCEPT|WITH|WITH RECURSIVE|CASE|WHEN|THEN|ELSE|END|IN|IS NULL|IS NOT NULL|BETWEEN|EXISTS|NOT EXISTS|COUNT|SUM|AVG|MIN|MAX|COALESCE|NULLIF|IFNULL|ROUND|UPPER|LOWER|LENGTH|SUBSTR|TRIM|CAST|ROW_NUMBER|RANK|DENSE_RANK|LAG|LEAD|OVER|PARTITION BY|ASC|DESC').split('|'));
  const functions=new Set('COUNT SUM AVG MIN MAX COALESCE NULLIF IFNULL ROUND UPPER LOWER LENGTH SUBSTR TRIM CAST ROW_NUMBER RANK DENSE_RANK LAG LEAD'.split(' '));
  const equivalent=[['JOIN','INNER JOIN'],['LEFT JOIN','LEFT OUTER JOIN']];
  const normalize=value=>String(value??'').trim().replace(/\s+/g,' ').toUpperCase();
  function inspect(text,count,validate=()=>true){
    const invalid=[],questions=[];
    if(!Number.isInteger(count)||count<1||count>20)return {questions,invalid:['count']};
    try{
      let source=String(text??'').trim();
      const fence=/^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(source);if(fence)source=fence[1];
      const list=JSON.parse(source);if(!Array.isArray(list)||list.length!==count)return {questions,invalid:['count']};
      const seen=new Set();
      for(const [index,item] of list.entries()){
       try{
        let sql=typeof item?.sql==='string'?item.sql.trim():'';
        let answer=normalize(item?.answer);
        const explanation=typeof item?.explanation==='string'?item.explanation.trim():'';
        if(!allowed.has(answer)||!sql||sql.length>2400||!explanation||explanation.length>1200)throw Error('answer-or-format');
        let tokens=contract.tokens(sql),gaps=tokens.filter(t=>t.type==='word'&&t.value==='___');
        if(!gaps.length){
          const phrase=answer.split(' '),matches=[];
          for(let i=0;i<tokens.length;i++)if(phrase.every((word,j)=>tokens[i+j]?.type==='word'&&normalize(tokens[i+j].value)===word)&&(!functions.has(answer)||tokens[i+1]?.value==='('))matches.push({start:tokens[i].start,end:tokens[i+phrase.length-1].end});
          const occurrence=item.occurrence??0;if(!Number.isInteger(occurrence)||!matches[occurrence])throw Error('expression-not-found');
          let target=matches[occurrence];
          // Keep the join kind visible: its meaning cannot be inferred from table
          // names alone. The learner completes LEFT/INNER/CROSS with JOIN.
          if(answer!=='JOIN'&&/ JOIN$/.test(answer)){target={start:target.end-4,end:target.end};answer='JOIN';}
          sql=sql.slice(0,target.start)+'___'+sql.slice(target.end);tokens=contract.tokens(sql);gaps=tokens.filter(t=>t.type==='word'&&t.value==='___');
        }
        if(gaps.length!==1||/\b(?:INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|PRAGMA|ATTACH|DETACH|REPLACE|VACUUM)\b/i.test(tokens.filter(t=>t.type==='word').map(t=>t.value).join(' ')))throw Error('gap-or-statement');
        const gap=gaps[0],completed=sql.slice(0,gap.start)+answer+sql.slice(gap.end),full=contract.tokens(completed);
        if(!['SELECT','WITH'].includes(normalize(full[0]?.value))||full.slice(0,-1).some(t=>t.value===';'))throw Error('read-query-required');
        let depth=0;for(const token of full){if(token.value==='(')depth++;if(token.value===')'&&--depth<0)throw Error('parentheses');}
        if(depth!==0||!validate(completed))throw Error('sql-syntax');
        const fingerprint=normalize(completed);if(seen.has(fingerprint))throw Error('duplicate');seen.add(fingerprint);
        questions.push({sql,answer,explanation,gap:{start:gap.start,end:gap.end}});
       }catch(error){invalid.push({index,reason:error.message});}
      }
      return {questions,invalid};
    }catch{return {questions:[],invalid:['json']};}
  }
  function parse(text,count,validate){
    const result=inspect(text,count,validate);return result.questions.length===count&&!result.invalid.length?result.questions:[];
  }
  function syntaxValidator(SQL){
    const scratch=new SQL.Database();
    return {check(sql){let statement;try{statement=scratch.prepare('EXPLAIN '+sql);return true;}catch(error){return /no such (?:table|column):|ambiguous column name:/i.test(error.message);}finally{statement?.free();}},close(){scratch.close();}};
  }
  function accepts(question,value){
    const answer=normalize(value),expected=normalize(question?.answer);
    const prefix=question?.gap?question.sql.slice(0,question.gap.start):'';
    let nullAlias=false;
    if(question?.gap&&['COALESCE','IFNULL'].includes(answer)&&['COALESCE','IFNULL'].includes(expected)){
      const suffix=contract.tokens(question.sql.slice(question.gap.end));let depth=0,commas=0;
      if(suffix[0]?.value==='(')for(const token of suffix){if(token.value==='(')depth++;else if(token.value===')'){if(--depth===0){nullAlias=commas===1;break;}}else if(token.value===','&&depth===1)commas++;}
    }
    return !!answer&&(answer===expected||nullAlias||(!/\b(?:LEFT|INNER|CROSS|OUTER)\s*$/i.test(prefix)&&equivalent.some(group=>group.includes(answer)&&group.includes(expected))));
  }
  function complete(question,value=question.answer){return question.sql.slice(0,question.gap.start)+String(value).trim()+question.sql.slice(question.gap.end);}
  function grade(questions,answers){return questions.map((question,i)=>({ok:accepts(question,answers[i]),answer:question.answer,explanation:question.explanation}));}
  function messages({count=10,lang='en',difficulty='orta'}={}){
    if(!Number.isInteger(count)||count<1||count>20)throw new Error('Unsupported exercise count');
    return [{role:'system',content:'Create independent, schema-free SQLite SQL structure exercises. Return ONLY a JSON array with exactly the requested number of objects. Each object supplies a COMPLETE, VALID read-only SQL query, the SQL expression to remove, and a brief explanation: {"sql":"SELECT category, COUNT(*) AS product_count FROM products GROUP BY category;","answer":"GROUP BY","occurrence":0,"explanation":"Grouping creates one count per category."}. Do NOT insert placeholders: the application will replace the selected expression with a blank. occurrence is the zero-based occurrence of that expression outside quoted strings/comments; normally use 0. The answer MUST appear in the SQL and be a keyword, clause or function from this list: '+[...allowed].join(', ')+'. NEVER choose a table name, column, alias, literal, operator or punctuation as the answer. Supply realistic synthetic SELECT/CTE queries with meaningful identifiers. Do not use or request a database/schema. The learner sees ONLY the query with the selected expression removed, so make its role inferable from the query structure and meaningful aliases. Avoid optional DISTINCT, NOT or AS gaps and unconstrained function choices with several equally plausible meanings. Do not include answer-revealing comments or schema/DDL. Vary clause positions, query patterns and topics; do not repeat a query with only renamed identifiers. Include GROUP BY, ORDER BY, JOIN, WHERE, CTE and window patterns where appropriate for the selected difficulty. Explanations appear only after review, in the selected language. No markdown fences.'},
      {role:'user',content:'Question count: '+count+'\nDifficulty: '+({kolay:'easy',orta:'medium',zor:'hard'}[difficulty]||'medium')+'\nExplanation language: '+(lang==='tr'?'Turkish':'English')}];
  }
  return {choices,normalize,parse,inspect,syntaxValidator,accepts,complete,grade,messages};
});

