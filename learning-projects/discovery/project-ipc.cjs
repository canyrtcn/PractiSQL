'use strict';
const path=require('node:path'),{randomUUID}=require('node:crypto'),{pathToFileURL}=require('node:url');
const {createProjectStore}=require('./project-store.cjs');
const {createPlanner}=require('./project-planner.cjs');
const {createCatalogue,trustedUrl}=require('./uci-catalogue.cjs');
const Errors=require('./project-errors.js');
function setup({app,ipcMain,shell,rendererFile,catalogueFactory=createCatalogue}){
 const owners=new Map(),store=createProjectStore({directory:path.join(app.getPath('userData'),'learning-project-drafts')});
 function close(owner){owner.epoch++;owner.planner?.close();owner.planner=null;owner.session=null;owner.job?.controller.abort();owner.job=null;if(owner.review)store.cancelReview(owner.review.token);owner.review=null;}
 function ownerFor(event){
  let location;try{location=new URL(event.senderFrame.url);location.search='';location.hash='';}catch{throw Error('PROJECT_IPC_OWNER');}
  if(event.senderFrame!==event.sender.mainFrame||location.href!==pathToFileURL(rendererFile).href)throw Error('PROJECT_IPC_OWNER');
  let owner=owners.get(event.sender.id);
  if(!owner){owner={epoch:0,planner:null,session:null,job:null};owners.set(event.sender.id,owner);event.sender.once('destroyed',()=>{close(owner);owners.delete(event.sender.id);});event.sender.on('did-start-navigation',(_e,_url,_inPlace,isMainFrame)=>{if(isMainFrame)close(owner);});}
  return owner;
 }
 const guard=(owner,epoch)=>{if(owner.epoch!==epoch)throw Error('PROJECT_IPC_STALE');};
 async function job(owner,id,action){
  if(typeof id!=='string'||!id||id.length>100||owner.job)throw Error('PROJECT_IPC_BUSY');
  const current={id,controller:new AbortController()},epoch=owner.epoch;owner.job=current;
  const assertCurrent=()=>{guard(owner,epoch);if(owner.job!==current||current.controller.signal.aborted)throw Error('PROJECT_IPC_CANCELLED');};
  try{assertCurrent();const result=await action({signal:current.controller.signal,assertCurrent});assertCurrent();return result;}finally{if(owner.job===current)owner.job=null;}
 }
 async function invoke(event,operation,input={}){
  const owner=ownerFor(event);
  switch(operation){
   case 'list':return store.list();
   case 'get':return store.get(input.id);
   case 'begin':{
    close(owner);owner.planner=createPlanner({catalogue:catalogueFactory(),studentRequest:input.studentRequest??null,discussion:input.discussion??null,assertCurrent:()=>guard(owner,epoch)});const epoch=owner.epoch;owner.session=randomUUID();return {session:owner.session,definitions:owner.planner.definitions};
   }
   case 'tool':{
    if(owner.session!==input.session||!owner.planner)throw Error('PROJECT_IPC_STALE');
    const planner=owner.planner,epoch=owner.epoch;
    const result=['search_project_datasets','describe_project_dataset','inspect_project_dataset'].includes(input.name)?await planner.invoke(input.name,input.args):input.name==='propose_project'?await planner.propose(input.args):(()=>{throw Error('PROJECT_IPC_TOOL');})();
    guard(owner,epoch);return result;
   }
   case 'capture':{
    if(owner.session!==input.session||!owner.planner)throw Error('PROJECT_IPC_STALE');const planner=owner.planner;
    planner.finishConversation(input.answer,input.observations);
    const record=await job(owner,input.job,options=>store.capture(planner,options));planner.close();if(owner.planner===planner){owner.planner=null;owner.session=null;}return record;
   }
   case 'cancel':close(owner);return true;
   case 'cancel-job':if(owner.job?.id===input.job)owner.job.controller.abort();return true;
   case 'import':return job(owner,input.job,options=>store.importSelection(input.id,input.bytes,options));
   case 'bind':return store.bindWorkspace(input.id,input.revision,input.workspace);
   case 'save':return store.saveReport(input.id,input.revision,input.taskId,input.value);
   case 'check':return job(owner,input.job,options=>store.check(input.id,input.revision,{taskId:input.taskId,workspaceId:input.workspaceId,database:input.database},options));
   case 'complete':return job(owner,input.job,options=>store.complete(input.id,input.revision,{workspaceId:input.workspaceId,database:input.database},options));
   case 'review-begin':{
    if(owner.review)store.cancelReview(owner.review.token);owner.review=null;const epoch=owner.epoch;
    const result=await job(owner,input.job,options=>store.beginReview(input.id,input.revision,{workspaceId:input.workspaceId,database:input.database},{...options,assertReviewCurrent:()=>guard(owner,epoch)}));
    guard(owner,epoch);owner.review={id:input.id,token:result.token};return result;
   }
   case 'review-tool':{
    if(!owner.review||owner.review.id!==input.id||owner.review.token!==input.token)throw Error('PROJECT_IPC_STALE');
    const epoch=owner.epoch,result=await store.reviewTool(input.id,input.token,input.name,input.args);guard(owner,epoch);return result;
   }
   case 'review-cancel':if(owner.review?.token===input.token){store.cancelReview(input.token);owner.review=null;}return true;
   case 'source':{
    const record=await store.get(input.id),source=record.draft.source;const url=trustedUrl(input.kind==='csv'?source.downloadUrl:source.source,source.id,input.kind==='csv'?'csv':'page');await shell.openExternal(url);return true;
   }
   default:throw Error('PROJECT_IPC_OPERATION');
  }
 }
 ipcMain.handle('project-explore:invoke',async(event,operation,input)=>{
  try{return {ok:true,result:await invoke(event,operation,input)};}catch(error){return {ok:false,...Errors.pack(error)};}
 });
 app.on('before-quit',()=>{for(const owner of owners.values())close(owner);owners.clear();store.close();});
 return {dispose(){for(const owner of owners.values())close(owner);owners.clear();store.close();ipcMain.removeHandler('project-explore:invoke');}};
}
module.exports={setup};
