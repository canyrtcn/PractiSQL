/* Incremental SQL parsing stays off the renderer's input/layout thread. */
import {EditorState, ChangeSet} from '@codemirror/state';
import {SQLite, SQLDialect} from '@codemirror/lang-sql';
import {TreeFragment} from '@lezer/common';
import {tags, tagHighlighter, highlightTree} from '@lezer/highlight';

// Use the chat highlighter's vocabulary at build time, including its precedence.
// SQLite's default dialect lists shell commands rather than SQL functions.
const vocabulary=PRACTISQL_SQL_COLOURS;
const parser=SQLDialect.define({...SQLite.spec,
  keywords:SQLite.spec.keywords+' '+vocabulary.KW.join(' '),
  types:SQLite.spec.types+' '+vocabulary.TY.filter(word=>!vocabulary.KW.includes(word)).join(' '),
  builtin:vocabulary.FN.filter(word=>!vocabulary.KW.includes(word)).join(' ')
}).language.parser;
const colours=tagHighlighter([
  {tag:tags.keyword,class:'sql-kw'},
  {tag:[tags.standard(tags.name),tags.function(tags.variableName)],class:'sql-fn'},
  {tag:tags.typeName,class:'sql-ty'},
  {tag:[tags.string,tags.special(tags.string)],class:'sql-str'},
  {tag:[tags.number,tags.bool,tags.null],class:'sql-num'},
  {tag:tags.comment,class:'sql-com'}
]);
const documents=new Map();let timer=0;
function input(doc){return {length:doc.length,lineChunks:false,chunk:from=>doc.sliceString(from,Math.min(doc.length,from+4096)),read:(from,to)=>doc.sliceString(from,to)};}
function changedRanges(changes){const ranges=[];changes.iterChangedRanges((fromA,toA,fromB,toB)=>ranges.push({fromA,toA,fromB,toB}));return ranges;}
function schedule(){if(!timer)timer=setTimeout(work,0);}
function paint(record){
  if(!record.tree||record.parsedRevision!==record.revision)return;
  const spans=[];
  for(const range of record.ranges)highlightTree(record.tree,colours,(from,to,style)=>spans.push({from,to,style}),range.from,range.to);
  self.postMessage({id:record.id,revision:record.revision,request:record.request,spans});
}
function work(){
  timer=0;
  // Each document gets a bounded turn. New edits can arrive between turns.
  for(const record of documents.values()){
    if(record.parsedRevision===record.revision||!record.ranges.length)continue;
    if(!record.job)record.job={parse:parser.startParse(input(record.state.doc),record.fragments),revision:record.revision,changes:ChangeSet.empty(record.state.doc.length)};
    const job=record.job,end=performance.now()+8;let tree;
    do{tree=job.parse.advance();}while(!tree&&performance.now()<end);
    if(tree){
      record.fragments=TreeFragment.applyChanges(TreeFragment.addTree(tree),changedRanges(job.changes));
      record.job=null;
      if(job.revision===record.revision){record.tree=tree;record.parsedRevision=job.revision;paint(record);}
    }
    if(record.parsedRevision!==record.revision)schedule();
  }
}
self.onmessage=event=>{
  const message=event.data;
  if(message.type==='close'){documents.delete(message.id);return;}
  if(message.type==='open'){
    documents.set(message.id,{id:message.id,state:EditorState.create({doc:message.text}),revision:0,parsedRevision:-1,fragments:[],job:null,ranges:[],request:0});return;
  }
  const record=documents.get(message.id);if(!record)return;
  if(message.type==='change'){
    const transaction=record.state.update({changes:message.changes});
    if(record.job)record.job.changes=record.job.changes.compose(transaction.changes);
    else record.fragments=TreeFragment.applyChanges(record.fragments,changedRanges(transaction.changes));
    record.state=transaction.state;record.revision=message.revision;
  }
  if(message.type==='viewport'){
    record.ranges=message.ranges;record.request=message.request;
    if(record.parsedRevision===record.revision){paint(record);return;}
  }
  schedule();
};
