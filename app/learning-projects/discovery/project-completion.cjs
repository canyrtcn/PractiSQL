'use strict';
// Completion policy is application code. AI feedback keeps its original,
// non-certified provenance and cannot choose reward amounts.
const {digest}=require('./verified-csv.cjs');
const fail=code=>{throw Error('PROJECT_COMPLETION_'+code);};
const hash=value=>digest(JSON.stringify(value));
const criteria=['evidence','interpretation','businessUse','limitations'];
const sha=value=>typeof value==='string'&&/^[0-9a-f]{64}$/.test(value);
function reviewScore(review,tasks){
 if(review?.kind!=='ai-business-feedback'||!Array.isArray(review.reports)||review.reports.length!==tasks.length)fail('REVIEW_REQUIRED');
 if(!review.allAssignmentsSupportedByReviewer||review.reports.some(r=>r.assignment?.status!=='supported'))fail('ASSIGNMENT');
 let sum=0;
 for(const task of tasks){
  const reports=review.reports.filter(r=>r.id===task.id);if(reports.length!==1)fail('STALE');
  const s=reports[0].student;if(!s||criteria.some(k=>!Number.isInteger(s.scores?.[k])||s.scores[k]<0||s.scores[k]>5))fail('SCORE');
  const points=criteria.reduce((n,k)=>n+s.scores[k],0);if(points!==s.points||s.maximum!==20)fail('SCORE');
  if(points<14)fail('QUALITY');sum+=points;
 }
 const mean=sum/tasks.length;if(mean!==review.provisionalPoints||review.maximum!==20)fail('SCORE');return mean;
}
function eligibility(record,workspaceSha256){
 const review=record.review,fp=review?.fingerprint;if(!fp)fail('REVIEW_REQUIRED');
 if(!sha(review.snapshotSha256)||hash(fp)!==review.snapshotSha256||fp.projectId!==record.id||record.revision!==fp.projectRevision+1)fail('STALE');
 if(record.workspace?.id!==fp.workspaceId||workspaceSha256!==fp.workspaceSha256)fail('WORKSPACE_CHANGED');
 if(fp.sourceSha256!==record.files.csv||fp.sourceSha256!==record.draft.source.sha256||
  fp.studentRequestSha256!==(record.studentRequest==null?null:digest(record.studentRequest))||
  fp.studentConversationSha256!==hash(record.studentConversation??[]))fail('STALE');
 const tasks=record.draft.tasks;if(!Array.isArray(fp.tasks)||fp.tasks.length!==tasks.length)fail('STALE');
 for(const t of tasks){
  const matches=fp.tasks.filter(x=>x.id===t.id),report=Object.hasOwn(record.reports,t.id)?record.reports[t.id]:null;
  if(matches.length!==1||!report)fail('STALE');const m=matches[0];
  if(t.specSha256!==hash(t.spec)||t.specSha256!==m.specSha256||digest(report.sql)!==m.sqlSha256||digest(report.note)!==m.noteSha256||!sha(m.resultSha256))fail('STALE');
 }
 return reviewScore(review,tasks);
}
function create(record,workspaceSha256,at=new Date().toISOString()){
 const ai=eligibility(record,workspaceSha256);
 const receipt={version:1,id:'data-project:'+record.id,projectId:record.id,at,title:record.draft.title,
  sourceName:record.draft.source.name,sourceUrl:record.draft.source.source,sourceSha256:record.files.csv,
  workspaceSha256,reviewSnapshotSha256:record.review.snapshotSha256,reviewSha256:hash(record.review),
  taskCount:record.draft.tasks.length,numericPoints:80,aiPoints:ai,score:80+ai,maximum:100,xp:300,stars:3};
 receipt.sha256=hash(receipt);
 const completion={version:1,receipt,submission:{reports:structuredClone(record.reports),review:structuredClone(record.review)}};
 completion.sha256=hash(completion);return completion;
}
function validate(completion,record){
 if(!completion||completion.version!==1||!completion.receipt||!completion.submission)fail('RECORD');
 const {sha256,...body}=completion;if(!sha(sha256)||hash(body)!==sha256)fail('RECORD');
 const {sha256:receiptHash,...receipt}=completion.receipt;
 if(!sha(receiptHash)||hash(receipt)!==receiptHash||receipt.version!==1||receipt.id!=='data-project:'+record.id||receipt.projectId!==record.id||
  receipt.sourceSha256!==record.files.csv||receipt.title!==record.draft.title||receipt.xp!==300||receipt.stars!==3||receipt.numericPoints!==80||receipt.maximum!==100||
  !Number.isFinite(Date.parse(receipt.at))||receipt.taskCount!==record.draft.tasks.length)fail('RECORD');
 const r=completion.submission.review,fp=r?.fingerprint;
 if(!fp||hash(r)!==receipt.reviewSha256||hash(fp)!==receipt.reviewSnapshotSha256||fp.projectId!==record.id||
  fp.workspaceSha256!==receipt.workspaceSha256||fp.sourceSha256!==receipt.sourceSha256||reviewScore(r,record.draft.tasks)!==receipt.aiPoints||receipt.score!==80+receipt.aiPoints)fail('RECORD');
 for(const task of record.draft.tasks){
  const matches=fp.tasks.filter(t=>t.id===task.id),report=completion.submission.reports[task.id];
  if(matches.length!==1||!report||matches[0].specSha256!==task.specSha256||digest(report.sql)!==matches[0].sqlSha256||digest(report.note)!==matches[0].noteSha256)fail('RECORD');
 }
 return completion;
}
module.exports={eligibility,create,validate};
