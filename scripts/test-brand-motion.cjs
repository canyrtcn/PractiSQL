'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {open,prepare,dispose,wait}=require('./test-support/electron-session.cjs');
const positional=process.argv.slice(2).filter(value=>!value.startsWith('--')),source=path.resolve(positional[0]||'.'),out=path.resolve(positional[1]||'artifacts/brand-motion-verification.json'),shots=out.replace(/\.json$/,'-screens'),captureScreens=process.argv.includes('--screens');
assert(!fs.existsSync(out));if(captureScreens)fs.mkdirSync(shots,{recursive:true});
const proof={at:new Date().toISOString(),status:'running',checks:[],themes:[],realModelCalls:0,visibleWindows:0};
const check=(ok,name)=>{assert(ok,name);proof.checks.push(name);};let app,workspace;
(async()=>{try{
 for(const theme of ['light','leaf','dark']){
  workspace=prepare(source);const main=path.join(workspace.root,'main.js');fs.writeFileSync(main,fs.readFileSync(main,'utf8').replace('webPreferences: {','webPreferences: {offscreen:true,backgroundThrottling:false,'));
  const startup=path.join(workspace.root,'renderer/startup-screen.js');fs.writeFileSync(startup,fs.readFileSync(startup,'utf8').replace("const state = window.__startupSplash",'window.__firstAppearance={language:document.documentElement.lang,slogan:splash.querySelector(".splash-tag").textContent};\n  const state = window.__startupSplash'));
  app=await open({source,prepared:workspace,config:{lang:'tr',theme,tips:false,soundEnabled:false,showMascot:true,welcomed:true,autoUpdate:false,onboarding:{completed:true,providerChoice:'later'}}});
  await app.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  for(let i=0;i<120&&!await app.evaluate('window.__startupSplash?.phase==="hidden"');i++)await wait(50);
  await app.evaluate('document.fonts.ready');
  const first=await app.evaluate('window.__firstAppearance');check(first.language==='tr'&&first.slogan==='Yapay zekâ destekli sade SQL playground',theme+': Turkish slogan is correct before settings load');
  const brand=await app.evaluate('(()=>{const b=document.querySelector(".brand"),i=document.getElementById("appIcon"),r=b.getBoundingClientRect(),s=i.getBoundingClientRect();return {font:getComputedStyle(b).fontFamily,base:getComputedStyle(b.firstElementChild).color,sql:getComputedStyle(b.lastElementChild).color,dy:Math.abs((r.top+r.bottom-s.top-s.bottom)/2),line:getComputedStyle(document.querySelector(".tb-brandmark"),"::after").width,width:document.querySelector(".tb-brandmark").getBoundingClientRect().width};})()');
  check(brand.font.includes('PractiSQL Display')&&brand.base!==brand.sql&&brand.dy<2,theme+': reference-lettering wordmark, green SQL and centred icon');
  check(await app.evaluate('(()=>{const s=getComputedStyle(document.getElementById("appIcon"));return parseFloat(s.width)>=36&&parseFloat(s.borderTopWidth)===0&&parseFloat(s.paddingTop)===0&&s.boxShadow==="none";})()'),theme+': enlarged icon keeps only its original frame');
  check(Math.abs(parseFloat(brand.line)-brand.width-4)<1,theme+': underline spans the complete logo and wordmark');
  check(await app.evaluate('parseFloat(getComputedStyle(document.querySelector(".brand")).fontSize)>=24'),theme+': wordmark keeps its intended display size');
  for(const typeface of ['brand','nunito','manrope','system']){
    await app.evaluate(`(()=>{const s=document.getElementById('setTypeface');s.value=${JSON.stringify(typeface)};s.dispatchEvent(new Event('change'));})()`);await app.evaluate('document.fonts.ready');
    check(await app.evaluate(`document.documentElement.dataset.uiFont===${JSON.stringify(typeface)}&&localStorage.getItem('sqlpg-typeface')===${JSON.stringify(typeface)}`),theme+': typeface preference persists: '+typeface);
    if(typeface==='brand')check(await app.evaluate('getComputedStyle(document.body).fontFamily.includes("Nunito")&&!getComputedStyle(document.body).fontFamily.includes("PractiSQL Display")'),theme+': display lettering is separated from readable interface text');
  }
  check(await app.evaluate('getComputedStyle(document.getElementById("editor")).fontFamily.toLowerCase().includes("consolas")'),theme+': SQL editor retains its monospace typeface');
  await app.evaluate('Object.defineProperty(document,"hidden",{configurable:true,get:()=>false});window.__pg.roaming.target({x:850,y:10000,tx:850,ty:10000,stopped:true});window.PractiMascotMotion.stop();');
  await wait(700);
  const restingFeet=await app.evaluate('document.querySelector("#roamFace .mascot-foot-left rect").getBoundingClientRect().bottom');
  // Seek native Web Animations for geometry checks. Wall-clock sampling can
  // miss a short performance on a loaded CI runner.
  await app.evaluate('(async()=>{window.PractiMascotMotion.play("wave");for(const a of document.getElementById("roamFace").getAnimations()){a.pause();await a.ready;a.currentTime=Number(a.effect.getTiming().duration)*.25;}await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));})()');
  check(await app.evaluate('!document.querySelector(".mascot-arm")&&getComputedStyle(document.getElementById("roamFace")).rotate!=="none"'),theme+': greeting animates the arm-free character');
  const hopStarted=await app.evaluate('(()=>{window.PractiMascotMotion.stop();const started=window.PractiMascotMotion.play("happy-hop");window.__hopAnimations=document.getElementById("roamFace").getAnimations({subtree:true});return started&&window.__hopAnimations.some(a=>a.playState==="running");})()');
  check(hopStarted,theme+': hop starts an enabled native animation');
  let lowestFeet=restingFeet;const hopSamples=[];
  for(const fraction of Array.from({length:21},(_,i)=>i/20)){
    const sample=await app.evaluate('(async()=>{const face=document.getElementById("roamFace");for(const a of window.__hopAnimations){a.pause();await a.ready;a.currentTime=Number(a.effect.getTiming().duration)*'+fraction+';}await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return {bottom:face.querySelector(".mascot-foot-left rect").getBoundingClientRect().bottom,translate:getComputedStyle(face).translate};})()');
    hopSamples.push({fraction,...sample});lowestFeet=Math.min(lowestFeet,sample.bottom);
  }
  proof.hopDebug=await app.evaluate('({bottom:document.querySelector("#roamFace .mascot-foot-left rect").getBoundingClientRect().bottom,motion:window.PractiMascotMotion.inspect(),translate:getComputedStyle(document.getElementById("roamFace")).translate,scale:getComputedStyle(document.getElementById("roamFace")).scale,actor:document.getElementById("roamMascot").className,bubble:!!document.getElementById("roamWrap").querySelector(".mbubble"),roaming:window.__pg.roaming.state()})');proof.hopDebug.restingFeet=restingFeet;proof.hopDebug.samples=hopSamples;
  check(lowestFeet<restingFeet-5,theme+': hop has visible lift');
  await app.evaluate('Promise.all(window.__hopAnimations.map(a=>{const completed=a.finished;a.finish();return completed;})).then(()=>{delete window.__hopAnimations;})');
  check(Math.abs(await app.evaluate('document.querySelector("#roamFace .mascot-foot-left rect").getBoundingClientRect().bottom')-restingFeet)<1,theme+': hop returns precisely to its resting floor');
  const motionKinds=['wave','stretch','peek','toe-tap','sway','proud','sleepy','happy-hop','wink','double-hop','wiggle','balance','tiptoe','curious','breathe','shuffle','bow','shiver','celebrate','delight','twirl','nod','blink'];
  for(const kind of motionKinds){
    const state=await app.evaluate(`(()=>{window.PractiMascotMotion.play(${JSON.stringify(kind)});return window.PractiMascotMotion.inspect();})()`);
    check(state.kind===kind&&state.animations>0,theme+': performance starts: '+kind);
    await wait(100);await app.evaluate('window.PractiMascotMotion.stop()');
    check(await app.evaluate('!window.PractiMascotMotion.inspect().kind&&!document.getElementById("roamFace").getAnimations({subtree:true}).some(a=>a.playState==="running")'),theme+': performance cancels cleanly: '+kind);
  }
  await app.evaluate('window.PractiMascotMotion.play("wave");document.getElementById("setAnim").checked=false;document.getElementById("setAnim").dispatchEvent(new Event("change"));');
  check(await app.evaluate('!window.PractiMascotMotion.inspect().kind&&!window.PractiMascotMotion.play("wave")'),theme+': animation preference cancels and prevents performances');
  await app.evaluate('document.getElementById("setAnim").checked=true;document.getElementById("setAnim").dispatchEvent(new Event("change"));window.PractiMascotMotion.stop();');
  const variety=await app.evaluate('(()=>{const values=[];for(let i=0;i<6;i++){const motion=window.PractiMascotMotion;motion.stop();const now=performance.now();motion.tick(now+20000,{stationary:true});motion.tick(now+22000,{stationary:true});values.push(motion.inspect().kind);}window.PractiMascotMotion.stop();return values;})()');
  check(variety.every(Boolean)&&new Set(variety).size===6,theme+': idle director varies its performances without immediate repetition');
  await app.evaluate('window.PractiMascotMotion.play("wave");Object.defineProperty(document,"hidden",{configurable:true,get:()=>true});document.dispatchEvent(new Event("visibilitychange"));');
  check(await app.evaluate('!window.PractiMascotMotion.inspect().kind'),theme+': hidden window suspends character performances');
  await app.evaluate('Object.defineProperty(document,"hidden",{configurable:true,get:()=>false});window.PractiMascotMotion.stop();document.querySelectorAll(".toast-close").forEach(b=>{if(b.getClientRects().length)b.click()});');
  if(captureScreens){await wait(300);const image=await app.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(shots,'workspace-'+theme+'.png'),Buffer.from(image.data,'base64'));await app.evaluate('document.getElementById("btnSettings").click()');await app.evaluate('document.getElementById("setTypeface").scrollIntoView({block:"center"})');const settings=await app.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(shots,'typography-'+theme+'.png'),Buffer.from(settings.data,'base64'));}
  proof.themes.push({theme,firstAppearance:first,brand});
  await app.evaluate('document.getElementById("setTypeface").value="manrope";document.getElementById("setTypeface").dispatchEvent(new Event("change"));');
  await app.send('Page.reload');for(let i=0;i<150&&!await app.evaluate('window.__pg&&window.__startupSplash?.phase==="hidden"');i++)await wait(50);
  check(await app.evaluate('document.documentElement.dataset.uiFont==="manrope"&&getComputedStyle(document.body).fontFamily.includes("Manrope")'),theme+': selected typeface survives a complete reload');
  await app.shutdown();app=null;dispose(workspace.directory);workspace=null;
 }
 workspace=prepare(source);const startup=path.join(workspace.root,'renderer/startup-screen.js');fs.writeFileSync(startup,fs.readFileSync(startup,'utf8').replace("const state = window.__startupSplash",'window.__firstAppearance={language:document.documentElement.lang,slogan:splash.querySelector(".splash-tag").textContent};\n  const state = window.__startupSplash'));
 app=await open({source,prepared:workspace,config:{theme:'light',tips:false,showMascot:false,autoUpdate:false}});
 check(await app.evaluate('window.__firstAppearance.language==="en"&&window.__firstAppearance.slogan==="A simple, AI-powered SQL playground"'),'First installation defaults to English');
 proof.status='passed';
}catch(error){proof.status='failed';proof.error=error.stack;process.exitCode=1;}finally{await app?.shutdown();if(workspace)dispose(workspace.directory);fs.writeFileSync(out,JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({status:proof.status,checks:proof.checks.length,error:proof.error?.slice(0,550),out}));}})();
