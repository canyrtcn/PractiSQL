'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {open,prepare,dispose,wait}=require('./test-support/electron-session.cjs');
const positional=process.argv.slice(2).filter(value=>!value.startsWith('--')),source=path.resolve(positional[0]||'.'),out=path.resolve(positional[1]||'artifacts/publication-ui.json'),shots=out.replace(/\.json$/,'-screens'),screens=process.argv.includes('--screens');
assert(!fs.existsSync(out),'Preserve existing acceptance evidence');if(screens)fs.mkdirSync(shots,{recursive:true});
const proof={at:new Date().toISOString(),version:JSON.parse(fs.readFileSync(path.join(source,'package.json'))).version,realModelCalls:0,visibleWindows:0,checks:[],status:'running'};
const check=(ok,label)=>{assert(ok,label);proof.checks.push(label);};
let app,workspace;
async function capture(name){if(!screens)return;const shot=await app.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(shots,name+'.png'),Buffer.from(shot.data,'base64'));}
(async()=>{try{
 for(const theme of ['light','leaf','dark']){
  workspace=prepare(source);const external=path.join(workspace.profile,'external-links.json'),main=path.join(workspace.root,'main.js');
  fs.writeFileSync(main,`require('electron').shell.openExternal=async url=>{const fs=require('node:fs'),file=${JSON.stringify(external)},items=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):[];items.push(url);fs.writeFileSync(file,JSON.stringify(items));};\n`+fs.readFileSync(main,'utf8').replace('webPreferences: {','webPreferences: {offscreen:true,backgroundThrottling:false,'));
  app=await open({source,prepared:workspace,config:{lang:'tr',theme,showMascot:true,tips:false,soundEnabled:false,welcomed:true,autoUpdate:false,onboarding:{completed:true,providerChoice:'later'}}});
  await app.send('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
  await app.evaluate('document.fonts.ready');await wait(100);
  for(let i=0;i<120&&!await app.evaluate('window.__startupSplash?.phase==="hidden"');i++)await wait(50);
  const brand=await app.evaluate(`(()=>{const mark=document.querySelector('.tb-brandmark'),name=mark.querySelector('.brand'),r=mark.getBoundingClientRect(),n=name.getBoundingClientRect(),line=getComputedStyle(mark,'::after');return {right:r.left+parseFloat(line.left)+parseFloat(line.width),nameRight:n.right,streak:document.querySelector('.tb-btns #streakChip')?.nextElementSibling?.id,button:document.getElementById('streakChip').tagName,slogan:document.querySelector('.slogan').textContent};})()`);
  check(Math.abs(brand.right-brand.nameRight)<1&&brand.streak==='btnGuide'&&brand.button==='BUTTON',theme+': brand underline ends at name; accessible streak precedes guide');
  check(brand.slogan.includes('SQL playground')&&!brand.slogan.includes('oyun alanı'),theme+': Turkish slogan uses playground');
  await app.evaluate('document.getElementById("streakChip").click()');check(await app.evaluate('!document.getElementById("profileModal").classList.contains("hidden")'),theme+': relocated streak still opens profile');await app.evaluate('document.getElementById("btnProfileClose").click()');
  await app.evaluate('document.getElementById("btnSettings").click();document.querySelector("#settingsModal .modal").scrollTop=100000;');
  check(await app.evaluate('(()=>{const footer=document.querySelector(".settings-footer"),r=footer.getBoundingClientRect(),m=footer.closest(".modal").getBoundingClientRect();return !!footer.querySelector("svg")&&footer.textContent.includes("MIT")&&footer.textContent.includes("© 2026")&&r.bottom<=m.bottom+1;})()'),theme+': settings attribution and GitHub logo are reachable at the bottom');
  await app.evaluate('document.getElementById("settingsGithub").click()');for(let i=0;i<20&&!fs.existsSync(external);i++)await wait(30);
  check(JSON.parse(fs.readFileSync(external)).at(-1)==='https://github.com/canyrtcn',theme+': GitHub footer passes the exact author homepage through main-process validation');
  const rejected=await app.evaluate(`(async()=>{const urls=['javascript:alert(1)','https://github.com/canyrtcn.evil.test','https://github.com/someone-else','https://github.com/canyrtcn/PractiSQL/../../someone'];return Promise.all(urls.map(async url=>{try{await window.electronAPI.openUrl(url);return false;}catch{return true;}}));})()`);
  check(rejected.every(Boolean),theme+': unrelated and executable URLs remain blocked');
  await capture('settings-'+theme);await app.evaluate('document.getElementById("btnSettingsClose").click();document.getElementById("btnChallenges").click();document.querySelector("[data-task]").click();document.querySelector(".challenge-schema").open=true;');
  await app.send('Emulation.setDeviceMetricsOverride',{width:860,height:900,deviceScaleFactor:1,mobile:false});
  await wait(450);
  for(const scroll of [0,100,350,900,100000]){
   const geometry=await app.evaluate(`(()=>{const body=document.getElementById('challengeBody'),modal=body.parentElement;body.scrollTop=${scroll};const b=body.getBoundingClientRect(),m=modal.getBoundingClientRect(),samples=[m.left+32,(m.left+m.right)/2,m.right-32];return {gap:b.top-m.top,bottomGap:m.bottom-b.bottom,topClear:samples.every(x=>document.elementsFromPoint(x,m.top+3).every(e=>e===modal||!modal.contains(e))),scrollable:body.scrollHeight>body.clientHeight,columns:body.querySelectorAll('th').length};})()`);
   check(geometry.gap>=3.9&&geometry.gap<5&&geometry.bottomGap>=.9&&geometry.topClear&&geometry.scrollable&&geometry.columns>0,theme+': real accent border has no white gutter and confines scroll '+scroll+' '+JSON.stringify(geometry));
  }
  await app.evaluate('document.getElementById("challengeBody").scrollTop=350');await capture('challenge-scroll-'+theme);
  await app.shutdown();app=null;dispose(workspace.directory);workspace=null;
 }
 for(const lang of ['tr','en']){
  app=await open({source,config:{lang,theme:'light',tips:false,soundEnabled:false,showMascot:false,welcomed:true,autoUpdate:false,onboarding:{completed:false,stage:'provider'}}});workspace={directory:app.directory};
  for(let i=0;i<150&&!await app.evaluate('!!document.getElementById("identityDialog")?.open');i++)await wait(50);
  const privacy=await app.evaluate('(()=>{const note=document.getElementById("identityPrivacy"),dialog=document.getElementById("identityDialog");return {visible:!!note&&dialog.open,text:note?.textContent,choices:dialog.querySelectorAll("[data-setup-provider]").length};})()');
  check(privacy.visible&&privacy.choices===3&&/AI/.test(privacy.text),lang+': first-run privacy note accompanies all three provider choices');
  await capture('privacy-'+lang);await app.evaluate('document.querySelector("[data-setup-provider=later]").click()');
  check(await app.evaluate('!document.getElementById("identityDialog").open'),lang+': privacy information adds no consent gate and AI can be skipped');
  await app.shutdown();app=null;dispose(workspace.directory);workspace=null;
 }
 proof.status='passed';
}catch(error){proof.status='failed';proof.error=error.stack;process.exitCode=1;}finally{app?.close();if(workspace)dispose(workspace.directory);proof.finishedAt=new Date().toISOString();fs.writeFileSync(out,JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({status:proof.status,checks:proof.checks.length,error:proof.error?.slice(0,450),out}));}})();

