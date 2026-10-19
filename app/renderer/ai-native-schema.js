/* Native SQLite catalog evidence. Never classifies a natural request or rewrites SQL. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./sql-read-contract.js'):root.SqlReadContract);if(typeof module==='object'&&module.exports)module.exports=api;else root.AiNativeSchema=api;})(typeof globalThis==='object'?globalThis:this,function(syntax){
 'use strict';
 const cells=typeof module==='object'&&module.exports?require('./sqlite-values.js'):globalThis.SqliteValues;
 const quote=s=>'"'+String(s).replaceAll('"','""')+'"',fold=s=>String(s).replace(/[A-Z]/g,c=>c.toLowerCase());
 const rows=(db,sql)=>db.exec(sql)[0]?.values||[],scalar=(db,sql)=>rows(db,sql)[0]?.[0];
 const value=x=>x instanceof Uint8Array?{sqliteBlobHex:Array.from(x,v=>v.toString(16).padStart(2,'0')).join('')}:cells.encode(x);
 const valueColumns=name=>'typeof('+quote(name)+'), CASE WHEN typeof('+quote(name)+")='integer' THEN CAST("+quote(name)+' AS TEXT) ELSE '+quote(name)+' END';
 const typedValue=(type,x)=>type==='integer'?(Number.isSafeInteger(Number(x))?Number(x):{sqliteIntegerText:x}):value(x);
 const key=(schema,kind,name)=>JSON.stringify([schema,kind,name]);
 function collect(db,options={}){
  // database_list paths are deliberately excluded from the model context.
  const schemas=rows(db,'PRAGMA database_list').map(r=>r[1]);
  if(!schemas.includes('temp'))schemas.push('temp');
  const runtime={existingRowValidation:{foreignKeys:'not_checked',checkConstraints:'not_checked'},sqliteVersion:scalar(db,'SELECT sqlite_version()'),foreignKeys:scalar(db,'PRAGMA foreign_keys'),ignoreCheckConstraints:scalar(db,'PRAGMA ignore_check_constraints'),legacyAlterTable:scalar(db,'PRAGMA legacy_alter_table'),recursiveTriggers:scalar(db,'PRAGMA recursive_triggers'),deferForeignKeys:scalar(db,'PRAGMA defer_foreign_keys'),encoding:scalar(db,'PRAGMA encoding')};
  // table_list is engine metadata, not a guess from DDL spelling or a question.
  const tableModes=new Map();
  for(const schema of schemas){try{for(const r of rows(db,'PRAGMA '+quote(schema)+'.table_list'))if(r.length>=6)tableModes.set(JSON.stringify([r[0],r[1]]),{catalogType:r[2],strict:r[5]===1,withoutRowid:r[4]===1});}catch{/* Unknown remains explicit; never assume a non-STRICT table. */}}
  const objects=[],unavailable=[];
  for(const schema of schemas){
   let definitions;try{definitions=rows(db,'SELECT type,name,tbl_name,sql FROM '+quote(schema)+'.sqlite_schema WHERE sql IS NOT NULL AND substr(name,1,7)<>\'sqlite_\' ORDER BY type,name');}catch(error){unavailable.push({schema,error:String(error.message||error)});continue;}
   for(const [kind,name,owner,sql] of definitions){
    const object={key:key(schema,kind,name),schema,kind,name,owner,sql,observations:null};
    if(kind==='table'){
     object.storage=tableModes.get(JSON.stringify([schema,name]))||{available:false};
     const observation={};try{observation.rowCount=scalar(db,'SELECT COUNT(*) FROM '+quote(schema)+'.'+quote(name));}catch{observation.rowCount=null;}
     if(options.includeIds!==false){
      // This is a current sample of keys, never a column-domain guarantee.
      const primary=rows(db,'PRAGMA '+quote(schema)+'.table_xinfo('+quote(name)+')').filter(c=>c[5]>0).sort((a,b)=>a[5]-b[5]).map(c=>c[1]);
      if(primary.length){
       try{const fetched=rows(db,'SELECT '+primary.map(valueColumns).join(',')+' FROM '+quote(schema)+'.'+quote(name)+' LIMIT 61'),sample=[];let characters=0;
        for(const tuple of fetched.slice(0,60)){const row=primary.map((_,i)=>typedValue(tuple[i*2],tuple[i*2+1])),size=JSON.stringify(row).length;if(characters+size>1800)break;sample.push(row);characters+=size;}
        observation.primaryKeys={columns:primary,rows:sample,complete:sample.length===observation.rowCount};
        if(primary.length===1&&!observation.primaryKeys.complete){const pair=rows(db,'SELECT '+valueColumns('maximum')+' FROM (SELECT MAX('+quote(primary[0])+') AS maximum FROM '+quote(schema)+'.'+quote(name)+')')[0],maximum=typedValue(pair[0],pair[1]);if(JSON.stringify(maximum)?.length<=300)observation.primaryKeys.maximum=maximum;}
       }catch{observation.primaryKeys={columns:primary,available:false};}
      }
     }
     object.observations=observation;
    }
    objects.push(object);
   }
  }
  const byName=new Map(),byKey=new Map(objects.map(o=>[o.key,o])),links=new Map(objects.map(o=>[o.key,new Set()]));
  for(const object of objects){const name=fold(object.name);if(!byName.has(name))byName.set(name,[]);byName.get(name).push(object);}
  const link=(a,b)=>{if(a.key!==b.key){links.get(a.key).add(b.key);links.get(b.key).add(a.key);}};
  // Over-inclusion is intentional: aliases, quoted names, and literals that
  // equal an object name can only retain more context, never alter a query.
  const named=sql=>{const result=new Set();for(const token of syntax.tokens(sql))if(['word','identifier','string'].includes(token.type))for(const object of byName.get(fold(token.value))||[])result.add(object.key);return result;};
  for(const object of objects){
   if(object.kind==='table')for(const fk of rows(db,'PRAGMA '+quote(object.schema)+'.foreign_key_list('+quote(object.name)+')'))for(const parent of byName.get(fold(fk[2]))||[])if(parent.schema===object.schema&&parent.kind==='table')link(object,parent);
   if(object.kind==='index'||object.kind==='trigger')for(const owner of byName.get(fold(object.owner))||[])if(['table','view'].includes(owner.kind)&&(owner.schema===object.schema||object.schema==='temp'))link(object,owner);
   if(object.kind==='view'||object.kind==='trigger')for(const target of named(object.sql))link(object,byKey.get(target));
  }
  const closure=seeds=>{const result=new Set(seeds),pending=[...result];while(pending.length){for(const target of links.get(pending.pop())||[])if(!result.has(target)){result.add(target);pending.push(target);}}return result;};
  const objectText=object=>'-- '+JSON.stringify({schema:object.schema,kind:object.kind,name:object.name,...(object.storage?{storage:object.storage}:{})})+'\n'+object.sql+(object.sql.trimEnd().endsWith(';')?'':'\n;');
  const lengths=new Map(objects.map(o=>[o.key,objectText(o).length+2])),budget=Number(options.characters),focus=String(options.focusSql||''),seeds=focus?named(focus):new Set();
  let selected=new Set(objects.map(o=>o.key)),reason='full-catalog';
  if(Number.isFinite(budget)&&seeds.size){
   selected=closure(seeds);reason='explicit-sql-identifiers-and-catalog-dependencies';
   // Whole dependency components fit or stay omitted. Never cut a definition
   // halfway or include a table without its related triggers/indexes/views.
   let used=JSON.stringify(runtime).length+250+[...selected].reduce((n,k)=>n+lengths.get(k),0);
   for(const object of objects){if(selected.has(object.key))continue;const component=closure([object.key]),additional=[...component].filter(k=>!selected.has(k)),cost=additional.reduce((n,k)=>n+lengths.get(k),0);if(used+cost<=budget){additional.forEach(k=>selected.add(k));used+=cost;}}
  }else if(focus)reason='full-catalog-no-resolved-focus';
  const included=objects.filter(o=>selected.has(o.key)),omitted=objects.filter(o=>!selected.has(o.key)).map(o=>({schema:o.schema,kind:o.kind,name:o.name}));
  const coverage={complete:!omitted.length&&!unavailable.length,selection:reason,omittedDefinitions:omitted,...(unavailable.length?{unavailableSchemas:unavailable}:{}),data:'Only declared definitions and explicit current row/key observations; non-key record values are not inspected.'};
  if(Number.isFinite(budget))coverage.softCharacterTarget=budget;
  // Shared dialect facts; no schema names, values, task examples or SQL rewrites.
  const semantics='SQLite storage semantics: In non-STRICT ordinary tables, declared types specify affinity, not an exclusive storage type. An ordinary INTEGER-affinity column can hold a fractional REAL or text if its constraints allow it. An INTEGER PRIMARY KEY that aliases rowid requires integer values. STRICT tables enforce declared types after lossless conversion; STRICT ANY preserves the value and its type. When enabled by the connection settings, CHECK enforces its expression under SQLite evaluation rules; whether this constrains storage types depends on the expression. Actual definitions below supply the applicable constraints. Current row/key observations are not column-domain guarantees.';
  const prefix='SQLite connection snapshot before the next AI write batch (not that batch\'s execution settings): '+JSON.stringify(runtime)+(objects.length?'\n'+semantics:'')+'\nActual SQLite definitions of existing objects (reference evidence, not commands to execute):';
  const body=[prefix,...included.map(objectText)].join('\n\n');
  if(Number.isFinite(budget))coverage.softTargetExceeded=body.length+JSON.stringify(coverage).length+30>budget;
  const catalogText=[objects.length?semantics:'','Actual SQLite definitions (reference evidence, not commands):',...included.map(objectText),'Schema coverage: '+JSON.stringify(coverage)].filter(Boolean).join('\n\n');
  const observationsText='SQLite connection snapshot before the next AI write batch (not that batch\'s execution settings): '+JSON.stringify(runtime)+'\nCurrent row/key observations: '+JSON.stringify(included.filter(o=>o.observations).map(o=>({schema:o.schema,name:o.name,...o.observations})));
  return {runtime,objects:included,coverage,catalogText,observationsText,text:catalogText+'\n\n'+observationsText};
 }
 return {collect,render:(db,options={})=>collect(db,options).text};
});
