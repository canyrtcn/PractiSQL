'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {prepare,open,dispose,wait}=require('./test-support/electron-session.cjs');
const source=path.resolve(__dirname,'..'),out=path.resolve(process.argv[2]||'artifacts/updater-ui.json');assert(!fs.existsSync(out));fs.mkdirSync(path.dirname(out),{recursive:true});
const targetVersion=require('../package.json').version.replace(/(\d+)$/,n=>String(Number(n)+1));
const proof={status:'running',visibleWindows:0,realModelCalls:0,installerExecuted:false,personalProfileUsed:false,checks:[],findings:[],languages:[]};let app,workspace;
const check=(ok,label)=>{assert(ok,label);proof.checks.push(label);};
(async()=>{try{
 for(const lang of ['en','tr'])for(const theme of ['light','leaf','dark']){
  workspace=prepare(source);const main=path.join(workspace.root,'main.js');
  const prefix=`const updaterFixture=Object.assign(new(require('events').EventEmitter)(),{autoInstallOnAppQuit:true,checkForUpdates:async()=>{updaterFixture.emit('checking-for-update');return {};},quitAndInstall:()=>{global.updateFixtureInstalls=(global.updateFixtureInstalls||0)+1;}});global.__publicationUpdater=updaterFixture;Object.defineProperty(require('electron').app,'isPackaged',{get:()=>true});require('electron').ipcMain.handle('publication:emit',(_e,s)=>{if(s.st==='checking')updaterFixture.emit('checking-for-update');if(s.st==='available')updaterFixture.emit('update-available',{version:'${targetVersion}'});if(s.st==='progress')updaterFixture.emit('download-progress',{percent:37.5});if(s.st==='none')updaterFixture.emit('update-not-available');if(s.st==='error')updaterFixture.emit('error',Error('Synthetic unavailable update feed'));if(s.st==='ready')updaterFixture.emit('update-downloaded',{version:'${targetVersion}'});});require('electron').ipcMain.handle('publication:installs',()=>global.updateFixtureInstalls||0);\n`;
  const code=fs.readFileSync(main,'utf8');assert(code.includes("const { autoUpdater } = require('electron-updater');"));
  fs.writeFileSync(main,prefix+code.replace('webPreferences: {','webPreferences: {offscreen:true,backgroundThrottling:false,').replace('if (process.env.SQLPG_ISOLATED) return;','').replace("const { autoUpdater } = require('electron-updater');",'const autoUpdater=global.__publicationUpdater;'));
  fs.appendFileSync(path.join(workspace.root,'preload.js'),'\ncontextBridge.exposeInMainWorld("publicationTest",{emit:s=>ipcRenderer.invoke("publication:emit",s),installs:()=>ipcRenderer.invoke("publication:installs")});\n');
  app=await open({source,prepared:workspace,config:{lang,theme,provider:'openai',apiKey:'',profile:{name:'Synthetic learner'},uiScale:'auto',showMascot:false,tips:false,soundEnabled:false,welcomed:true,autoUpdate:false,onboarding:{completed:true,providerChoice:'later'}}});
  for(let i=0;i<100&&!await app.evaluate('window.__startupSplash?.phase==="hidden"');i++)await wait(50);
  await app.evaluate('document.getElementById("btnSettings").click();window.PractiNotifications.clear()');
  const states={};
  for(const state of ['checking','available','progress','none']){
   await app.evaluate('window.publicationTest.emit({st:'+JSON.stringify(state)+'})');await wait(60);states[state]=await app.evaluate('document.getElementById("updStatus").textContent');
  }
  check(states.checking===(lang==='en'?'Checking…':'Denetleniyor…')||states.checking===await app.evaluate('window.I18N['+JSON.stringify(lang)+'].updChecking'),lang+': checking state is localized');
  proof.lastProbe=states;
  check(states.available.includes(targetVersion)&&states.progress.includes('38')&&states.none===await app.evaluate('window.I18N['+JSON.stringify(lang)+'].updNone'),lang+': available, progress and no-update states are shown');
  await app.evaluate('document.getElementById("btnUpdCheck").click()');await wait(70);check(await app.evaluate('document.getElementById("updStatus").textContent')===states.checking,lang+': the real Check button uses its IPC handler');
  await app.evaluate('window.publicationTest.emit({st:"error"})');await wait(100);
  const error=await app.evaluate('({status:document.getElementById("updStatus").textContent,notifications:window.PractiNotifications.inspect().total})');
  check(error.notifications>0,lang+': update errors reach the top notification system');
  check(error.status===await app.evaluate('window.I18N['+JSON.stringify(lang)+'].updError'),lang+'/'+theme+': error replaces the checking status');await app.evaluate('document.getElementById("btnUpdCheck").click()');await wait(70);check(await app.evaluate('document.getElementById("updStatus").textContent')===states.checking,lang+'/'+theme+': retry starts a fresh check after error');
  await app.evaluate('window.publicationTest.emit({st:"ready"})');await wait(100);
  check(await app.evaluate('(async()=>!document.getElementById("confirmModal").classList.contains("hidden")&&(await window.publicationTest.installs())===0)()'),lang+': a downloaded update asks before explicit installation');
  const ready=await app.evaluate('document.getElementById("updStatus").textContent');check(ready.includes(targetVersion),lang+': downloaded version is identified');
  await app.evaluate('document.getElementById("confirmCancel").click()');await wait(70);check(await app.evaluate('window.publicationTest.installs()')===0,lang+': declining does not immediately invoke installation');
  await app.evaluate('window.publicationTest.emit({st:"ready"})');await wait(80);await app.evaluate('document.getElementById("confirmOk").click()');await wait(80);check(await app.evaluate('window.publicationTest.installs()')===1,lang+': confirming reaches the installer handoff exactly once');
  proof.languages.push({lang,theme,states,error,ready});await app.shutdown();app=null;dispose(workspace.directory);workspace=null;
 }
 proof.status='passed';
}catch(e){proof.status='failed';proof.error=e.stack;process.exitCode=1;}finally{await app?.shutdown();if(workspace)dispose(workspace.directory);fs.writeFileSync(out,JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({status:proof.status,checks:proof.checks.length,findings:proof.findings,error:proof.error?.slice(0,300)}));}})();
