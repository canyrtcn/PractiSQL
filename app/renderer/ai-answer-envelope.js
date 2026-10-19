/* Ordinary SQL/text Markdown, with explicit code roles and a single complete batch. */
(function(root,factory){const api=factory(()=>typeof module==='object'&&module.exports?require('./response-fences.js'):root.ResponseFences);if(typeof module==='object'&&module.exports)module.exports=api;else root.AiAnswerEnvelope=api;})(typeof globalThis==='object'?globalThis:this,function(fences){
 'use strict';
 function validate(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!['explanation','new_database','sql','on_error'].includes(key))||!['explanation','new_database','sql'].every(key=>Object.hasOwn(value,key)))throw Error('Invalid answer fields');
  for(const key of Object.keys(value))if(typeof value[key]!=='string')throw Error('Answer fields must be strings');
  if(Object.hasOwn(value,'on_error')&&value.on_error!=='report')throw Error('Invalid execution error policy');
  if(value.on_error&&!value.sql.trim())throw Error('An error policy requires executable SQL');
  if(!value.sql.trim()&&!value.explanation.trim())throw Error('Empty answer');
  if(value.new_database&&!value.sql.trim())throw Error('A workspace action requires complete setup SQL');return value;
 }
 function is(value){return !!value&&typeof value==='object'&&value.version===1&&['sql','explanation','new_database'].every(key=>typeof value[key]==='string')&&(!Object.hasOwn(value,'on_error')||value.on_error==='report');}
 function payload(value){return {sql:value.sql,explanation:value.explanation,new_database:value.new_database,...(Object.hasOwn(value,'on_error')?{on_error:value.on_error}:{})};}
 function fence(language,body){const marker=String.fromCharCode(96).repeat(Math.max(2,...(body.match(/`+/g)||[]).map(s=>s.length))+1);return marker+language+'\n'+body+'\n'+marker;}
 function execution(value){if(!is(value))return String(value||'');return [value.new_database?fence('action',JSON.stringify({op:'new_db',name:value.new_database})):'',value.sql.trim()?fence('sql',value.sql):''].filter(Boolean).join('\n\n');}
 function display(value){if(!is(value))return String(value||'');return [value.sql.trim()?fence('sql',value.sql):'',value.explanation].filter(Boolean).join('\n\n');}
 function assistantTranscript(value){return is(value)?[value.new_database?fence('action',JSON.stringify({op:'new_db',name:value.new_database})):'',value.sql.trim()?fence(value.on_error==='report'?'sql-no-repair':'sql',value.sql):'',value.explanation].filter(Boolean).join('\n\n'):String(value||'');}
 // Keep canonical transcripts stable for existing source IDs and compaction hashes.
 function transcript(value){return is(value)?'Previously proposed answer; execution outcome is recorded separately:\n'+assistantTranscript(value):String(value||'');}
 function create(value){const record={version:1,...validate(payload(value))};Object.defineProperty(record,'toString',{value:()=>display(record),enumerable:false});return Object.freeze(record);}
 function restore(value){if(!is(value))throw Error('Invalid saved answer');return create(value);}
 function change(value,updates){return create({...payload(value),...updates});}
 function fromMarkdown(text,{displayOnly=false}={}){
  if(typeof text!=='string'||!text.trim())throw Error('Empty model answer');
  if(displayOnly)return create({sql:'',explanation:text,new_database:''});
  const parsed=fences().scan(text,{sqlLanguages:['sql','sqlite','sql-no-repair'],actionLanguages:['action'],inline:false,topLevelOnly:true});
  const selected=parsed.blocks.filter(b=>['sql','sqlite','sql-no-repair','action'].includes(b.lang)),sql=selected.filter(b=>b.lang!=='action'),actions=selected.filter(b=>b.lang==='action');
  if(selected.some(b=>!b.closed||!b.body.trim()))throw Error('Incomplete or empty executable frame');

  if(actions.length>1||actions.length&&(!sql.length||actions[0].start>sql[0].start))throw Error('Exactly one workspace action before complete SQL is allowed');
  let name='';if(actions.length){const action=JSON.parse(actions[0].body);if(!action||typeof action!=='object'||Array.isArray(action)||JSON.stringify(Object.keys(action).sort())!==JSON.stringify(['name','op'])||action.op!=='new_db'||typeof action.name!=='string'||!action.name.trim())throw Error('Invalid workspace action');name=action.name;}
  if(sql.length>1)throw Object.assign(new Error('All requested statements must be in one complete SQL batch; no partial selection'),{answerFormatCode:'multiple_sql_blocks'});
  const explanation=parsed.segments.filter(b=>b.type!=='code'||!['sql','sqlite','sql-no-repair','action'].includes(b.lang)).map(b=>b.type==='text'?b.body:text.slice(b.start,b.end)).join('').trim();
  return create({sql:sql[0]?.body||'',explanation,new_database:name,...(sql[0]?.lang==='sql-no-repair'?{on_error:'report'}:{})});
 }
 function suppressesRepair(value){return is(value)&&value.on_error==='report';}
 return {is,validate,create,restore,change,fromMarkdown,payload,display,execution,transcript,assistantTranscript,suppressesRepair};
});
