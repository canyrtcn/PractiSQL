/* Actual FK paths identify alternative business roles; names alone never prove one. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RelationshipRoles=api;})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const fold=s=>String(s).replace(/[A-Z]/g,c=>c.toLowerCase());
 const normalize=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').toLowerCase();
 const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 function mentions(request,name){return new RegExp('(^|[^\\p{L}\\p{N}_$])'+escape(fold(name))+'(?=$|[^\\p{L}\\p{N}_$])','u').test(fold(request));}
 function alternatives(request,facts){
  if(!/\b(?:counts?|number|how many)\b|\bsay(?:isi|ilari|im|imlar)|\bkac\b|\badet/.test(normalize(request)))return [];
  const edges=facts.filter(f=>f.columns?.length&&f.columns.every(c=>c.childColumn&&c.parentColumn)),tables=[...new Set(edges.flatMap(f=>[f.child,f.parent]))].filter(table=>mentions(request,table));
  const pairs=[];
  for(const child of tables)for(const parent of tables){
   if(child===parent)continue;
   const paths=edges.filter(e=>fold(e.child)===fold(child)&&fold(e.parent)===fold(parent)).map(e=>[e]);
   for(const first of edges.filter(e=>fold(e.child)===fold(child)&&fold(e.parent)!==fold(child)&&fold(e.parent)!==fold(parent)))
    for(const second of edges.filter(e=>fold(e.child)===fold(first.parent)&&fold(e.parent)===fold(parent)))paths.push([first,second]);
   if(paths.length<2)continue;
   const selected=paths.slice(0,8).map(path=>({steps:path.map(e=>({child:e.child,parent:e.parent,columns:e.columns.map(c=>[c.childColumn,c.parentColumn])})),explicitColumnsInRequest:path.every(e=>e.columns.every(c=>mentions(request,e.child+'.'+c.childColumn)&&mentions(request,e.parent+'.'+c.parentColumn)))}));
   pairs.push({child,parent,paths:selected,omittedPaths:Math.max(0,paths.length-8)});
   if(pairs.length>=4)return pairs;
  }return pairs;
 }
 function context(request,facts){
  const roles=alternatives(request,facts);if(!roles.length)return '';
  return 'Alternative declared FK paths between tables mentioned in the request (schema evidence, not a selected path, requested operation or expected output):\n'+JSON.stringify(roles)+'\nDifferent paths may represent different business roles. A child\'s own parent reference and its intermediate record\'s parent reference need not identify the same entity.';
 }
 return {alternatives,context,mentions};
});
