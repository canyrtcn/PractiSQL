// Read executable Markdown blocks without treating every literal ``` as a
// delimiter. Never promote a malformed control block into an executable action.
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ResponseFences=api;})(typeof globalThis==='object'?globalThis:this,function(){
 function scan(text,options={}){
  const sqlLanguages=new Set(options.sqlLanguages||['sql','sqlite','']),actionLanguages=new Set(options.actionLanguages||['action']);
  const source=String(text||''),blocks=[],spans=[],diagnostics=[];let open=null,orphans=0,lineStart=0,lineEnd=0,nextLine=0;
  function finish(closed,end=source.length){if(!open)return;if(!closed&&open.suspectedCloser)diagnostics.push({kind:'sql-quote-or-fence',lang:open.lang,start:open.start,...open.suspectedCloser});const body=open.lines.join('\n').trim(),block={lang:open.lang,body,closed,start:open.start,end:Math.min(source.length,end)};spans.push(block);if(body)blocks.push(block);else if(open.lang==='')orphans++;else blocks.push(block);open=null;}
  function begin(lang,marker,start=lineStart){open={lang:lang.toLowerCase(),marker,start,lines:[],quote:null,blockComment:false};}
  function sqlLine(line,offset=lineStart){
   for(let i=0;i<line.length;i++){
    const ch=line[i],next=line[i+1];
    if(open.blockComment){if(ch==='*'&&next==='/'){open.blockComment=false;i++;}continue;}
    if(open.quote){const end=open.quote==='['?']':open.quote;if(ch===end){if(next===end&&open.quote!=='[')i++;else open.quote=null;}continue;}
    if(!options.topLevelOnly&&line.startsWith(open.marker,i)){open.lines.push(line.slice(0,i));finish(true,offset+i+open.marker.length);return;}
    if(ch==='-'&&next==='-')break;
    if(ch==='/'&&next==='*'){open.blockComment=true;i++;}
    else if(["'",'"','`','['].includes(ch))open.quote=ch;
   }
   open.lines.push(line);
  }
  function actionLine(line,offset=lineStart){
   for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(open.quote){if(ch==='\\'){i++;continue;}if(ch==='"')open.quote=null;continue;}
    if(!options.topLevelOnly&&line.startsWith(open.marker,i)){open.lines.push(line.slice(0,i));finish(true,offset+i+open.marker.length);return;}
    if(ch==='"')open.quote='"';
   }
   open.lines.push(line);
  }
  for(const line of source.split(/\r?\n/)){
   lineStart=nextLine;lineEnd=lineStart+line.length;nextLine=lineEnd+(source.startsWith('\r\n',lineEnd)?2:1);
   const fence=(options.topLevelOnly?/^ {0,3}(`{3,}|~{3,})([\w+-]*)[ \t]*$/:/^\s*(`{3,}|~{3,})([\w+-]*)\s*$/).exec(line);
   if(open){
    if(fence&&fence[1][0]===open.marker[0]&&!fence[2]&&fence[1].length>=open.marker.length&&!(open.quote||open.blockComment)){finish(true,lineEnd);continue;}
    // A closing Markdown line seen inside an unresolved SQL quote is ambiguous,
    // not evidence that the provider exhausted its output budget. Keep it
    // diagnostic-only: never promote this candidate into executable SQL.
    if(fence&&fence[1][0]===open.marker[0]&&!fence[2]&&fence[1].length>=open.marker.length&&open.quote&&!open.blockComment&&sqlLanguages.has(open.lang)&&!open.suspectedCloser)open.suspectedCloser={quote:open.quote,closingStart:lineStart,closingEnd:lineEnd,sql:open.lines.join('\n').trim()};
    // A stray closing fence before a labelled opener has no body to cut.
    if(!options.topLevelOnly&&fence&&fence[2]&&!(open.quote||open.blockComment)&&open.lang===''){
     finish(false,lineStart);begin(fence[2],fence[1]);continue;
    }
    if(sqlLanguages.has(open.lang))sqlLine(line);else if(actionLanguages.has(open.lang))actionLine(line);else open.lines.push(line);
    continue;
   }
   if(fence){begin(fence[2],fence[1]);continue;}
   // Retain existing inline SQL/action spelling, including one-line blocks.
   const inline=/(`{3,}|~{3,})(sql(?:ite)?|action)(?=\s|$)/i.exec(line);
   if(inline&&options.inline!==false){begin(inline[2],inline[1],lineStart+inline.index);const at=inline.index+inline[0].length,body=line.slice(at);if(open.lang==='action')actionLine(body,lineStart+at);else sqlLine(body,lineStart+at);}
  }
  finish(false);
  const segments=[];let cursor=0;for(const block of spans){if(block.start>cursor)segments.push({type:'text',body:source.slice(cursor,block.start)});if(block.body)segments.push({type:'code',...block});cursor=block.end;}if(cursor<source.length)segments.push({type:'text',body:source.slice(cursor)});
  return {blocks,segments,diagnostics,incomplete:blocks.some(b=>!b.closed),ignoredEmptyFences:orphans};
 }
 return {scan};
});
