// Keep application SQLite files outside Chromium's reserved WebSQL "databases"
// directory. Migration completes before any BrowserWindow can start Chromium.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const directoryName='sql-databases';
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function directory(profile){
 const result=path.join(profile,directoryName);fs.mkdirSync(result,{recursive:true});return result;
}
function atomicCopy(source,destination,bytes){
 const parent=path.dirname(destination),temporary=path.join(parent,'.migration-'+crypto.randomUUID()+'.tmp');
 fs.mkdirSync(parent,{recursive:true});
 try{
  fs.writeFileSync(temporary,bytes,{flag:'wx'});
  if(!fs.readFileSync(temporary).equals(bytes))throw Error('Database migration copy verification failed');
  // Never overwrite a newer file if another writer appeared during the copy.
  fs.linkSync(temporary,destination);
  const stat=fs.statSync(source);fs.utimesSync(destination,stat.atime,stat.mtime);
  if(!fs.readFileSync(destination).equals(bytes)||!fs.readFileSync(source).equals(bytes))throw Error('Database migration source changed during copy');
 }finally{if(fs.existsSync(temporary))fs.unlinkSync(temporary);}
}
function migrateLegacy(profile){
 const target=directory(profile),legacy=path.join(profile,'databases'),result={directory:directoryName,copied:[],alreadyPreserved:[],conflicts:[],ignored:[]};
 if(!fs.existsSync(legacy))return result;
 for(const entry of fs.readdirSync(legacy,{withFileTypes:true})){
  if(!entry.name.toLowerCase().endsWith('.sqlite'))continue;
  if(!entry.isFile()){result.ignored.push(entry.name);continue;}
  const source=path.join(legacy,entry.name),destination=path.join(target,entry.name),bytes=fs.readFileSync(source),sha256=digest(bytes);
  if(fs.existsSync(destination)){
   if(fs.readFileSync(destination).equals(bytes)){result.alreadyPreserved.push(entry.name);continue;}
   // Retain both versions. A downgrade or previous partial migration must
   // never silently replace the current application database.
   const recovery=path.join(profile,'database-migration-recovery',entry.name+'.'+sha256+'.sqlite');
   if(fs.existsSync(recovery)){if(!fs.readFileSync(recovery).equals(bytes))throw Error('Database migration recovery conflict');}
   else atomicCopy(source,recovery,bytes);
   result.conflicts.push({name:entry.name,legacySha256:sha256,recovery:path.relative(profile,recovery)});
  }else{atomicCopy(source,destination,bytes);result.copied.push(entry.name);}
 }
 return result;
}
module.exports={directoryName,directory,migrateLegacy};
