'use strict';
const {createDiscoverySession}=require('./discovery-session.cjs');
const {prepareReportPlans}=require('./report-assessment.cjs');
const {formats}=require('./row-measures.cjs');
const Conversation=require('./project-conversation.js');
const {at}=require('./project-errors.js');
const object=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const string={type:'string'},array=items=>({type:'array',items}),choice=(...values)=>({type:'string',enum:values});
const filter=object({column:string,op:choice('eq','ne','lt','lte','gt','gte','is-null','not-null'),value:{anyOf:[{type:'string'},{type:'number'},{type:'null'}]}});
const stage=object({dimensions:array(object({column:string,transform:choice('value','year','month','year-month'),as:string})),metrics:array(object({op:choice('count-rows','count','count-distinct','sum','mean','min','max'),column:{anyOf:[string,{type:'null'}]},as:string,filters:array(filter),empty:choice('null','zero')})),filters:array(filter)});
const rowTransform={anyOf:[object({op:choice('product'),left:string,right:string,as:string}),object({op:choice('calendar-date'),column:string,format:choice(...formats),as:string})]};
const report=object({rowTransforms:array(rowTransform),stages:array(stage),derived:array(object({op:choice('difference','ratio','percent-change'),left:string,right:string,as:string})),orderBy:array(object({column:string,direction:choice('asc','desc')}))});
const definition={name:'propose_project',description:'Prepare a draft business assignment for an already inspected sourceId. Each report has optional rowTransforms (empty array when unused), then 1-4 stages grouping original/previous-stage rows. product multiplies numeric left/right columns per source record; calendar-date extracts the local calendar day using an explicit source-supported format, without locale guessing or timezone conversion. Name transformed columns with as, without replacing source columns. Date parts require ISO dates. Filters have typed values; is-null/not-null take null. count-rows takes column:null; count/count-distinct exclude NULL but include empty text unless explicitly filtered; distinct values are not automatically customers/invoices. Other measures name source/transformed/prior-stage columns. Counts require empty:zero; others state null or zero. Derived difference, ratio and percent-change use named numeric results. Empty arrays mean no filters/derived/order. Declared order must include grouping keys as tie breakers. Match inspected source identifiers, schema and units. Signed amount is not automatically revenue: state inclusion of returns/cancellations and missing IDs according to the business request. Expected values are computed from source records, not reference SQL. Success means computational validity, not verified business meaning, scoring or XP.',parameters:object({sourceId:string,title:string,businessContext:string,observationUnit:string,tasks:array(object({id:string,title:string,businessRequest:string,report}))})};
function createPlanner({catalogue,signal,assertCurrent=()=>{},studentRequest=null,discussion=null}={}){
 discussion=discussion===null?null:Conversation.state(discussion);let studentConversation=[];
 if(discussion){studentRequest=Conversation.original(discussion.history,discussion.input);if(!discussion.input.trim())throw Error('PROJECT_REQUEST_INPUT');}
 // Host-captured text stays outside the model-authored proposal. Old callers
 // may not have the original request; never reconstruct it from AI prose.
 if(studentRequest!==null&&(typeof studentRequest!=='string'||!studentRequest.trim()||studentRequest.includes('\0')))throw Error('PROJECT_REQUEST_INPUT');
 const controller=new AbortController(),requestSignal=signal?AbortSignal.any([signal,controller.signal]):controller.signal;
 const discovery=createDiscoverySession({catalogue,signal:requestSignal});let closed=false,draft=null,sequence=0;
 const current=()=>{if(closed||requestSignal.aborted)throw Error('PROJECT_PLANNER_CLOSED');assertCurrent();};
 const text=v=>typeof v==='string'&&!!v.trim()&&v.length<=12000;
 async function propose(value){
  current();const mine=++sequence;draft=null;value=structuredClone(value);
  if(!value||Object.keys(value).sort().join(',')!=='businessContext,observationUnit,sourceId,tasks,title'||![value.title,value.businessContext,value.observationUnit].every(text)||!Array.isArray(value.tasks)||!value.tasks.length||value.tasks.length>8)throw Error('PROJECT_PROPOSAL_INVALID');
  const seen=new Set();for(const [i,t]of value.tasks.entries())at('/tasks/'+i,()=>{if(!t||Object.keys(t).sort().join(',')!=='businessRequest,id,report,title'||![t.id,t.title,t.businessRequest].every(text)||seen.has(t.id))throw Error('PROJECT_PROPOSAL_INVALID');seen.add(t.id);});
  const source=at('/sourceId',()=>discovery.sourceInput(value.sourceId));
  // Recorded version-1 proposals remain readable; new tool calls use version 2.
  const plans=value.tasks.map((t,i)=>at('/tasks/'+i+'/report',()=>{const shape=Object.keys(t.report||{}).sort().join(',');if(!['derived,orderBy,stages','derived,orderBy,rowTransforms,stages'].includes(shape))throw Error('PROJECT_PROPOSAL_INVALID');return {...structuredClone(t.report),version:Object.hasOwn(t.report,'rowTransforms')?2:1,sourceSha256:source.sha256};}));
  const prepared=await prepareReportPlans({download:source,plans},{signal:requestSignal});current();if(mine!==sequence)throw Error('PROJECT_PROPOSAL_SUPERSEDED');
  draft={version:1,sourceId:value.sourceId,source:prepared.source,title:value.title.trim(),businessContext:value.businessContext.trim(),observationUnit:value.observationUnit.trim(),tasks:value.tasks.map((t,i)=>({id:t.id,title:t.title,businessRequest:t.businessRequest,...prepared.plans[i]})),status:'draft-needs-business-review',gradingEnabled:false,rewardsEnabled:false,businessMeaningVerified:false};
  return {acceptedDraft:true,title:draft.title,sourceId:draft.sourceId,tasks:draft.tasks.map(t=>({id:t.id,title:t.title,specSha256:t.specSha256,outputRows:t.outputRows})),businessMeaningVerified:false,gradingEnabled:false,rewardsEnabled:false};
 }
 return {definitions:[...discovery.definitions,structuredClone(definition)],async invoke(name,args){current();const result=await discovery.invoke(name,args);current();return result;},async read(args){current();const result=await discovery.read(args);current();return result;},propose,finishConversation(answer,observations=[]){current();if(!draft)throw Error("PROJECT_DRAFT_REQUIRED");if(discussion)studentConversation=Conversation.complete(discussion,discussion.input,answer,observations).history;},getDraft:()=>{current();return draft?structuredClone(draft):null;},exportDraft(){current();if(!draft)throw Error('PROJECT_DRAFT_REQUIRED');return {draft:structuredClone(draft),studentRequest,studentConversation:Conversation.history(studentConversation),...discovery.exportSource(draft.sourceId)};},async importSelection(...args){current();const result=await discovery.importSelection(...args);current();return result;},close(){if(closed)return;closed=true;sequence++;draft=null;controller.abort();discovery.close();}};
}
module.exports={definition,createPlanner};
