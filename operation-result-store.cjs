// Immutable local results. Reading them never reruns historical SQL.
'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const digest=text=>crypto.createHash('sha256').update(text).digest('hex');
function createResultStore(directory){
 async function save(record){
  if(record?.version!==1||!['operationId','chatId','scope'].every(k=>typeof record[k]==='string'&&record[k])||!Array.isArray(record.results))throw Error('Invalid operation results');
  const text=JSON.stringify(record),sha256=digest(text),file=path.join(directory,sha256+'.json');
  await fs.mkdir(directory,{recursive:true});
  const temporary=path.join(directory,sha256+'.'+crypto.randomUUID()+'.tmp');
  try{await fs.writeFile(temporary,text,{encoding:'utf8',flag:'wx'});await fs.rename(temporary,file);}
  catch(error){await fs.unlink(temporary).catch(()=>{});throw error;}
  return {version:1,sha256,characters:text.length,bytes:Buffer.byteLength(text),operationId:record.operationId,chatId:record.chatId,scope:record.scope};
 }
 async function read(reference,offset,characters){
  if(!/^[a-f0-9]{64}$/.test(reference?.sha256||'')||!Number.isSafeInteger(offset)||offset<0||!Number.isSafeInteger(characters)||characters<0||characters>24000)throw Error('Invalid result archive reference');
  const text=await fs.readFile(path.join(directory,reference.sha256+'.json'),'utf8');
  if(digest(text)!==reference.sha256)throw Error('Result archive integrity mismatch');
  const record=JSON.parse(text);
  if(record.version!==1||!['operationId','chatId','scope'].every(k=>record[k]===reference[k]))throw Error('Result archive belongs to a different operation');
  const fragment=text.slice(offset,offset+characters),end=offset+fragment.length;
  return {text:fragment,characters:text.length,offset,complete:offset===0&&end>=text.length,nextOffset:end<text.length?end:null};
 }
 return {save,read};
}
module.exports={createResultStore};
