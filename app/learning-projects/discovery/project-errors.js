/* Diagnostics only. Existing validators remain the authority for acceptance. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ProjectErrors=api;})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const messages={
  required:'Supply this required field.',object:'Use an object.',array:'Use an array.',string:'Use a string.',number:'Use a finite number.',integer:'Use an integer.',null:'Use null.',enum:'Use one of the values declared for this field in the tool schema.',additional:'Remove fields not declared in this object schema.',range:'Use a value within the limits declared for this field.',json:'Tool arguments must be a complete JSON object.',
  PROJECT_PROPOSAL_INVALID:'Follow the proposal schema. Titles, task IDs and business descriptions must be nonblank strings of at most 12000 characters; supply 1–8 tasks with distinct IDs.',
  PROJECT_SOURCE_NOT_INSPECTED:'Inspect the selected source in this session and use the exact returned sourceId.',
  PROJECT_REPORT_SPEC:'Use a supported report version, the inspected source identity and 1–4 stages.',
  PROJECT_REPORT_STAGE:'Supply dimensions (0–8), metrics (1–16), and filters (0–32) for this stage.',
  PROJECT_REPORT_FILTER:'Use an existing column and a supported comparison; null checks require value:null.',
  PROJECT_REPORT_FILTER_TYPE:'Match the comparison value to the stored column type. Null checks use value:null.',
  PROJECT_REPORT_OUTPUT_COLUMN:'Use a nonblank output name of at most 128 characters, without NUL or a case-insensitive duplicate.',
  PROJECT_REPORT_DIMENSION:'Name an available column and use a supported dimension transform.',
  PROJECT_REPORT_DATE_COLUMN:'Calendar parts require a text column containing ISO calendar dates.',
  PROJECT_REPORT_DATE_UNSUPPORTED:'Calendar parts require YYYY-MM-DD values. For another supported source format, declare a calendar-date row transform with that explicit format, then use its output column. Do not guess ambiguous dates.',
  PROJECT_REPORT_DATE_INVALID:'A date value is not a valid calendar date or time for the declared format; inspect the source evidence before choosing a supported task.',
  PROJECT_REPORT_METRIC:'Use a supported metric, a filters array and an explicit empty-result policy.',
  PROJECT_REPORT_METRIC_COLUMN:'count-rows requires column:null; other metrics require an available column.',
  PROJECT_REPORT_NUMERIC_COLUMN:'This measure requires a numeric column from the source, a row transform or the preceding stage.',
  PROJECT_REPORT_COUNT_EMPTY:'Count metrics require empty:zero.',
  PROJECT_REPORT_DERIVED:'Use supported arithmetic on named numeric outputs with a distinct output name; at most eight derived measures.',
  PROJECT_REPORT_ORDER:'Order by available output columns with asc or desc; do not repeat columns.',
  PROJECT_REPORT_ORDER_TIES:'Include every final grouping key in the declared order to resolve ties, or leave orderBy empty.',
  PROJECT_REPORT_ROW_TRANSFORMS:'Use an array of at most eight supported row transforms.',
  PROJECT_REPORT_ROW_OUTPUT_COLUMN:'Use a nonblank row output name of at most 128 characters, without NUL or a case-insensitive collision.',
  PROJECT_REPORT_ROW_PRODUCT:'A product transform requires numeric left and right columns and a distinct output name.',
  PROJECT_REPORT_ROW_DATE:'A calendar-date transform requires an available text column, an explicitly supported format and a distinct output name.',
  PROJECT_REPORT_ROW_TRANSFORM:'Use a supported row transform and its declared fields.',
  PROJECT_REPORT_INTEGER_RANGE:'This computation exceeds the exact integer range supported by the report evaluator.',
  PROJECT_REPORT_NUMERIC_RANGE:'This computation exceeds the finite numeric range supported by the report evaluator.',
  PROJECT_REPORT_OUTPUT_TOO_LARGE:'This report exceeds the evaluator capacity of 5000 output groups. Choose a supported report scope based on the business request.'
 };
 const safeCode=value=>typeof value==='string'&&/^(?:PROJECT|DATASET)_[A-Z_]+$/.test(value)?value:'PROJECT_SERVICE_FAILED';
 const safePath=p=>typeof p==='string'&&p.length<=512&&/^(?:\/(?:[A-Za-z][A-Za-z0-9_]*|[0-9]+))*$/.test(p);
 function clean(issues){return Array.isArray(issues)?issues.filter(i=>i&&safePath(i.path)&&Object.hasOwn(messages,i.reason)).slice(0,12).map(i=>({path:i.path,reason:i.reason})):[];}
 function prefix(error,path){
  if(safeCode(error?.message)!==error?.message||!safePath(path))return error;
  const issues=clean(error.issues);error.issues=issues.length?clean(issues.map(i=>({...i,path:path+i.path}))):Object.hasOwn(messages,error.message)?[{path,reason:error.message}]:[];return error;
 }
 function at(path,action){try{return action();}catch(error){throw prefix(error,path);}}
 function pack(error){return {code:safeCode(error?.message),issues:clean(error?.issues)};}
 function unpack(value){const e=Error(safeCode(value?.code));e.issues=clean(value?.issues);return e;}
 function schemaIssues(schema,value,path='',depth=0){
  // Bounded diagnostics after a rejection, never a second acceptance validator.
  if(!schema||depth>24)return [];
  const one=reason=>[{path,reason}],recur=(s,v,p)=>schemaIssues(s,v,p,depth+1);
  if(schema.anyOf){const alternatives=schema.anyOf.map(s=>recur(s,value,path));return alternatives.reduce((a,b)=>a.length<=b.length?a:b);}
  const type=schema.type,valid={object:value!==null&&typeof value==='object'&&!Array.isArray(value),array:Array.isArray(value),string:typeof value==='string',number:typeof value==='number'&&Number.isFinite(value),integer:Number.isSafeInteger(value),null:value===null};
  if(type&&Object.hasOwn(valid,type)&&!valid[type])return one(type);
  if(schema.enum&&!schema.enum.includes(value))return one('enum');
  if((typeof value==='number'&&(value<schema.minimum||value>schema.maximum))||(typeof value==='string'&&(value.length<schema.minLength||value.length>schema.maxLength)))return one('range');
  const issues=[];
  if(type==='object'){
   for(const name of schema.required||[])if(!Object.hasOwn(value,name))issues.push({path:path+'/'+name,reason:'required'});
   if(schema.additionalProperties===false&&Object.keys(value).some(k=>!Object.hasOwn(schema.properties||{},k)))issues.push({path,reason:'additional'});
   for(const [name,s]of Object.entries(schema.properties||{})){if(Object.hasOwn(value,name))issues.push(...recur(s,value[name],path+'/'+name));if(issues.length>=12)break;}
  }else if(type==='array'){
   if(value.length<schema.minItems||value.length>schema.maxItems)issues.push({path,reason:'range'});
   for(let i=0;i<value.length&&issues.length<12&&i<128;i++)issues.push(...recur(schema.items,value[i],path+'/'+i));
  }
  return clean(issues);
 }
 function explain(error,schema,value,{invalidJson=false}={}){
  const packed=pack(error),structural=invalidJson?[{path:'',reason:'json'}]:schemaIssues(schema,value);
  let issues=structural.length?structural:packed.issues;
  if(!issues.length&&Object.hasOwn(messages,packed.code))issues=[{path:'',reason:packed.code}];
  return {error:packed.code,...(issues.length?{issues:issues.map(i=>({path:i.path||'/',message:messages[i.reason]}))}:{})};
 }
 return {at,prefix,pack,unpack,explain,schemaIssues};
});
