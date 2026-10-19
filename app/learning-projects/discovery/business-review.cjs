'use strict';
// Optional project feedback. Anchors prove which data was cited, not whether
// an AI interpretation is true. This module has no reward or SQL-write authority.
const {digest,assignmentEvidence}=require('./verified-csv.cjs');
const Conversation=require('./project-conversation.js');
const fail=code=>{throw Error('PROJECT_REVIEW_'+code);};
const object=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const str={type:'string'},integer={type:'integer'},choice=(...values)=>({type:'string',enum:values});
const criteria=['evidence','interpretation','businessUse','limitations'];
const reference={anyOf:[object({kind:choice('cell'),row:integer,column:integer}),object({kind:choice('result-shape')}),object({kind:choice('source'),path:{type:'string',description:'Exact JSON pointer to a scalar source field. Source-relative /actualFile/rowCount and context-rooted /source/actualFile/rowCount identify the same field. Only the source subtree is accessible.'}})]};
const references={type:'array',items:reference};
const assignment=object({status:choice('supported','needs-revision','insufficient-evidence'),feedback:str,evidence:references});
const student=object({scores:object(Object.fromEntries(criteria.map(k=>[k,{type:'integer',minimum:0,maximum:5}]))),feedback:str,evidence:references});
const definitions=[
 {name:'read_project_evidence',description:'Read actual, independently checked output rows from this immutable project submission. offset is zero-based; limit is 1-200. Returned row/column references use one-based indexes. No SQL execution, mutation or new model request is performed.',parameters:object({taskId:str,offset:integer,limit:integer})},
 {name:'submit_project_review',description:'Record a business review of each supplied task. First judge whether the assignment agrees with the source, observation unit and measured specification. If unsupported or uncertain, student must be null: an assignment defect must not penalize the learner. For supported tasks assess the student note with the supplied four criteria. Cite actual source fields, result shape or observed cells. This records AI feedback, not certified meaning, completion or XP. Submit once; do not call after acceptance.',parameters:object({reports:{type:'array',items:object({id:str,assignment,student:{anyOf:[student,{type:'null'}]}})},overall:str})}
];
function keys(value,expected){return !!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===[...expected].sort().join(',');}
function feedback(value){if(typeof value!=='string'||!value.trim()||value.length>4000||value.includes('\0'))fail('FORMAT');return value.trim();}
function sourceField(source,pointer){
 if(typeof pointer!=='string'||!pointer.startsWith('/')||pointer.length>2000)fail('SOURCE_REFERENCE');
 // The model sees {source: ...} in the review context. Both explicit roots
 // address that same immutable subtree; no fuzzy field matching or inference.
 if(pointer.startsWith('/source/'))pointer=pointer.slice('/source'.length);
 let value=source;
 for(const part of pointer.slice(1).split('/')){
  if(/~(?![01])/u.test(part))fail('SOURCE_REFERENCE');
  const key=part.replace(/~1/g,'/').replace(/~0/g,'~');
  if(value===null||typeof value!=='object'||!Object.hasOwn(value,key))fail('SOURCE_REFERENCE');value=value[key];
 }
 if(value!==null&&!['string','number','boolean'].includes(typeof value))fail('SOURCE_REFERENCE');
 return structuredClone(value);
}
function createReviewSession({record,batch,assertCurrent=()=>{},onSubmit=async review=>review}={}){
 record=structuredClone(record);batch=structuredClone(batch);
 if(!record?.workspace?.id||!Array.isArray(record.draft?.tasks)||!record.draft.tasks.length||record.draft.tasks.length>8||!Array.isArray(batch?.reports)||batch.reports.length!==record.draft.tasks.length)fail('INPUT');
 const reports=new Map();let workspaceSha256=null;
 for(const task of record.draft.tasks){
  if(reports.has(task.id))fail('INPUT');
  const matches=batch.reports.filter(r=>r.id===task.id),report=Object.hasOwn(record.reports,task.id)?record.reports[task.id]:null;
  if(matches.length!==1||!report||typeof report.note!=='string'||!report.note.trim())fail('NOTE_REQUIRED');
  const result=matches[0];
  if(result.numericCorrect!==true||result.actual?.limited||!Array.isArray(result.actual?.columns)||!Array.isArray(result.actual?.values)||result.actual.values.some(r=>!Array.isArray(r)||r.length!==result.actual.columns.length))fail('NUMERIC_REQUIRED');
  if(result.sourceSha256!==record.draft.source.sha256||result.specSha256!==task.specSha256||digest(JSON.stringify(task.spec))!==task.specSha256||result.sqlSha256!==digest(report.sql)||!/^[0-9a-f]{64}$/.test(result.workspaceSha256)||(workspaceSha256!==null&&workspaceSha256!==result.workspaceSha256))fail('STALE');
  workspaceSha256=result.workspaceSha256;
  reports.set(task.id,{task,report,result,seen:new Set(Array.from({length:Math.min(12,result.actual.values.length)},(_,i)=>i+1))});
 }
 const source=assignmentEvidence(record.draft.source);
 const fingerprint={projectId:record.id,projectRevision:record.revision,studentRequestSha256:record.studentRequest==null?null:digest(record.studentRequest),studentConversationSha256:digest(JSON.stringify(Conversation.history(record.studentConversation??[]))),workspaceId:record.workspace.id,workspaceSha256,sourceSha256:record.draft.source.sha256,tasks:record.draft.tasks.map(t=>({id:t.id,specSha256:t.specSha256,sqlSha256:digest(record.reports[t.id].sql),noteSha256:digest(record.reports[t.id].note),resultSha256:digest(JSON.stringify(reports.get(t.id).result.actual))}))};
 const snapshotSha256=digest(JSON.stringify(fingerprint));let closed=false,accepted=null,submitting=false;
 const current=async()=>{if(closed||accepted||submitting)fail('CLOSED');await assertCurrent();if(closed||accepted||submitting)fail('CLOSED');};
 const rows=(actual,offset,limit)=>({columns:actual.columns,totalRows:actual.values.length,offset,rows:actual.values.slice(offset,offset+limit).map((values,i)=>({row:offset+i+1,values})),nextOffset:offset+limit<actual.values.length?offset+limit:null});
 function context(){
  if(closed)fail('CLOSED');
  return structuredClone({snapshotSha256,source,studentRequest:record.studentRequest??null,studentConversation:Conversation.history(record.studentConversation??[]),assignment:{title:record.draft.title,businessContext:record.draft.businessContext,observationUnit:record.draft.observationUnit,authorship:'AI-created draft, not an independently certified business assignment'},numericCheck:'All submitted reports matched measurements computed from the complete original records. The original source table in this workspace was also verified. This does not certify the business meaning of the task.',rubric:{maximumPerReport:20,criteria:{evidence:'0-5: use relevant actual figures and correct scope; do not reward invented facts.',interpretation:'0-5: explain what the observed comparison supports without turning association into causation or a sample into a universal rule.',businessUse:'0-5: address the requested business outcome with a proportionate implication, or explain why the data cannot support an action.',limitations:'0-5: recognize material limits when they matter (units, period, missing data or ambiguity). No stock caveat, jargon, verbosity or specific wording is required.'}},reports:[...reports.values()].map(({task,report,result})=>({id:task.id,title:task.title,businessRequest:task.businessRequest,measurement:task.spec,canonicalBrief:task.brief,studentInterpretation:report.note,result:rows(result.actual,0,12)})),evidenceInstructions:'Source references are JSON pointers to scalar fields in source, e.g. /actualFile/rowCount. Output cell indexes are one-based and must have been supplied in the preview or read_project_evidence. result-shape cites actual columns and row count, including an empty result. Matching a cited cell does not by itself establish that a claim is true.'});
 }
 async function read(args){
  await current();
  if(!keys(args,['taskId','offset','limit'])||!reports.has(args.taskId)||!Number.isSafeInteger(args.offset)||args.offset<0||!Number.isSafeInteger(args.limit)||args.limit<1||args.limit>200)fail('PAGE');
  const entry=reports.get(args.taskId),actual=entry.result.actual;if(args.offset>actual.values.length)fail('PAGE');
  const result=structuredClone(rows(actual,args.offset,args.limit));await current();for(const row of result.rows)entry.seen.add(row.row);return result;
 }
 function anchors(items,entry){
  if(!Array.isArray(items)||!items.length||items.length>100)fail('EVIDENCE');
  return items.map(e=>{
   const actual=entry.result.actual;
   if(e?.kind==='cell'&&keys(e,['kind','row','column'])){
    if(!Number.isSafeInteger(e.row)||!Number.isSafeInteger(e.column)||!entry.seen.has(e.row)||e.column<1||e.column>actual.columns.length)fail('CELL_REFERENCE');
    return {...e,columnName:actual.columns[e.column-1],value:structuredClone(actual.values[e.row-1][e.column-1])};
   }
   if(e?.kind==='source'&&keys(e,['kind','path']))return {...e,value:sourceField(source,e.path)};
   if(e?.kind==='result-shape'&&keys(e,['kind']))return {kind:'result-shape',columns:structuredClone(actual.columns),rowCount:actual.values.length};
   fail('EVIDENCE');
  });
 }
 function normalize(value){
  if(!keys(value,['reports','overall'])||!Array.isArray(value.reports)||value.reports.length!==reports.size)fail('FORMAT');
  const seen=new Set(),reviewed=[];
  for(const item of value.reports){
   if(!keys(item,['id','assignment','student'])||!reports.has(item.id)||seen.has(item.id))fail('FORMAT');seen.add(item.id);
   const a=item.assignment,entry=reports.get(item.id);
   if(!keys(a,['status','feedback','evidence'])||!['supported','needs-revision','insufficient-evidence'].includes(a.status))fail('FORMAT');
   const assignment={status:a.status,feedback:feedback(a.feedback),evidence:anchors(a.evidence,entry)};let student=null;
   if(a.status!=='supported'){if(item.student!==null)fail('ASSIGNMENT_UNRESOLVED');}
   else{
    const s=item.student;if(!keys(s,['scores','feedback','evidence'])||!keys(s.scores,criteria)||criteria.some(k=>!Number.isInteger(s.scores[k])||s.scores[k]<0||s.scores[k]>5))fail('SCORES');
    student={scores:structuredClone(s.scores),points:criteria.reduce((sum,k)=>sum+s.scores[k],0),maximum:20,feedback:feedback(s.feedback),evidence:anchors(s.evidence,entry)};
   }
   reviewed.push({id:item.id,assignment,student});
  }
  // Preserve task order even when the model submits them in a different order.
  const ordered=record.draft.tasks.map(t=>reviewed.find(r=>r.id===t.id)),allSupported=ordered.every(r=>r.assignment.status==='supported');
  return {version:1,kind:'ai-business-feedback',snapshotSha256,fingerprint,reviewedAt:new Date().toISOString(),reports:ordered,overall:feedback(value.overall),provisionalPoints:allSupported?ordered.reduce((sum,r)=>sum+r.student.points,0)/ordered.length:null,maximum:20,allAssignmentsSupportedByReviewer:allSupported,businessMeaningVerified:false,awardsAllowed:false,semanticAccuracyVerified:false};
 }
 async function submit(value){
  // Reserve before the first await: two tool calls can enter in one tick.
  if(closed||accepted||submitting)fail('CLOSED');submitting=true;
  try{await assertCurrent();if(closed||accepted)fail('CLOSED');const review=normalize(structuredClone(value));await assertCurrent();if(closed||accepted)fail('CLOSED');const saved=await onSubmit(structuredClone(review),()=>{if(closed)fail('CLOSED');});accepted=structuredClone(saved);return {accepted:true,snapshotSha256,review:structuredClone(accepted),awardsAllowed:false};}
  finally{submitting=false;}
 }
 return {definitions:structuredClone(definitions),context,read,submit,snapshotSha256,result:()=>accepted?structuredClone(accepted):null,close(){closed=true;}};
}
module.exports={createReviewSession,definitions,criteria};
