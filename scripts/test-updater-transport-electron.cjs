'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {NsisUpdater}=require('electron-updater');
const {app}=require('electron');
const {ElectronHttpExecutor}=require('electron-updater/out/electronHttpExecutor');
const hostProfile=fs.mkdtempSync(path.join(os.tmpdir(),'practisql-updater-host-'));app.setPath('userData',hostProfile);
const {createUpdaterForBuild}=require('../app/verified-updater.cjs');
const out=path.resolve(process.argv[2]||'artifacts/updater-transport.json');assert(!fs.existsSync(out));fs.mkdirSync(path.dirname(out),{recursive:true});const args=process.argv.slice(3),option=k=>args.includes(k)?args[args.indexOf(k)+1]:null;const baseVersion=option('--installed-version')||require('../package.json').version,targetVersion=option('--target-version')||baseVersion.replace(/(\d+)$/,n=>String(Number(n)+1));
const work=fs.mkdtempSync(path.join(os.tmpdir(),'practisql-updater-proof-'));
const installer=option('--installer'),payload=installer?fs.readFileSync(path.resolve(installer)):Buffer.alloc(128*1024,0x41);if(!installer)payload.write('Transport fixture only. Never execute.');
const sha=(bytes,algorithm='sha256',encoding='hex')=>crypto.createHash(algorithm).update(bytes).digest(encoding);
const proof={version:baseVersion,status:'running',realModelCalls:0,visibleWindows:0,personalProfileUsed:false,installerExecuted:false,cases:[],findings:[]};
let server,scenario,requests=[];
async function run(spec){
 scenario=spec;requests=[];
 const dir=path.join(work,spec.id);fs.mkdirSync(dir);const profile=path.join(dir,'profile');fs.mkdirSync(profile);
 const settings=path.join(profile,'config.json'),database=path.join(profile,'study.sqlite');fs.writeFileSync(settings,JSON.stringify({profile:{name:'Synthetic learner'},uiScale:1.25,apiKey:'fixture-only-value'}));fs.writeFileSync(database,Buffer.from('Synthetic database-preservation sentinel'));
 const original=[settings,database].map(p=>sha(fs.readFileSync(p)));let onQuit,quitCalls=0;const installCalls=[],events=[];
 const url='http://127.0.0.1:'+server.address().port+'/',config=path.join(dir,'app-update.yml');fs.writeFileSync(config,'provider: generic\nurl: '+url+'\nupdaterCacheDirName: transport-test\n');
 const adapter={version:baseVersion,name:'PractiSQL',isPackaged:true,userDataPath:profile,baseCachePath:path.join(dir,'cache'),appUpdateConfigPath:config,whenReady:async()=>{},onQuit:fn=>{onQuit=fn;},quit:()=>{quitCalls++;},relaunch:()=>{}};
 const updater=new NsisUpdater(null,adapter);updater.logger={info(){},warn(){},error(){},debug(){}};updater.httpExecutor=new ElectronHttpExecutor(()=>{});updater.disableDifferentialDownload=true;updater.setFeedURL({provider:'generic',url});
 updater.doInstall=options=>{installCalls.push({isSilent:options.isSilent,isForceRunAfter:options.isForceRunAfter});return true;};
 for(const name of ['checking-for-update','update-available','download-progress','update-downloaded','update-not-available','error'])updater.on(name,()=>events.push(name));
 const policy=createUpdaterForBuild(updater,{signedRelease:false});let result,error;
 try{result=await policy.check();if(spec.cancelled){assert(result?.cancellationToken);if(spec.waitForBody){for(let i=0;i<200&&!requests.some(r=>r.endsWith('.exe'));i++)await new Promise(r=>setTimeout(r,10));assert(requests.some(r=>r.endsWith('.exe')));await new Promise(r=>setTimeout(r,30));}result.cancellationToken.cancel();}if(result?.downloadPromise){let timer;try{await Promise.race([result.downloadPromise,new Promise((_r,reject)=>{timer=setTimeout(()=>reject(Object.assign(Error('Download exceeded the fixture deadline'),{code:'TEST_DEADLINE'})),8000);})]);}finally{clearTimeout(timer);}}}catch(e){error=e.code||e.name;proof.lastError=e.message;}
 proof.lastProbe={id:spec.id,events,error,requests};if(error==='TEST_DEADLINE'){result?.cancellationToken?.cancel();proof.findings.push({id:'download-deadline',scenario:spec.id,observed:true,detail:'The transport did not complete or reject within the 8-second loopback fixture deadline.'});}
 if(spec.available){assert(events.includes('update-downloaded'),spec.id+': payload completed');assert(!error);assert.equal(updater.autoDownload,true);assert.equal(updater.autoInstallOnAppQuit,false);
   if(spec.explicitInstall){await policy.install();await new Promise(r=>setImmediate(r));assert.equal(installCalls.length,1);assert.deepEqual(installCalls[0],{isSilent:false,isForceRunAfter:true});assert.equal(quitCalls,1);}
   if(spec.declined){assert.equal(installCalls.length,0);if(onQuit)onQuit(0);assert.equal(installCalls.length,0,'Deferral followed by normal quit must not install');assert.equal(quitCalls,0);const later=await policy.check();if(later?.downloadPromise)await later.downloadPromise;assert.equal(updater.autoInstallOnAppQuit,false);await policy.install();await new Promise(r=>setImmediate(r));assert.equal(installCalls.length,1,'A later explicit install still works');}
 }else if(spec.notAvailable){assert(events.includes('update-not-available'));assert(!events.includes('update-downloaded'));assert.equal(requests.filter(r=>r.endsWith('.exe')).length,0);}
 else{assert(error,spec.id+': failure must be surfaced');assert(!events.includes('update-downloaded'));assert.equal(installCalls.length,0);}
 assert.deepEqual([settings,database].map(p=>sha(fs.readFileSync(p))),original,'Transport does not change stored user settings or database bytes');
 proof.cases.push({id:spec.id,passed:true,events,error:error||null,payloadRequested:requests.some(r=>r.endsWith('.exe')),profileSentinelsUnchanged:true,installCalls,installerHandoffIntercepted:true});fs.writeFileSync(out,JSON.stringify(proof,null,2));
}
(async()=>{try{
 await app.whenReady();
 server=http.createServer((req,res)=>{
  const file=new URL(req.url,'http://localhost').pathname;requests.push(file);
  if(file.endsWith('/latest.yml')){if(scenario.missingMetadata){res.writeHead(404);return res.end('not found');}if(scenario.unauthorized){res.writeHead(401);return res.end('unauthorized');}if(scenario.malformed){res.writeHead(200);return res.end('invalid: [unterminated');}if(scenario.offline){res.writeHead(503);return res.end('unavailable');}const digest=scenario.corrupt?sha(Buffer.from('wrong'),'sha512','base64'):sha(payload,'sha512','base64');res.writeHead(200,{'content-type':'text/yaml'});return res.end('version: '+(scenario.version||targetVersion)+'\nfiles:\n  - url: fixture.exe\n    sha512: '+digest+'\n    size: '+payload.length+'\npath: fixture.exe\nsha512: '+digest+'\nreleaseDate: 2026-10-19T00:00:00.000Z\n');}
  if(file.endsWith('/fixture.exe')&&!scenario.missing){res.writeHead(200,{'content-length':payload.length,'content-type':'application/octet-stream'});if(scenario.interrupted){res.write(payload.subarray(0,4096));return setTimeout(()=>res.destroy(),30);}if(scenario.cancelled){res.write(payload.subarray(0,4096));return setTimeout(()=>res.end(payload.subarray(4096)),500);}return res.end(payload);}
  res.writeHead(404);res.end('not found');
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 for(const spec of [{id:'download-and-explicit-install',available:true,explicitInstall:true},{id:'decline-then-normal-quit',available:true,declined:true},{id:'same-version',version:baseVersion,notAvailable:true},{id:'downgrade-to-first-release-number',version:'0.1.0',notAvailable:true},{id:'checksum-mismatch',corrupt:true},{id:'missing-installer',missing:true},{id:'feed-unavailable',offline:true},{id:'metadata-not-found',missingMetadata:true},{id:'unauthorized-private-feed',unauthorized:true},{id:'malformed-metadata',malformed:true},{id:'interrupted-download',interrupted:true},{id:'cancel-before-body',cancelled:true},{id:'cancel-during-body',cancelled:true,waitForBody:true}])await run(spec);
 proof.fixtureDirectory=work;assert.equal(proof.findings.length,0);proof.hostProfile=hostProfile;proof.actualInstaller=!!installer;proof.targetVersion=targetVersion;proof.status='passed';
}catch(e){proof.status='failed';proof.error=e.stack;process.exitCode=1;}finally{server?.closeAllConnections();server?.close();assert.equal(path.dirname(work),path.resolve(os.tmpdir()));assert(path.basename(work).startsWith('practisql-updater-proof-'));fs.writeFileSync(out,JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({status:proof.status,cases:proof.cases.length,findings:proof.findings,error:proof.error?.slice(0,300)}));app.exit(proof.status==='failed'?1:0);}})();
