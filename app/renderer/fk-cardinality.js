// Read-only, conservative evidence about matched children, not business rules.
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.FkCardinality=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const quote=n=>'"'+String(n).replaceAll('"','""')+'"';
  // SQLite folds ASCII identifier case; non-ASCII case remains distinct.
  const fold=n=>String(n).replace(/[A-Z]/g,c=>c.toLowerCase());
  function affinity(type){
    type=String(type||'').toUpperCase();
    if(type.includes('INT'))return 'INTEGER';
    if(/CHAR|CLOB|TEXT/.test(type))return 'TEXT';
    if(!type||type.includes('BLOB'))return 'BLOB';
    if(/REAL|FLOA|DOUB/.test(type))return 'REAL';
    return 'NUMERIC';
  }
  function create(db){
    // Scoped to one explanation. Never reuse metadata after a schema change.
    const metadata=new Map(),prepared=new Map();
    const unknown=()=>({maxLinkedChildrenPerParent:null});
    function table(name){
      const id=fold(name);if(metadata.has(id))return metadata.get(id);
      const info=db.exec('PRAGMA table_xinfo('+quote(name)+')')[0]?.values||[],keys=[];
      for(const row of db.exec('PRAGMA index_list('+quote(name)+')')[0]?.values||[]){
        if(!row[2]||row[4])continue; // Partial indexes do not prove a global limit.
        const fields=(db.exec('PRAGMA index_xinfo('+quote(row[1])+')')[0]?.values||[]).filter(c=>c[5]===1);
        if(!fields.length||fields.some(c=>c[1]<0||typeof c[2]!=='string'))continue;
        keys.push(fields.map(c=>({name:c[2],collation:c[4]})));
      }
      const pk=info.filter(c=>c[5]>0).sort((a,b)=>a[5]-b[5]);
      if(pk.length===1&&/^INTEGER$/i.test(pk[0][2])&&!keys.some(k=>k.length===1&&fold(k[0].name)===fold(pk[0][1])))
        keys.push([{name:pk[0][1],collation:'BINARY'}]); // Rowid alias: no autoindex.
      const value={info,keys,pk};metadata.set(id,value);return value;
    }
    function eligible(child,columns){
      const id=fold(child)+'\n'+JSON.stringify(columns.map(c=>c.child));
      if(prepared.has(id))return prepared.get(id);
      let valid=false,statement;
      try{
        if(db.exec('PRAGMA foreign_keys')[0]?.values[0]?.[0]!==1)return false;
        // Compilation verifies SQLite's eligible parent key/collation rules.
        // Never step this INSERT, execute bytecode, or change a pragma/data.
        statement=db.prepare('EXPLAIN INSERT INTO '+quote(child)+'('+columns.map(c=>quote(c.child)).join(',')+') VALUES('+columns.map(()=>'NULL').join(',')+')');
        valid=true;
      }catch{}finally{statement?.free();prepared.set(id,valid);}
      return valid;
    }
    function prove(child,parent,columns){
      try{
        const a=table(child),b=table(parent);
        const pairs=columns.map((c,i)=>({child:c.childColumn,parent:c.parentColumn??b.pk[i]?.[1]}));
        if(!pairs.length||pairs.some(c=>c.parent==null)||!eligible(child,pairs))return unknown();
        const parentKeys=b.keys.filter(k=>k.length===pairs.length&&k.every(c=>pairs.some(p=>fold(p.parent)===fold(c.name))));
        const target=parentKeys[0];if(!target)return unknown();
        if(parentKeys.some(k=>pairs.some(p=>fold(k.find(c=>fold(c.name)===fold(p.parent))?.collation)!==fold(target.find(c=>fold(c.name)===fold(p.parent))?.collation))))return unknown();
        for(const key of a.keys){
          if(key.length&&key.every(c=>{
            const p=pairs.find(p=>fold(p.child)===fold(c.name));if(!p)return false;
            const childField=a.info.find(f=>fold(f[1])===fold(p.child)),parentField=b.info.find(f=>fold(f[1])===fold(p.parent));
            const parentKey=target.find(f=>fold(f.name)===fold(p.parent));
            return childField&&parentField&&parentKey&&affinity(childField[2])===affinity(parentField[2])&&fold(c.collation)===fold(parentKey.collation);
          }))return {maxLinkedChildrenPerParent:1,reverseUniquenessProvenBy:key.map(c=>c.name)};
        }
      }catch{}
      // No proof of uniqueness is not a proof that other constraints allow many.
      return unknown();
    }
    return {prove};
  }
  return {create,affinity};
});
