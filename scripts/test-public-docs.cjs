'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),temporary=fs.mkdtempSync(path.join(os.tmpdir(),'practisql-docs-'));
const out=path.resolve(process.argv.slice(2).find(value=>!value.startsWith('--'))||path.join(root,'artifacts/architecture-verification.json')),shots=out.replace(/\.json$/,'')+'-screens',entry=path.join(temporary,'main.cjs'),screens=process.argv.includes('--screens');
assert(!fs.existsSync(out),'Preserve previous document verification evidence');fs.mkdirSync(path.dirname(out),{recursive:true});if(screens)fs.mkdirSync(shots,{recursive:true});
fs.writeFileSync(entry,`
'use strict';
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=${JSON.stringify(root)},out=${JSON.stringify(out)},shots=${JSON.stringify(shots)},screens=${JSON.stringify(screens)},data=JSON.parse(fs.readFileSync(path.join(root,'docs/architecture/architecture.json')));
app.setPath('userData',${JSON.stringify(path.join(temporary,'profile'))});
app.whenReady().then(async()=>{
 const proof={status:'running',version:data.version,languages:Object.keys(data.locales),views:data.views.length,nodes:Object.keys(data.nodes).length,checks:[],visibleWindows:0,networkRequests:0};
 const check=(ok,name)=>{assert(ok,name);proof.checks.push(name);};let win;
 try{
  win=new BrowserWindow({width:1440,height:1200,show:false,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
  const errors=[];win.webContents.on('console-message',(_event,level,message)=>{if(level===3)errors.push(message);});
  win.webContents.session.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_details,callback)=>{proof.networkRequests++;callback({cancel:true});});
  await win.loadFile(path.join(root,'docs/architecture/index.html'),{query:{lang:'tr'},hash:'projects'});
  const evaluate=code=>win.webContents.executeJavaScript(code);
  const click=selector=>evaluate('document.querySelector('+JSON.stringify(selector)+').click()');
  check(await evaluate('document.documentElement.lang==="tr"&&document.querySelector(".page.active").id==="projects"'),'Language query and deep-linked section are restored');
  check(await evaluate('JSON.stringify(JSON.parse(document.getElementById("architecture-data").textContent))')===JSON.stringify(data),'Embedded architecture data matches canonical source');
  for(const language of ['tr','en']){
   await click('[data-language="'+language+'"]');
   check(await evaluate('document.documentElement.lang')===language,language+': document language changes');
   check(await evaluate('new URL(location.href).searchParams.get("lang")')===language,language+': language is retained in a shareable URL');
   check(await evaluate('document.querySelector("[data-language][aria-pressed=true]").dataset.language')===language,language+': language selector exposes its state');
   const expected=language==='tr'?{headline:'Bir sorudan SQL’e.',role:'Bileşenin görevi',sources:'Koddaki karşılığı',next:'Sonraki →'}:{headline:'From a question to SQL.',role:'Component responsibility',sources:'Source code',next:'Next →'};
   for(const key of Object.keys(expected))check(await evaluate('document.querySelector('+JSON.stringify('[data-i18n="'+key+'"]')+').textContent')===expected[key],language+': '+key+' is translated');
   for(const view of data.views){
    await click('[data-view="'+view.id+'"]');
    const label=await evaluate('document.querySelector(".page.active h2").textContent'),note=await evaluate('document.querySelector(".page.active .view-note").textContent');
    check(label===data.locales[language].views[view.id].label&&note===data.locales[language].views[view.id].note,language+': '+view.id+' section and scope note');
    for(const id of view.nodes){
     await click('#'+view.id+' [data-node="'+id+'"]');
     const rendered=await evaluate('(()=>{const p=document.querySelector(".page.active"),b=p.querySelector("[aria-pressed=true]");return {title:p.querySelector(".detail h3").textContent,detail:p.querySelector(".detail p").textContent,caption:b.querySelector("small").textContent,sources:[...p.querySelectorAll(".sources a")].map(a=>a.textContent)};})()');
     const n=data.locales[language].nodes[id];
     check(rendered.title===n.title.replace(/^\\d+ · /,'')&&rendered.caption===n.caption&&rendered.detail===n.detail,language+': '+id+' complete translation is reachable');
     check(JSON.stringify(rendered.sources)===JSON.stringify(data.nodes[id].sources),language+': '+id+' source references are preserved');
    }
   }
   await click('[data-view="flow"]');await click('#flow [data-node="context"]');
   await evaluate('window.scrollTo(0,0);new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');await new Promise(resolve=>setTimeout(resolve,350));
   if(screens)fs.writeFileSync(path.join(shots,'architecture-'+language+'-wide.png'),(await win.webContents.capturePage()).toPNG());
  }
  await click('[data-view="projects"]');await click('#projects [data-node="projectnumeric"]');await click('[data-language="tr"]');
  check(await evaluate('document.querySelector(".page.active").id==="projects"&&document.querySelector(".page.active [aria-pressed=true]").dataset.node==="projectnumeric"'),'Language change retains view and selected component');
  await evaluate('document.querySelector(".tabs").dispatchEvent(new KeyboardEvent("keydown",{key:"ArrowRight",bubbles:true}))');
  check(await evaluate('document.querySelector(".page.active").id==="security"'),'Tab keyboard navigation advances a section');
  await click('#next');check(await evaluate('document.querySelector(".page.active").id==="flow"'),'Next wraps from last section to first');
  await click('#previous');check(await evaluate('document.querySelector(".page.active").id==="security"'),'Previous wraps from first section to last');
  for(const language of ['tr','en']){
   await click('[data-language="'+language+'"]');await click('[data-view="flow"]');
   for(const width of [760,390]){
    win.setContentSize(width,1100);await evaluate('window.scrollTo(0,0);new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    check(await evaluate('document.documentElement.scrollWidth<=innerWidth'),language+': no horizontal overflow at '+width+'px');
    if(screens)fs.writeFileSync(path.join(shots,'architecture-'+language+'-'+width+'.png'),(await win.webContents.capturePage()).toPNG());
   }
  }
  for(const [source,hash]of Object.entries(data.references))check(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,source))).digest('hex')===hash,'Source fingerprint matches: '+source);
  const markdown=['README.md','README.tr.md','docs/ARCHITECTURE.md','docs/en/architecture.md','docs/tr/architecture.md','docs/en/screenshots.md','docs/tr/screenshots.md','docs/en/appearance.md','docs/tr/appearance.md','docs/PUBLICATION.md','docs/assets/README.md','docs/en/request-flow.md','docs/tr/request-flow.md','docs/en/learning-workflows.md','docs/tr/learning-workflows.md','docs/releases/v3.4.262.md'];
  for(const file of markdown){const text=fs.readFileSync(path.join(root,file),'utf8');for(const match of text.matchAll(/\\]\\(([^\\s)]+)\\)/g)){const target=match[1];if(/^(?:https?:|#)/.test(target))continue;check(fs.existsSync(path.resolve(root,path.dirname(file),decodeURIComponent(target.split(/[?#]/)[0]))),'Local document link exists: '+file+' -> '+target);}}
  for(const language of ['en','tr']){
   const file=path.join(root,'docs/architecture/request-flow.'+language+'.svg');await win.loadFile(file);win.setContentSize(1520,690);await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
   check(await evaluate('(()=>{const svg=document.documentElement;return svg.tagName.toLowerCase()==="svg"&&[...document.querySelectorAll("text")].every(t=>{const b=t.getBBox();return b.x>=0&&b.x+b.width<=1520&&b.y>=0&&b.y+b.height<=690;});})()'),language+': static flow diagram text fits the artboard');
   if(screens)fs.writeFileSync(path.join(shots,'request-flow-'+language+'.png'),(await win.webContents.capturePage()).toPNG());
  }
  check(errors.length===0,'Presentation has no renderer errors');check(proof.networkRequests===0,'Presentation works without network requests');check(!win.isVisible(),'Verification never shows a window');proof.status='passed';
 }catch(error){proof.status='failed';proof.error=error.stack;}finally{proof.at=new Date().toISOString();fs.writeFileSync(out,JSON.stringify(proof,null,2)+'\\n');win?.destroy();app.exit(proof.status==='passed'?0:1);}
});
`);
try{const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;const result=spawnSync(require('electron'),[entry],{windowsHide:true,stdio:'ignore',env,timeout:90000});assert(fs.existsSync(out),'Electron verification did not produce evidence');const proof=JSON.parse(fs.readFileSync(out));assert.equal(result.status,0,proof.error);console.log(JSON.stringify({status:proof.status,checks:proof.checks.length,languages:proof.languages,networkRequests:proof.networkRequests,visibleWindows:proof.visibleWindows}));}
finally{const absolute=path.resolve(temporary);assert.equal(path.dirname(absolute),path.resolve(os.tmpdir()));assert(path.basename(absolute).startsWith('practisql-docs-'));fs.rmSync(absolute,{recursive:true,force:true});}
