 'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const out=path.resolve(process.argv[2]||'artifacts/updater-transport.json'),env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
const result=spawnSync(require('electron'),[path.join(__dirname,'test-updater-transport-electron.cjs'),out,...process.argv.slice(3)],{env,windowsHide:true,encoding:'utf8',timeout:120000});
assert(fs.existsSync(out),'Transport evidence was not written');const proof=JSON.parse(fs.readFileSync(out));
for(const [target,prefix]of [[proof.fixtureDirectory,'practisql-updater-proof-'],[proof.hostProfile,'practisql-updater-host-']])if(target){const absolute=path.resolve(target);assert.equal(path.dirname(absolute),path.resolve(os.tmpdir()));assert(path.basename(absolute).startsWith(prefix));assert(!fs.lstatSync(absolute).isSymbolicLink());fs.rmSync(absolute,{recursive:true,force:true,maxRetries:10,retryDelay:100});}
assert.equal(result.status,0,proof.error||result.stderr);assert.equal(proof.status,'passed');console.log(JSON.stringify({status:proof.status,cases:proof.cases.length,actualInstaller:proof.actualInstaller,installerExecuted:proof.installerExecuted}));
