/* SQLite evidence presentation, not a natural-language intent or SQL generator. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./sql-read-contract.js'):root.SqlReadContract);if(typeof module==='object'&&module.exports)module.exports=api;else root.AiSchemaContext=api;})(typeof globalThis==='object'?globalThis:this,function(syntax){
 'use strict';
 const quote=s=>'"'+String(s).replaceAll('"','""')+'"';
 const fold=s=>String(s).replace(/[A-Z]/g,c=>c.toLowerCase());
 function render(db,entries,options={}){
  const flags=db.exec('PRAGMA table_list')[0]?.values||[],scalar=sql=>db.exec(sql)[0]?.values?.[0]?.[0];
  const facts={sqliteVersion:scalar('SELECT sqlite_version()'),foreignKeys:scalar('PRAGMA foreign_keys'),legacyAlterTable:scalar('PRAGMA legacy_alter_table')};
  const header='SQLite runtime facts: '+JSON.stringify(facts);
  const nodes=entries.map(e=>{const flag=flags.find(r=>r[0]==='main'&&r[1]===e.name);return {...e,text:e.text+(e.kind==='table'?' [strict='+(flag?.[5]??'unknown')+', without_rowid='+(flag?.[4]??'unknown')+']':'')};});
  const allText=[header,...nodes.map(e=>e.text)].join('\n'),budget=Number(options.characters);
  if(!Number.isFinite(budget)||allText.length<=budget||!options.focusSql)return allText;
  const names=new Map(nodes.map(e=>[fold(e.name),e]));
  // Over-inclusion of an identically named alias is safe: this only prioritizes
  // evidence. Strings/comments never select a table, and no SQL is rewritten.
  const named=sql=>new Set(syntax.tokens(sql).filter(t=>t.type==='word'||t.type==='identifier').map(t=>fold(t.value)).filter(n=>names.has(n)));
  const required=named(options.focusSql);
  if(!required.size)return allText; // Unknown references must not silently lose schema.
  const pending=[...required];
  while(pending.length){const key=pending.pop(),node=names.get(key);let related=[];
   if(node.kind==='view')related=[...named(node.definition||'')];
   else related=(db.exec('PRAGMA foreign_key_list('+quote(node.name)+')')[0]?.values||[]).map(r=>fold(r[2]));
   for(const name of related)if(names.has(name)&&!required.has(name)){required.add(name);pending.push(name);}
  }
  const included=nodes.filter(e=>required.has(fold(e.name)));let used=header.length+included.reduce((n,e)=>n+e.text.length+1,0);
  for(const node of nodes.filter(e=>!required.has(fold(e.name))))if(used+node.text.length+1<=budget){included.push(node);used+=node.text.length+1;}
  const selected=new Set(included.map(e=>e.name)),omitted=nodes.filter(e=>!selected.has(e.name)).map(e=>({name:e.name,kind:e.kind}));
  // A soft character target never cuts a table, view definition or necessary FK
  // parent. Exceeding it is explicit; the full model-window policy belongs upstream.
  return [header,...included.map(e=>e.text),...(omitted.length?['Schema coverage: '+JSON.stringify({complete:false,omittedDetails:omitted,requiredDetailsComplete:true,softCharacterTarget:budget,requiredDetailsExceedTarget:used>budget})]:[])].join('\n');
 }
 return {render};
});
