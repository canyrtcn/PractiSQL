(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ProjectAwards=api;})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const fail=code=>{throw Error('PROJECT_AWARD_'+code);};
 function receipt(value){
  if(!value||value.version!==1||typeof value.projectId!=='string'||!value.projectId||value.id!=='data-project:'+value.projectId||
   !/^[0-9a-f]{64}$/.test(value.sha256)||value.xp!==300||value.stars!==3||typeof value.title!=='string'||typeof value.sourceName!=='string'||
   value.numericPoints!==80||!Number.isFinite(value.aiPoints)||value.aiPoints<14||value.aiPoints>20||value.score!==80+value.aiPoints||value.maximum!==100)fail('RECEIPT');
  return structuredClone(value);
 }
 function create({settings,persist}){
  if(!settings||typeof persist!=='function')fail('CONTEXT');let tail=Promise.resolve(),pending=new Set();
  async function apply(values){
   if(!Array.isArray(values))fail('RECEIPT');const incoming=values.map(receipt);
   const current=settings.generalProjectRewards??{version:1,receipts:[]};
   if(current.version!==1||!Array.isArray(current.receipts))fail('LEDGER');
   const seen=new Map();for(const r of current.receipts){receipt(r);if(seen.has(r.id))fail('LEDGER');seen.set(r.id,r);}
   const added=[];
   for(const r of incoming){const prior=seen.get(r.id);if(prior){if(JSON.stringify(prior)!==JSON.stringify(r))fail('CONFLICT');continue;}seen.set(r.id,r);added.push(r);}
   const xp=settings.stats?.xp??0,stars=settings.stats?.stars??0;
   if(!Number.isSafeInteger(xp)||xp<0||!Number.isSafeInteger(stars)||stars<0||!Number.isSafeInteger(xp+300*added.length)||!Number.isSafeInteger(stars+3*added.length))fail('STATS');
   if(added.length){
    settings.generalProjectRewards={version:1,receipts:[...current.receipts,...added]};
    settings.stats??={};settings.stats.xp=xp+300*added.length;settings.stats.stars=stars+3*added.length;
    for(const r of added)pending.add(r.id);
   }
   if(!pending.size)return {added:[],saved:[],persisted:true};
   // Retain the marker and amount together on an ambiguous write failure.
   // Retrying saves this same state; it must never increment again or roll back
   // unrelated XP earned while the save was in flight.
   let ok=false;try{ok=await persist()!==false;}catch{}if(!ok)fail('SAVE');
   const saved=[...pending];pending.clear();return {added:added.map(r=>r.id),saved,persisted:true};
  }
  return {sync(values){const copy=structuredClone(values),job=tail.catch(()=>{}).then(()=>apply(copy));tail=job;return job;}};
 }
 return {create};
});
