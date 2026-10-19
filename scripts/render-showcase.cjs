'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),temporary=fs.mkdtempSync(path.join(os.tmpdir(),'practisql-showcase-gallery-')),entry=path.join(temporary,'main.cjs'),output=path.resolve(process.argv[2]||path.join(root,'artifacts/showcase-verification.json'));
assert(!fs.existsSync(output),'Preserve earlier verification evidence');
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.mkdirSync(path.join(root,'artifacts'),{recursive:true});
fs.writeFileSync(entry,`
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=${JSON.stringify(root)},manifest=JSON.parse(fs.readFileSync(path.join(root,'docs/showcase/manifest.json'))),proof={at:new Date().toISOString(),status:'running',checks:[],cards:[],contactSheets:[],networkRequests:0,visibleWindows:0};
const check=(ok,name)=>{assert(ok,name);proof.checks.push(name);};app.commandLine.appendSwitch('force-device-scale-factor','1');app.setPath('userData',${JSON.stringify(path.join(temporary,'profile'))});
app.whenReady().then(async()=>{let win;try{win=new BrowserWindow({width:1600,height:1000,useContentSize:true,frame:false,show:false,webPreferences:{offscreen:true,backgroundThrottling:false,sandbox:true,contextIsolation:true,nodeIntegration:false}});win.webContents.session.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_d,cb)=>{proof.networkRequests++;cb({cancel:true})});
const evaluate=code=>win.webContents.executeJavaScript(code);const click=s=>evaluate('document.querySelector('+JSON.stringify(s)+').click()');
for(const card of manifest.cards)for(const language of card.languages){
 const source='docs/showcase/templates/'+card.id+'.'+language+'.html';await win.loadFile(path.join(root,source));await evaluate('document.fonts.ready');await evaluate('Promise.all([...document.images].map(i=>i.decode()))');await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
 proof.lastLayout=await evaluate('({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,dpr:devicePixelRatio})');check(await evaluate('document.documentElement.lang')===language,source+': correct language');check(await evaluate('document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth'),source+': no page overflow');
 check(await evaluate('(()=>{const r=document.querySelector(".bottom").getBoundingClientRect(),v=document.querySelector(".visual").getBoundingClientRect(),h=document.querySelector("h1").getBoundingClientRect();return r.bottom<=innerHeight&&v.bottom<=r.top+2&&h.top>=0;})()'),source+': visual and copy fit above footer');
 check(await evaluate('(()=>{const c=document.querySelector(".copy").getBoundingClientRect(),f=document.querySelector(".bottom").getBoundingClientRect();return [...document.querySelectorAll(".copy h1,.copy p,.copy li,.companion-art")].filter(e=>e.getClientRects().length).every(e=>{const r=e.getBoundingClientRect();return r.bottom<=f.top-8&&r.left>=c.left-1&&r.right<=c.right+1;});})()'),source+': every title, paragraph and feature stays inside the copy area');
 check(await evaluate('(()=>{return [...document.querySelectorAll(".crop")].every(e=>{const s=getComputedStyle(e),x=+s.getPropertyValue("--crop-x"),y=+s.getPropertyValue("--crop-y"),w=+s.getPropertyValue("--crop-width"),h=+s.getPropertyValue("--crop-height"),r=e.getBoundingClientRect(),i=e.querySelector("img").getBoundingClientRect(),scale=i.width/1600;return x>=0&&y>=0&&x+w<=1600&&y+h<=1000&&Math.abs(i.left+x*scale-r.left)<3&&Math.abs(i.top+y*scale-r.top)<3&&Math.abs(r.width-w*scale)<3&&Math.abs(r.height-h*scale)<3;});})()'),source+': the complete selected screenshot region is visible without accidental clipping or stretching');
 const file='docs/showcase/cards/'+card.id+'.'+language+'.png',bytes=(await win.webContents.capturePage()).toPNG();fs.writeFileSync(path.join(root,file),bytes);proof.cards.push({file,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)});
}
proof.phase='gallery';fs.writeFileSync(${JSON.stringify(output)},JSON.stringify(proof,null,2));
await win.loadFile(path.join(root,'docs/showcase/index.html'),{query:{lang:'en',theme:'light'}});
check(await evaluate('document.querySelectorAll(".shot:not([hidden])").length')===manifest.sections,'Each theme filter contains every section');
for(const theme of ['leaf','dark','all']){await click('[data-filter="'+theme+'"]');check(await evaluate('document.querySelectorAll(".shot:not([hidden])").length')===(theme==='all'?manifest.screenshots.length:manifest.sections),'Theme filter '+theme);}
await click('[data-lang="tr"]');check(await evaluate('document.documentElement.lang==="tr"&&document.querySelector("h1").textContent==="PractiSQL’i keşfet"'),'Gallery switches to Turkish');check(await evaluate('document.querySelector("[data-card]").href.endsWith(".tr.png")'),'Gallery switches presentation image language');
await click('[data-lang="en"]');await click('[data-filter="light"]');await evaluate('window.scrollTo(0,0);Promise.all([...document.images].filter(i=>{const r=i.getBoundingClientRect();return r.width>0&&r.top<innerHeight*1.5}).map(i=>{i.loading="eager";return i.decode()}))');await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');fs.writeFileSync(path.join(root,'artifacts/showcase-gallery-wide.png'),(await win.webContents.capturePage()).toPNG());
win.setContentSize(390,1100);await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');check(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'Gallery fits a narrow screen');fs.writeFileSync(path.join(root,'artifacts/showcase-gallery-narrow.png'),(await win.webContents.capturePage()).toPNG());
win.setContentSize(1600,1000);
for(const theme of manifest.themes)for(let page=0;page<3;page++){
 const rows=manifest.screenshots.filter(s=>s.theme===theme).slice(page*12,page*12+12);const html='<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;background:#dde3d7;font:14px Segoe UI,sans-serif;padding:14px}h1{margin:0 0 13px;font-size:19px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}figure{margin:0;background:white;overflow:hidden;border-radius:6px}img{display:block;width:100%;height:auto}figcaption{padding:7px 10px}</style></head><body><h1>'+theme+' · '+(page+1)+'</h1><div class="grid">'+rows.map(s=>'<figure><img src="'+new URL('file:///'+path.join(root,s.file).replaceAll('\\\\','/')).href+'"><figcaption>'+s.id+'</figcaption></figure>').join('')+'</div></body></html>';
 const temporary=path.join(${JSON.stringify(temporary)},'contact.html');fs.writeFileSync(temporary,html);await win.loadFile(temporary);await evaluate('Promise.all([...document.images].map(i=>i.decode()))');await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');const file='artifacts/showcase-contact-'+theme+'-'+(page+1)+'.png';fs.writeFileSync(path.join(root,file),(await win.webContents.capturePage()).toPNG());proof.contactSheets.push(file);
}
for(const image of manifest.screenshots)check(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,image.file))).digest('hex')===image.sha256,'Raw screenshot remains unchanged: '+image.theme+'/'+image.id);
check(proof.networkRequests===0,'Gallery and presentation rendering need no network');check(!win.isVisible(),'No window was shown');proof.status='passed';
}catch(error){proof.status='failed';proof.error=error.stack;}finally{fs.writeFileSync(${JSON.stringify(output)},JSON.stringify(proof,null,2)+'\\n');win?.destroy();app.exit(proof.status==='passed'?0:1);}});
`);
try{
 const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 const result=spawnSync(require('electron'),[entry],{windowsHide:true,env,stdio:'ignore',timeout:90000});
 assert(fs.existsSync(output),'No gallery evidence');const proof=JSON.parse(fs.readFileSync(output));assert.equal(result.status,0,proof.error);
 proof.readmeImages=[];
 for(const language of ['en','tr'])for(const [source,name]of [['product-overview','overview'],['query-results','learning-workflow']]){
  const file='docs/assets/'+name+'.'+language+'.png';fs.copyFileSync(path.join(root,'docs/showcase/cards/'+source+'.'+language+'.png'),path.join(root,file));proof.readmeImages.push(file);
 }
 fs.writeFileSync(output,JSON.stringify(proof,null,2)+'\n');
 console.log(JSON.stringify({status:proof.status,checks:proof.checks.length,cards:proof.cards.length,readmeImages:proof.readmeImages.length,contactSheets:proof.contactSheets.length,visibleWindows:0}));
}
finally{const resolved=path.resolve(temporary);assert.equal(path.dirname(resolved),path.resolve(os.tmpdir()));assert(path.basename(resolved).startsWith('practisql-showcase-gallery-'));fs.rmSync(resolved,{recursive:true,force:true});}
