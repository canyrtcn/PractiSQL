'use strict';
const crypto=require('node:crypto');
const {open}=require('./runner.cjs');
function setup({ipcMain,app}){
 const owners=new Map();
 async function closeGroup(owner,group){const record=owner.groups.get(group);if(!record)return;record.closed=true;owner.groups.delete(group);await Promise.all([...record.results.values()].map(r=>r.close()));}
 ipcMain.handle('ai:inspect-current-data',async(event,input)=>{
  try{
   if(!input||typeof input.group!=='string'||input.group.length>100)throw Error('Invalid inspection group');
   const sender=event.sender;
   let owner=owners.get(sender.id);
   if(!owner){owner={groups:new Map()};owners.set(sender.id,owner);sender.once('destroyed',()=>{owners.delete(sender.id);for(const group of [...owner.groups.keys()])closeGroup(owner,group).catch(()=>{});});}
   const {group,action}=input;
   if(action==='close'){await closeGroup(owner,group);return {ok:true};}
   let state=owner.groups.get(group);
   if(action==='query'&&!state){state={results:new Map(),closed:false};owner.groups.set(group,state);}
   if(!state||state.closed)throw Error('Inspection group is unavailable');
   const assertCurrent=()=>{if(state.closed||sender.isDestroyed())throw Error('Inspection owner closed');};
   if(action==='query'){
    const cursor=await open(input.snapshot,input.sql,{assertCurrent});
    if(state.closed||sender.isDestroyed()){await cursor.close();throw Error('Inspection owner closed');}
    const resultId=crypto.randomUUID();state.results.set(resultId,cursor);
    try{return {...await cursor.page({characters:input.characters}),resultId};}
    catch(error){state.results.delete(resultId);await cursor.close();throw error;}
   }
   const cursor=state.results.get(input.resultId);
   if(!cursor)throw Error('Result source is unavailable');
   if(action==='next')return {...await cursor.page({characters:input.characters}),resultId:input.resultId};
   if(action==='cell')return await cursor.cell(input.cellId,input.offset,input.characters);
   throw Error('Unknown inspection action');
  }catch(error){return {error:error.message,code:error.code||'INSPECTION_UNAVAILABLE'};}
 });
 app.on('before-quit',()=>{for(const owner of owners.values())for(const group of [...owner.groups.keys()])closeGroup(owner,group).catch(()=>{});});
}
module.exports={setup};
