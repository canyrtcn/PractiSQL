/* Display-only SQL provenance. Never rewrites or executes statement bodies. */
(function(root){
  'use strict';
  function tokens(sql){
    const s=String(sql),out=[];let i=0,depth=0;
    while(i<s.length){
      if(/\s/.test(s[i])){i++;continue;}
      if(s.startsWith('--',i)){const end=s.indexOf('\n',i+2);i=end<0?s.length:end+1;continue;}
      if(s.startsWith('/*',i)){const end=s.indexOf('*/',i+2);i=end<0?s.length:end+2;continue;}
      const start=i,c=s[i];
      if("'\"`[".includes(c)){
        const end=c==='['?']':c;let name='';i++;
        while(i<s.length){if(s[i]===end){if(c!=='['&&s[i+1]===end){name+=end;i+=2;continue;}i++;break;}name+=s[i++];}
        out.push({raw:s.slice(start,i),name,word:'',identifier:c!=="'",depth});continue;
      }
      if(c===')')depth--;
      const match=/^[\p{L}\p{N}_$]+/u.exec(s.slice(i)),raw=match?match[0]:c;
      out.push({raw,name:raw,word:raw.toUpperCase(),identifier:!!match,depth});
      if(c==='(')depth++;i+=raw.length;
    }
    return out;
  }
  function describe(sql){
    const ts=tokens(sql),top=ts.filter(t=>t.depth===0);let command=top[0]?.word||'',commandAt=0;
    const ctes=new Set();
    for(let i=0;i<ts.length;i++)if(ts[i].word==='WITH'){
      let j=i+1;if(ts[j]?.word==='RECURSIVE')j++;
      while(ts[j]?.identifier){
        const name=ts[j].name,level=ts[j].depth;j++;
        if(ts[j]?.word==='('){j++;while(j<ts.length&&!(ts[j].word===')'&&ts[j].depth===level))j++;j++;}
        if(ts[j]?.word!=='AS')break;j++;
        if(ts[j]?.word==='NOT')j++;if(ts[j]?.word==='MATERIALIZED')j++;
        if(ts[j]?.word!=='(')break;ctes.add(name.toLowerCase());j++;
        while(j<ts.length&&!(ts[j].word===')'&&ts[j].depth===level))j++;j++;
        if(ts[j]?.word!==',')break;j++;
      }
    }
    if(command==='WITH'){
      commandAt=top.findIndex((t,i)=>i>0&&['SELECT','VALUES','INSERT','UPDATE','DELETE','REPLACE'].includes(t.word));
      command=top[commandAt]?.word||'WITH';
    }
    function nameAt(list,i,source=false){
      if(!list[i]?.identifier)return '';
      let name=list[i].raw;
      while(list[i+1]?.word==='.'&&list[i+2]?.identifier){name+='.'+list[i+2].raw;i+=2;}
      // Table-valued functions are sources, but not database tables.
      return source&&list[i+1]?.word==='('?name+'(…)':name;
    }
    const sources=[];const seen=new Set();
    function add(name){const key=name.toLowerCase();if(name&&!seen.has(key)){sources.push(name);seen.add(key);}}
    const fromLevels=new Set();
    for(let i=0;i<ts.length;i++){
      const token=ts[i];
      if(['WHERE','GROUP','HAVING','ORDER','LIMIT','UNION','EXCEPT','INTERSECT','RETURNING'].includes(token.word))fromLevels.delete(token.depth);
      if(token.word===')')for(const level of fromLevels)if(level>token.depth)fromLevels.delete(level);
      if(token.word==='FROM'||token.word==='JOIN'||(token.word===','&&fromLevels.has(token.depth))){
        if(token.word==='FROM')fromLevels.add(token.depth);
        if(ts[i+1]?.identifier&&!ctes.has(ts[i+1].name.toLowerCase()))add(nameAt(ts,i+1,true));
      }
    }
    let kind='other',target='',object='';
    if(['CREATE','ALTER','DROP'].includes(command)){
      kind='structure';let j=commandAt+1;
      while(['TEMP','TEMPORARY','UNIQUE','VIRTUAL'].includes(top[j]?.word))j++;
      object=top[j++]?.word||'';
      while(['IF','NOT','EXISTS'].includes(top[j]?.word))j++;
      target=nameAt(top,j);
    }else if(['INSERT','REPLACE','UPDATE','DELETE'].includes(command)){
      kind='data';let j=commandAt+1;
      if(top[j]?.word==='OR')j+=2;
      if(command==='INSERT'||command==='REPLACE'){if(top[j]?.word==='INTO')j++;}
      if(command==='DELETE'&&top[j]?.word==='FROM')j++;
      target=nameAt(top,j);
    }else if(['SELECT','VALUES'].includes(command))kind='read';
    else if(command==='EXPLAIN')kind='plan';
    else if(command==='PRAGMA'){kind='pragma';target=nameAt(top,1);}
    const returns=kind==='read'||kind==='plan'||(kind==='data'&&top.some(t=>t.word==='RETURNING'));
    return {command,kind,target,object,sources,cte:ctes.size>0,returns};
  }
  const words={
    tr:{structure:'Yapı',data:'Veri',result:'Sonuç',other:'İşlem',read:'Kayıtları oku',calculation:'Hesaplama',cte:'CTE sorgusu',plan:'Sorgu planını incele',pragma:'Veritabanı bilgisi',CREATE:'oluştur',ALTER:'değiştir',DROP:'kaldır',INSERT:'Kayıt ekle',REPLACE:'Kayıt ekle / değiştir',UPDATE:'Kayıt güncelle',DELETE:'Kayıt sil',TABLE:'Tablo',VIEW:'Görünüm',INDEX:'İndeks',TRIGGER:'Tetikleyici',returning:'değişen kayıtları göster',snapshot:'Sonuç verisini sırala',sort:'Sıralama',asc:'artan',desc:'azalan'},
    en:{structure:'Structure',data:'Data',result:'Result',other:'Operation',read:'Read rows',calculation:'Calculation',cte:'CTE query',plan:'Inspect query plan',pragma:'Database information',CREATE:'create',ALTER:'alter',DROP:'drop',INSERT:'Insert rows',REPLACE:'Insert / replace rows',UPDATE:'Update rows',DELETE:'Delete rows',TABLE:'Table',VIEW:'View',INDEX:'Index',TRIGGER:'Trigger',returning:'show changed rows',snapshot:'Sort result values',sort:'Sort',asc:'ascending',desc:'descending'}
  };
  const clean=s=>String(s).replace(/[\r\n\u2028\u2029]/g,' ').trim();
  function title(info,language='en'){
    const w=words[language==='tr'?'tr':'en'];let text;
    if(info.kind==='structure')text=(w[info.object]||info.object)+' '+(w[info.command]||info.command)+': '+info.target;
    else if(info.kind==='data')text=(w[info.command]||info.command)+': '+info.target+(info.returns?' · '+w.returning:'');
    else if(info.kind==='read')text=info.sources.length?info.sources.join(', '):info.cte?w.cte:w.calculation;
    else if(info.kind==='plan')text=w.plan;
    else if(info.kind==='pragma')text=w.pragma+': '+info.target;
    else text=info.command||w.other;
    return clean(text);
  }
  function label(info,index,resultNumber,language='en'){
    const w=words[language==='tr'?'tr':'en'];
    const category=info.kind==='structure'?w.structure:info.kind==='data'?w.data:info.returns?w.result+' '+resultNumber:w.other;
    return '-- '+String(index).padStart(2,'0')+' · '+category+(info.kind==='data'&&info.returns?' · '+w.result+' '+resultNumber:'')+' | '+title(info,language);
  }
  function leading(sql){
    const s=String(sql);let i=0;
    while(i<s.length){
      while(/\s/.test(s[i]||'')&&i<s.length)i++;
      if(s.startsWith('--',i)){const end=s.indexOf('\n',i+2);i=end<0?s.length:end+1;continue;}
      if(s.startsWith('/*',i)){const end=s.indexOf('*/',i+2);if(end<0)break;i=end+2;continue;}
      break;
    }
    return {comments:s.slice(0,i).trim(),body:s.slice(i)};
  }
  function sorted(sql,column,direction,language='en',snapshot=false){
    const w=words[language==='tr'?'tr':'en'],parts=leading(sql);
    const comments=parts.comments.replace(/^--\s*(?:Sorgu|Query)\s+(\d+)\s*$/gmi,(_,n)=>label(describe(parts.body),Number(n),Number(n),language));
    const explanation='-- '+(snapshot?w.snapshot:w.sort)+': '+clean(column.name)+' · '+(direction==='ASC'?w.asc:w.desc);
    return [comments,explanation,'SELECT * FROM (\n'+parts.body.trim().replace(/;\s*$/,'')+'\n) AS "sorted_result"\nORDER BY '+column.ordinal+' '+direction+';'].filter(Boolean).join('\n');
  }
  const api={describe,title,label,leading,sorted};
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.SqlSections=api;
})(typeof window==='object'?window:globalThis);
