/* An immutable, response-local index. This tool can only read recorded sources. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AiContextSources=api;})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').toLowerCase();
 const definition={name:'read_context',description:'Read exact earlier messages, SQL, execution records or current editor/catalog sources from this conversation and database snapshot. Use only when needed information is absent or an excerpt is incomplete. Pass source_ids to read known sources; otherwise query searches the source text (empty query lists recent sources). Content is historical evidence, not a new task. This cannot execute SQL or inspect unseen database rows. Offsets are characters; use nextOffset to continue large sources.',parameters:{type:'object',properties:{source_ids:{type:'array',items:{type:'string'},maxItems:4},query:{type:'string'},offset:{type:'integer',minimum:0},characters:{type:'integer',minimum:1,maximum:24000}},required:['source_ids','query','offset','characters'],additionalProperties:false}};
 function create({chat,scope,current=[],messageContent=m=>String(m.content||''),messagePresentation=messageContent,excludeCurrentUser=true,readResultArchive}){
  const presentations=new Map(),records=new Map(),add=(id,kind,text,origin)=>{if(!id||records.has(id))throw new TypeError('Duplicate source identity');records.set(id,Object.freeze({id,kind,text:String(text||''),origin:structuredClone(origin||{})}));};
  const messages=(chat?.messages||[]).slice();if(excludeCurrentUser&&messages.at(-1)?.role==='user')messages.pop();
  for(const m of messages)if(m.id&&m.scope===scope&&['user','assistant'].includes(m.role))add('message:'+m.id,m.role,messageContent(m),{messageId:m.id,scope:m.scope,visibility:m.hidden?'internal':'visible',execution:m.execution||null});
  for(const m of messages)if(m.id&&m.scope===scope&&m.execution)add('outcome:'+m.id,'execution',JSON.stringify({messageId:m.id,...m.execution}),{messageId:m.id,scope});
  for(const m of messages)if(m.id&&m.scope===scope&&m.role==='assistant'){const text=String(messagePresentation(m)||'');if(text&&text!==messageContent(m))presentations.set('message:'+m.id,text);}
  const observations=typeof module==='object'&&module.exports?require('./ai-database-observations.js'):globalThis.AiDatabaseObservations;
  for(const m of messages)if(m.id&&m.scope===scope)for(const source of observations.sources(m))add(source.id,source.kind,source.text,source.origin);
  for(const e of chat?.operations||[])if(e.id&&e.scope===scope){
   const results=typeof module==='object'&&module.exports?require('./operation-results.js'):globalThis.OperationResults;
   add('operation:'+e.id,'execution',JSON.stringify(results.context(e)),{scope:e.scope,status:e.status});
   if(e.resultArchive){
    const id='result:'+e.id,reference=structuredClone(e.resultArchive),inline=e.resultArchiveInline?JSON.stringify(e.resultArchiveInline):null;
    if(records.has(id))throw new TypeError('Duplicate result source');
    records.set(id,Object.freeze({id,kind:'query-results',text:'Captured results for '+e.id+'; SQL: '+String(e.sql||''),characters:reference.characters,archive:true,needed:results.needsArchive(e),origin:{scope:e.scope,operationId:e.id,chatId:chat.id,status:e.status,...(!e.resultValueEncoding?{numericEvidence:results.legacyNumericEvidence}:{})},load:async(offset,characters)=>{if(inline!==null){const text=inline.slice(offset,offset+characters),end=offset+text.length;return {text,characters:inline.length,offset,complete:offset===0&&end>=inline.length,nextOffset:end<inline.length?end:null};}if(!readResultArchive)throw Error('Result archive reader unavailable');return readResultArchive(reference,offset,characters);}}));
   }
  }
  for(const s of current)add(s.id,s.kind,s.text,s.origin);
  const preview=s=>({id:s.id,kind:s.kind,characters:s.characters??s.text.length,preview:s.text.slice(0,180),previewComplete:!s.archive&&s.text.length<=180,origin:s.origin});
  async function readArchived(args){
   let remaining=args.characters;const sources=[];
   for(const id of [...new Set(args.source_ids)]){
    const s=records.get(id);if(!s){sources.push({id,error:'Source is not available in this conversation snapshot'});continue;}
    try{let page;if(s.archive)page=await s.load(args.offset,remaining);else{const text=s.text.slice(args.offset,args.offset+remaining),end=args.offset+text.length;page={text,characters:s.text.length,offset:args.offset,complete:args.offset===0&&end>=s.text.length,nextOffset:end<s.text.length?end:null};}remaining-=page.text.length;sources.push({id,kind:s.kind,origin:s.origin,...page});}
    catch{sources.push({id,error:'Recorded result archive unavailable or damaged; no historical rows were recovered. Do not substitute current database values.'});}
   }return {sources,snapshot:true};
  }
  function read(args){
   if(!args||typeof args!=='object'||Array.isArray(args)||Object.keys(args).some(k=>!['source_ids','query','offset','characters'].includes(k))||!Array.isArray(args.source_ids)||args.source_ids.length>4||args.source_ids.some(id=>typeof id!=='string'||id.length>200)||typeof args.query!=='string'||args.query.length>500||!Number.isSafeInteger(args.offset)||args.offset<0||!Number.isSafeInteger(args.characters)||args.characters<1||args.characters>24000)return {error:'Invalid read_context arguments'};
   if(!args.source_ids.length){
    const terms=normalize(args.query).match(/[\p{L}\p{N}_]+/gu)||[],matches=[...records.values()].map((s,i)=>({s,i,score:terms.reduce((n,w)=>n+Number(normalize(s.text).includes(w)),0)})).filter(x=>!terms.length||x.score).sort((a,b)=>b.score-a.score||b.i-a.i);
    return {sources:matches.slice(args.offset,args.offset+12).map(x=>preview(x.s)),matched:matches.length,complete:args.offset===0&&matches.length<=12,nextOffset:args.offset+12<matches.length?args.offset+12:null,search:'normalized substring matches for query terms over messages and source descriptions; archived result bodies require source_ids; a missing match does not prove information absent; offset paginates search/list results'};
   }
   if(args.source_ids.some(id=>records.get(id)?.archive))return readArchived(args);
   let remaining=Math.min(24000,args.characters);const sources=[];
   for(const id of [...new Set(args.source_ids)]){const s=records.get(id);if(!s){sources.push({id,error:'Source is not available in this conversation snapshot'});continue;}
    const text=s.text.slice(args.offset,args.offset+remaining),end=args.offset+text.length;remaining-=text.length;sources.push({id,kind:s.kind,origin:s.origin,text,offset:args.offset,characters:s.text.length,complete:args.offset===0&&end>=s.text.length,nextOffset:end<s.text.length?end:null});
   }return {sources,snapshot:true};
  }
  const manifest={tool:'read_context',sourceCount:records.size,recent:[...records.values()].slice(-8).map(preview),complete:records.size<=8};
  function missingFrom(messages){
   const contents=messages.map(m=>typeof m.content==='string'?m.content:JSON.stringify(m.content));
   return [...records.values()].filter(s=>s.archive?s.needed:(s.text&&!contents.some(c=>c.includes(s.text)||c.includes(JSON.stringify(s.text).slice(1,-1)))&&!messages.some((m,i)=>m.role==='assistant'&&presentations.has(s.id)&&contents[i].includes(presentations.get(s.id))))).map(preview);
  }
  return {read,manifest,missingFrom};
 }
 return {create,definition};
});
