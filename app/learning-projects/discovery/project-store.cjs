'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),{randomUUID}=require('node:crypto');
const {digest}=require('./verified-csv.cjs');
const {normalize}=require('./report-measures.cjs');
const {verifyFileInWorker}=require('./prepare-runner.cjs');
const {assessSubmission,assessReports}=require('./report-assessment.cjs');
const {createReviewSession}=require('./business-review.cjs');
const Conversation=require('./project-conversation.js');
const Completion=require('./project-completion.cjs');
const fail=code=>{throw Error('PROJECT_STORE_'+code);};
const validId=id=>typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id);
const sha=value=>typeof value==='string'&&/^[0-9a-f]{64}$/.test(value);
const text=(value,max)=>typeof value==='string'&&value.length<=max&&!value.includes('\0');
const recordLimit=4*1024*1024;
function createProjectStore({directory,beforeCommit=async()=>{}}={}){
 if(typeof directory!=='string'||!path.isAbsolute(directory))fail('DIRECTORY');
 const root=path.resolve(directory),locks=new Map(),reviews=new Map(),reviewStarts=new Map(),controller=new AbortController();let closed=false;
 const current=()=>{if(closed)fail('CLOSED');};
 const location=id=>{if(!validId(id))fail('ID');return path.join(root,id);};
 const limited=async(file,max)=>{const info=await fs.stat(file);if(!info.isFile()||info.size>max)fail('FILE');const bytes=await fs.readFile(file);if(bytes.length>max)fail('FILE');return bytes;};
 const lock=(id,action)=>{const prior=locks.get(id)||Promise.resolve(),job=prior.catch(()=>{}).then(()=>{current();return action();});locks.set(id,job);job.finally(()=>{if(locks.get(id)===job)locks.delete(id);}).catch(()=>{});return job;};
 function validate(record,id){
  if(!record||record.version!==1||record.id!==id||!validId(id)||!Number.isSafeInteger(record.revision)||record.revision<0||!['draft','working'].includes(record.status)||!record.draft||!Array.isArray(record.draft.tasks)||!record.draft.tasks.length||record.draft.tasks.length>8||record.draft.gradingEnabled!==false||record.draft.rewardsEnabled!==false||record.draft.businessMeaningVerified!==false)fail('RECORD');
  if(!record.files||!['csv','database','metadata'].every(k=>sha(record.files[k])))fail('RECORD');
  if(record.studentRequest!=null&&(typeof record.studentRequest!=='string'||!record.studentRequest.trim()||record.studentRequest.includes('\0')))fail('RECORD');
  if(record.studentConversation!==undefined)Conversation.history(record.studentConversation);
  const tasks=new Set();for(const task of record.draft.tasks){if(!text(task.id,12000)||!task.id.trim()||tasks.has(task.id))fail('RECORD');tasks.add(task.id);normalize(task.spec,record.draft.source);if(digest(JSON.stringify(task.spec))!==task.specSha256)fail('RECORD');}
  if(!record.reports||typeof record.reports!=='object'||Array.isArray(record.reports)||!record.checks||typeof record.checks!=='object'||Array.isArray(record.checks)||Object.keys(record.reports).some(id=>!tasks.has(id)))fail('RECORD');
  for(const value of Object.values(record.reports))if(!value||!text(value.sql,100000)||!text(value.note,12000))fail('RECORD');
  if(record.workspace!==null&&(!text(record.workspace?.id,256)||!record.workspace.id.trim()||!text(record.workspace.name,256)||!record.workspace.name.trim()))fail('RECORD');
  if(record.status==='working'&&!record.workspace)fail('RECORD');
  if(record.review!==undefined&&(record.review?.kind!=='ai-business-feedback'||record.review.awardsAllowed!==false||record.review.businessMeaningVerified!==false||record.review.semanticAccuracyVerified!==false||!sha(record.review.snapshotSha256)||record.review.fingerprint?.projectId!==id||record.review.fingerprint?.projectRevision>=record.revision))fail('RECORD');
  if(record.completion!==undefined)Completion.validate(record.completion,record);
  return record;
 }
 async function get(id){
  current();let envelope;try{envelope=JSON.parse(await limited(path.join(location(id),'record.json'),recordLimit));}catch(error){if(error.code==='ENOENT')fail('NOT_FOUND');if(error.message.startsWith('PROJECT_STORE_'))throw error;fail('RECORD');}
  if(!envelope||!sha(envelope.sha256)||digest(JSON.stringify(envelope.record))!==envelope.sha256)fail('INTEGRITY');
  return structuredClone(validate(envelope.record,id));
 }
 async function commit(record,guard=()=>{}){
  validate(record,record.id);const payload=JSON.stringify({sha256:digest(JSON.stringify(record)),record});if(Buffer.byteLength(payload)>recordLimit)fail('RECORD_SIZE');
  const folder=location(record.id),tmp=path.join(folder,'record-'+randomUUID()+'.tmp');
  await beforeCommit(structuredClone(record));current();guard();
  try{await fs.writeFile(tmp,payload,{flag:'wx',mode:0o600});current();guard();
   // Atomic replacement is the commit point. A later close cannot undo it.
   await fs.rename(tmp,path.join(folder,'record.json'));return structuredClone(record);
  }finally{await fs.unlink(tmp).catch(()=>{});}
 }
 async function mutate(id,revision,fn,guard=()=>{}){
  if(!Number.isSafeInteger(revision)||revision<0)fail('REVISION');
  return lock(id,async()=>{const record=await get(id);if(record.revision!==revision)fail('STALE');guard();fn(record);record.revision++;record.updatedAt=new Date().toISOString();const saved=await commit(record,guard);for(const [token,r]of reviews)if(r.id===id){r.session.close();reviews.delete(token);}return saved;});
 }
 async function capture(planner,{assertCurrent=()=>{}}={}){
  current();assertCurrent();const bundle=planner.exportDraft(),{draft,download,database,receipt}=bundle,stamp=digest(JSON.stringify({draft,studentRequest:bundle.studentRequest??null,studentConversation:bundle.studentConversation??[]}));
  if(!(download?.bytes instanceof Uint8Array)||download.bytes.length>64*1024*1024||!(database instanceof Uint8Array)||database.length>128*1024*1024||digest(download.bytes)!==receipt?.sha256||digest(database)!==receipt.databaseSha256||draft.source.sha256!==receipt.sha256||draft.source.databaseSha256!==receipt.databaseSha256)fail('BUNDLE');
  const metadata={metadata:download.metadata,source:download.source,sha256:download.sha256,fetchedAt:download.fetchedAt},metadataBytes=Buffer.from(JSON.stringify(metadata));if(metadataBytes.length>2*1024*1024)fail('FILE');
  const id=randomUUID(),at=new Date().toISOString(),record={version:1,id,revision:0,status:'draft',createdAt:at,updatedAt:at,draft,studentRequest:bundle.studentRequest??null,studentConversation:Conversation.history(bundle.studentConversation??[]),workspace:null,reports:{},checks:{},files:{csv:digest(download.bytes),database:digest(database),metadata:digest(metadataBytes)}};
  validate(record,id);await fs.mkdir(root,{recursive:true});await fs.mkdir(location(id));
  await fs.writeFile(path.join(location(id),'source.csv'),download.bytes,{flag:'wx',mode:0o600});await fs.writeFile(path.join(location(id),'source.sqlite'),database,{flag:'wx',mode:0o600});await fs.writeFile(path.join(location(id),'source.json'),metadataBytes,{flag:'wx',mode:0o600});
  return commit(record,()=>{assertCurrent();const currentBundle=planner.exportDraft();if(digest(JSON.stringify({draft:currentBundle.draft,studentRequest:currentBundle.studentRequest??null,studentConversation:currentBundle.studentConversation??[]}))!==stamp)fail('STALE');});
 }
 async function source(record){
  const folder=location(record.id),[bytes,metadataBytes,database]=await Promise.all([limited(path.join(folder,'source.csv'),64*1024*1024),limited(path.join(folder,'source.json'),2*1024*1024),limited(path.join(folder,'source.sqlite'),128*1024*1024)]);
  if(digest(bytes)!==record.files.csv||digest(database)!==record.files.database||digest(metadataBytes)!==record.files.metadata)fail('SOURCE_INTEGRITY');
  let metadata;try{metadata=JSON.parse(metadataBytes);}catch{fail('SOURCE_INTEGRITY');}
  if(metadata.sha256!==record.draft.source.sha256||record.files.csv!==metadata.sha256||record.files.database!==record.draft.source.databaseSha256)fail('SOURCE_INTEGRITY');
  return {download:{...metadata,bytes:new Uint8Array(bytes)},database:new Uint8Array(database)};
 }
 async function importSelection(id,bytes,options={}){
  const record=await get(id),data=await source(record),signal=options.signal?AbortSignal.any([options.signal,controller.signal]):controller.signal;
  const match=await verifyFileInWorker(record.draft.source,bytes,{signal});current();return {database:data.database,receipt:structuredClone(record.draft.source),match:match.match,projectRevision:record.revision};
 }
 const bindWorkspace=(id,revision,workspace)=>{workspace=structuredClone(workspace);return mutate(id,revision,r=>{
  if(!workspace||Object.keys(workspace).sort().join(',')!=='id,name'||!text(workspace.id,256)||!workspace.id.trim()||!text(workspace.name,256)||!workspace.name.trim())fail('WORKSPACE');
  r.workspace=structuredClone(workspace);r.status='working';r.checks={};delete r.review;
 });};
 const saveReport=(id,revision,taskId,value)=>{value=structuredClone(value);return mutate(id,revision,r=>{
  if(!r.draft.tasks.some(t=>t.id===taskId)||!value||Object.keys(value).sort().join(',')!=='note,sql'||!text(value.sql,100000)||!text(value.note,12000))fail('REPORT');
  // Dictionary keys are opaque task IDs; avoid prototype mutation via __proto__.
  Object.defineProperty(r.reports,taskId,{value:structuredClone(value),enumerable:true,writable:true,configurable:true});delete r.checks[taskId];delete r.review;
 });};
 async function check(id,revision,{taskId,workspaceId,database},{signal,assertCurrent=()=>{},...options}={}){
  if(!(database instanceof Uint8Array)||!database.length||database.length>128*1024*1024)fail('WORKSPACE');
  const snapshot=new Uint8Array(database);
  current();const record=await get(id);if(record.revision!==revision)fail('STALE');if(record.workspace?.id!==workspaceId||!workspaceId)fail('WORKSPACE');
  const task=record.draft.tasks.find(t=>t.id===taskId),report=Object.hasOwn(record.reports,taskId)?record.reports[taskId]:null;if(!task||!report)fail('REPORT');
  const combined=signal?AbortSignal.any([signal,controller.signal]):controller.signal;
  const guard=()=>{current();if(combined.aborted)fail('ABORTED');assertCurrent();};guard();const data=await source(record);guard();
  const assessment=await assessSubmission({download:data.download,spec:task.spec,sql:report.sql,database:snapshot},{...options,signal:combined});guard();
  const saved=await mutate(id,revision,r=>{
   const check={at:new Date().toISOString(),numericCorrect:assessment.numericCorrect,sourceSha256:assessment.sourceSha256,workspaceSha256:assessment.workspaceSha256,specSha256:assessment.specSha256,sqlSha256:assessment.sqlSha256,expectedRows:assessment.expectedRows,actualRows:assessment.actual?.values.length??null,assignmentReviewed:false,awardsAllowed:false};
   Object.defineProperty(r.checks,taskId,{value:check,enumerable:true,writable:true,configurable:true});delete r.review;
  },guard);
  return {record:saved,assessment};
 }
 async function beginReview(id,revision,{workspaceId,database},{signal,assertCurrent=()=>{},assertReviewCurrent=assertCurrent,...options}={}){
  if(!(database instanceof Uint8Array)||!database.length||database.length>128*1024*1024)fail('WORKSPACE');
  location(id);const sequence=(reviewStarts.get(id)||0)+1;reviewStarts.set(id,sequence);
  const snapshot=new Uint8Array(database),record=await get(id);
  if(record.revision!==revision)fail('STALE');if(!workspaceId||record.workspace?.id!==workspaceId)fail('WORKSPACE');
  const submissions=record.draft.tasks.map(task=>{
   const report=Object.hasOwn(record.reports,task.id)?record.reports[task.id]:null;
   if(!report?.sql.trim()||!report.note.trim())fail('REVIEW_INCOMPLETE');
   return {id:task.id,spec:task.spec,sql:report.sql};
  });
  const combined=signal?AbortSignal.any([signal,controller.signal]):controller.signal;
  const guard=()=>{current();if(combined.aborted)fail('ABORTED');if(reviewStarts.get(id)!==sequence)fail('STALE');assertCurrent();};
  const live=async()=>{guard();if((await get(id)).revision!==revision)fail('STALE');guard();};
  const reviewGuard=()=>{current();if(combined.aborted)fail('ABORTED');if(reviewStarts.get(id)!==sequence)fail('STALE');assertReviewCurrent();};
  const reviewLive=async()=>{reviewGuard();if((await get(id)).revision!==revision)fail('STALE');reviewGuard();};
  guard();const data=await source(record);await live();
  const batch=await assessReports({download:data.download,reports:submissions,database:snapshot},{...options,signal:combined});await live();
  const session=createReviewSession({record,batch,assertCurrent:reviewLive,onSubmit:async(review,sessionGuard)=>{
   const saved=await mutate(id,revision,r=>{r.review=review;},()=>{reviewGuard();sessionGuard();});return saved.review;
  }});
  // A fresh review replaces an older uncommitted session of the same project.
  for(const [token,r]of reviews)if(r.id===id){r.session.close();reviews.delete(token);}
  const token=randomUUID();reviews.set(token,{id,session});
  return {token,context:session.context(),definitions:session.definitions,workspaceSha256:batch.reports[0].workspaceSha256};
 }
 async function reviewTool(id,token,name,args){
  current();const entry=reviews.get(token);if(!entry||entry.id!==id)fail('REVIEW_CLOSED');
  if(name==='read_project_evidence')return entry.session.read(args);
  if(name==='submit_project_review')return entry.session.submit(args);
  fail('REVIEW_TOOL');
 }
 function cancelReview(token){const entry=reviews.get(token);if(entry){entry.session.close();reviews.delete(token);}return true;}
 async function complete(id,revision,{workspaceId,database},{signal,assertCurrent=()=>{}}={}){
  if(!Number.isSafeInteger(revision)||revision<0)fail('REVISION');
  const snapshot=database instanceof Uint8Array?new Uint8Array(database):null;
  return lock(id,async()=>{
   const guard=()=>{current();if(signal?.aborted)fail('ABORTED');assertCurrent();};guard();
   const record=await get(id);guard();
   // A committed historical achievement survives later edits and lost replies.
   if(record.completion)return {record,completion:structuredClone(record.completion.receipt),alreadyCompleted:true};
   if(record.revision!==revision)fail('STALE');
   if(!snapshot?.length||snapshot.length>128*1024*1024||record.workspace?.id!==workspaceId)fail('WORKSPACE');
   const workspaceSha256=digest(snapshot);Completion.eligibility(record,workspaceSha256);
   await source(record);guard();
   record.completion=Completion.create(record,workspaceSha256);record.revision++;record.updatedAt=new Date().toISOString();
   const saved=await commit(record,guard);return {record:saved,completion:structuredClone(saved.completion.receipt),alreadyCompleted:false};
  });
 }
 async function list(){
  current();let entries;try{entries=await fs.readdir(root,{withFileTypes:true});}catch(error){if(error.code==='ENOENT')return [];throw error;}
  const items=[];for(const entry of entries){if(!entry.isDirectory()||!validId(entry.name))continue;
   try{const r=await get(entry.name);items.push({id:r.id,revision:r.revision,title:r.draft.title,status:r.status,workspace:r.workspace,updatedAt:r.updatedAt,...(r.completion?{completion:structuredClone(r.completion.receipt)}:{})});}
   catch(error){current();if(error.message==='PROJECT_STORE_NOT_FOUND')continue;items.push({id:entry.name,status:'unavailable',code:error.message});}
  }
  return items.sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));
 }
 return {capture,get,list,importSelection,bindWorkspace,saveReport,check,beginReview,reviewTool,cancelReview,complete,close(){closed=true;controller.abort();for(const r of reviews.values())r.session.close();reviews.clear();reviewStarts.clear();}};
}
module.exports={createProjectStore};
