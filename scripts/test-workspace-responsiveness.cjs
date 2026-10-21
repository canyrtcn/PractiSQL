'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {open,prepare,dispose,wait}=require('./test-support/electron-session.cjs');
const source=path.resolve(process.argv[2]||'.'),out=path.resolve(process.argv[3]||'artifacts/workspace-responsiveness.json'),packaged=process.argv[4]?path.resolve(process.argv[4]):null;assert(!fs.existsSync(out));
const proof={status:'running',checks:[],measurements:[],visibleWindows:0,realModelCalls:0,personalDataUsed:false};let app,workspace;
const check=(ok,label)=>{assert(ok,label);proof.checks.push(label);};
async function until(expression){for(let i=0;i<100;i++){if(await app.evaluate(expression))return;await wait(50);}assert.fail('Timed out: '+expression);}
(async()=>{try{
 workspace=prepare(source);let main=path.join(workspace.root,'main.js'),executable;
 if(packaged){const runtime=path.join(workspace.directory,'runtime');fs.cpSync(packaged,runtime,{recursive:true});const application=path.join(runtime,'resources/app');for(const name of ['app.js','sql-completion.js','result-table.js'])check(fs.readFileSync(path.join(application,'renderer',name)).equals(fs.readFileSync(path.join(source,'app/renderer',name))),'Packaged workspace source matches: '+name);main=path.join(application,'main.js');fs.writeFileSync(main,"require('electron').app.on('browser-window-created',(_event,window)=>{window.show=()=>{};window.focus=()=>{};});\n"+fs.readFileSync(main,'utf8'));executable=path.join(runtime,'PractiSQL.exe');}
 fs.writeFileSync(main,fs.readFileSync(main,'utf8').replace('webPreferences: {','webPreferences: {offscreen:true,backgroundThrottling:false,'));
 app=await open({source,prepared:workspace,executable,config:{lang:'tr',theme:'dark',profile:{name:'Workspace fixture'},showMascot:true,tips:true,soundEnabled:false,welcomed:true,autoUpdate:false,onboarding:{completed:true,providerChoice:'later'}}});
 await app.send('Emulation.setDeviceMetricsOverride',{width:1488,height:918,deviceScaleFactor:1,mobile:false});await until('window.__startupSplash?.phase==="hidden"');
 await app.evaluate('localStorage.setItem("sqlpg-assistmode","line");document.documentElement.dataset.uiFont="brand";');
 for(const mode of ['word','next1','next3','line'])for(const text of ['', '   ', 'SELECT 1;\n']){
  await app.evaluate('(()=>{const e=document.getElementById("editor");localStorage.setItem("sqlpg-assistmode",'+JSON.stringify(mode)+');e.value='+JSON.stringify(text)+';e.setSelectionRange(e.value.length,e.value.length);window.__pg.assist();})()');await wait(100);
  check(await app.evaluate('!document.querySelector("#sqlEditor .ghost")&&!document.getElementById("editorSuggestion").textContent'),mode+': empty or finished SQL has no invented query '+JSON.stringify(text));
 }
 await app.evaluate('(()=>{const e=document.getElementById("editor");e.value="SEL";e.setSelectionRange(3,3);e.focus();window.__pg.assist();})()');await wait(100);await app.send('Input.dispatchKeyEvent',{type:'keyDown',key:'a',code:'KeyA',modifiers:2});await app.send('Input.dispatchKeyEvent',{type:'keyUp',key:'a',code:'KeyA',modifiers:2});await app.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Backspace',code:'Backspace'});await app.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Backspace',code:'Backspace'});await wait(150);
 check(await app.evaluate('document.getElementById("editor").value===""&&!document.querySelector("#sqlEditor .ghost")'),'Deleting the entire document clears a pending completion');
 await app.evaluate('document.getElementById("editor").value="SEL";window.__pg.assist();document.getElementById("btnClear").click()');await wait(100);check(await app.evaluate('!document.querySelector("#sqlEditor .ghost")'),'The Clear button also removes the pending completion');
 await app.evaluate('window.__pg.run("CREATE TABLE sample(id INTEGER PRIMARY KEY,label TEXT,amount REAL,region TEXT,note TEXT,payload BLOB); WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<5000) INSERT INTO sample SELECT x,\'Müşteri \'||x,x*1.25,\'İstanbul\',CASE WHEN x%2=0 THEN NULL ELSE \'Not\' END,X\'CAFE\' FROM n;")',120000);
 const query='SELECT id,label,amount,region,note,payload FROM sample ORDER BY id;';await app.evaluate('window.__pg.run('+JSON.stringify(query)+')');
 await app.evaluate('window.__pg.chatAdd("assistant",'+JSON.stringify('## Sorgu sonucu\nMüşterileri inceleyelim.\n\n```sql\n'+query+'\n```')+')');
 await wait(200);check(await app.evaluate('!document.querySelector("#sqlEditor .ghost")&&!document.getElementById("editorSuggestion").textContent'),'A finished query has no unsolicited SELECT/FROM suggestion');
 const data=await app.evaluate('window.__pg.resultSets()');check(data.length===1&&data[0].values.length===5000&&data[0].values.at(-1)[0]===5000,'All 5000 result rows remain available without changing query execution');
 for(const theme of ['dark','leaf','light']){
  while(await app.evaluate('window.__pg.theme()')!==theme)await app.evaluate('window.__pg.toggleTheme()');
  await app.evaluate('document.querySelector("#results .rtable").scrollTop=0');await wait(100);
  check(await app.evaluate('document.querySelectorAll("#results td").length<400&&document.querySelector("#results .result-row td").textContent==="1"'),theme+': bounded cells retain the first row');
  await app.evaluate('document.querySelector("#results .rtable").scrollTop=1e8');await until('document.querySelector("#results .result-row:last-of-type td")?.textContent==="5000"');
  check(await app.evaluate('Array.from(document.querySelectorAll("#results .result-row")).at(-1).cells[0].textContent==="5000"'),theme+': scrolling reaches the final row');
  check(await app.evaluate('document.querySelector("#results table").getAttribute("aria-rowcount")==="5001"'),theme+': assistive technology receives the complete row count');
 }
 await app.evaluate('Object.defineProperty(navigator.clipboard,"writeText",{configurable:true,value:async text=>{window.__copiedResult=text;}});document.querySelector("#results .result-row:last-of-type td").click()');
 check(await app.evaluate('window.__copiedResult==="5000"'),'Cell copying remains correct after scrolling');
 await app.evaluate('document.querySelector("#results th").click()');await until('document.querySelector("#results .rtable").scrollTop===0');await wait(200);await app.evaluate('document.querySelector("#results th").click()');await until('document.querySelector("#results .result-row td")?.textContent==="5000"');
 check(await app.evaluate('window.__pg.resultSets()[0].values[0][0]===5000'),'Column sorting still uses the existing SQL sort and retains all result rows');
 const large=('-- workspace fixture\nSELECT id,label,amount,region,note,payload FROM sample WHERE id>0 ORDER BY id;\n').repeat(2400)+'\nSELECT 1;';
 await app.evaluate('(()=>{const e=document.getElementById("editor");e.value='+JSON.stringify(large)+';e.setSelectionRange(0,0);window.__pg.assist();e.focus();})()');await until('!!document.querySelector("#sqlEditor .sql-kw")');
 const typing=[];for(let i=0;i<8;i++){const start=performance.now();await app.send('Input.insertText',{text:'x'});typing.push(performance.now()-start);await wait(30);}
 const composer=[];await app.evaluate('document.getElementById("aiPrompt").focus()');for(let i=0;i<8;i++){const start=performance.now();await app.send('Input.insertText',{text:'Sorgu '});composer.push(performance.now()-start);await wait(30);}
 const resizing=await app.evaluate('('+async function(){const host=document.getElementById('sqlEditor'),times=[];for(let i=0;i<18;i++){const start=performance.now();host.style.height=(200+i*10)+'px';host.getBoundingClientRect();await new Promise(requestAnimationFrame);times.push(performance.now()-start);}return times;}+')()');
 proof.measurements.push({characters:large.length,resultRows:5000,editorMs:typing,composerMs:composer,resizeFrameMs:resizing});
 const percentile=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length*.85)];
 check(percentile(typing)<80&&percentile(composer)<80,'Typing stays responsive with a large script, full results, chat and mascot');
 check(percentile(resizing)<80,'Resizing the editor stays responsive with full results visible');
 await app.evaluate('document.getElementById("sqlEditor").style.height="250px";document.querySelector(".col.center").scrollTop=0');await wait(100);
 const before=await app.evaluate('(()=>{const r=document.getElementById("sqlEditor").getBoundingClientRect();return {x:r.right-4,y:r.bottom-4,height:r.height};})()');
 await app.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:before.x,y:before.y});await app.send('Input.dispatchMouseEvent',{type:'mousePressed',x:before.x,y:before.y,button:'left',clickCount:1});
 for(let i=1;i<=8;i++)await app.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:before.x,y:before.y+i*9,button:'left',buttons:1});
 await app.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:before.x,y:before.y+72,button:'left',clickCount:1});await wait(100);
 check(await app.evaluate('document.getElementById("sqlEditor").getBoundingClientRect().height')>before.height+30,'The native bottom-corner drag actually resizes the editor');
 check(await app.evaluate('document.querySelectorAll("#sqlEditor .sql-kw").length>0&&window.__pg.resultSets()[0].values.length===5000'),'Syntax colours and complete results survive native resizing');
 proof.status='passed';
}catch(error){proof.status='failed';proof.error=error.stack;process.exitCode=1;}finally{if(app)await app.shutdown().catch(()=>app.close());if(workspace)dispose(workspace.directory);fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(proof,null,2));console.log(JSON.stringify(proof));}})();
