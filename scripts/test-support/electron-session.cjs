'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawn,spawnSync}=require('node:child_process'),assert=require('node:assert/strict');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function dispose(directory){
  const resolved=path.resolve(directory);assert.equal(path.dirname(resolved),path.resolve(os.tmpdir()));assert.match(path.basename(resolved),/^practisql-security-app-[A-Za-z0-9]+$/);assert(!fs.lstatSync(resolved).isSymbolicLink());
  const modules=path.join(resolved,'app/node_modules');if(fs.existsSync(modules))fs.unlinkSync(modules);
  fs.rmSync(resolved,{recursive:true,force:true});
}
function prepare(source){
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'practisql-security-app-')),root=path.join(directory,'app'),profile=path.join(directory,'profile'),pkg=JSON.parse(fs.readFileSync(path.join(source,'package.json')));
  fs.mkdirSync(root);fs.mkdirSync(profile);
  for(const entry of pkg.build.files){
    if(typeof entry==='object'){
      assert.equal(entry.from,'app');assert.equal(entry.to,'.');
      fs.cpSync(path.join(source,entry.from),root,{recursive:true,filter:from=>!path.relative(path.join(source,entry.from),from).split(path.sep).includes('node_modules')});
      continue;
    }
    if(entry.startsWith('node_modules/'))continue;
    const relative=entry.replace(/\/\*\*$/,'');assert(!relative.includes('*'));const from=path.join(source,relative),to=path.join(root,relative);fs.mkdirSync(path.dirname(to),{recursive:true});fs.cpSync(from,to,{recursive:true});
  }
  // Match the unchanged packaged entry after the source file mapping.
  fs.writeFileSync(path.join(root,'package.json'),JSON.stringify({...pkg,...pkg.build.extraMetadata})+'\n');
  fs.symlinkSync(path.join(source,'node_modules'),path.join(root,'node_modules'),process.platform==='win32'?'junction':'dir');
  // No test window is shown or focused. Product renderer/CSP stay unchanged.
  const main=path.join(root,'main.js');fs.writeFileSync(main,"require('electron').app.on('browser-window-created',(_event,window)=>{window.show=()=>{};window.focus=()=>{};});\n"+fs.readFileSync(main,'utf8'));
  return {directory,root,profile};
}
async function open({source=path.resolve(__dirname,'../..'),prepared,config,allowNetwork=false,interceptSaveDialog=false,executable:providedExecutable}={}){
  const workspace=prepared||prepare(source);if(config)fs.writeFileSync(path.join(workspace.profile,'config.json'),JSON.stringify(config));
  if(interceptSaveDialog){const main=path.join(workspace.root,'main.js');fs.writeFileSync(main,`require('electron').dialog.showSaveDialog=async()=>({canceled:false,filePath:${JSON.stringify(path.join(workspace.profile,'export.pdf'))}});\n`+fs.readFileSync(main,'utf8'));}
  const executable=providedExecutable||require(path.join(source,'node_modules/electron'));
  const child=spawn(executable,[...(providedExecutable?[]:[workspace.root]),'--user-data-dir='+workspace.profile,'--remote-debugging-port=0','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows'],{stdio:['ignore','ignore','pipe'],windowsHide:true,env:{...process.env,SQLPG_ISOLATED:'1',SQLPG_NO_RECOVER:'1'}});
  let diagnostic='',socket,id=0;child.stderr.on('data',data=>{if(diagnostic.length<12000)diagnostic+=data.toString();});const pending=new Map(),events=[];
  const close=()=>{socket?.close();if(child.pid)spawnSync('taskkill',['/PID',String(child.pid),'/T','/F'],{stdio:'ignore',windowsHide:true});};
  try{
    let target;
    for(let i=0;i<200;i++){try{const port=Number(fs.readFileSync(path.join(workspace.profile,'DevToolsActivePort'),'utf8').split('\n')[0]);target=(await(await fetch('http://127.0.0.1:'+port+'/json/list')).json()).find(t=>t.url.includes('index.html'));}catch{}if(target)break;if(child.exitCode!==null)break;await wait(100);}
    if(!target)throw Error('Hidden disposable renderer did not open. '+diagnostic.slice(-1800));
    socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
    socket.onmessage=event=>{const m=JSON.parse(event.data);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id);}else events.push(m);};
    const send=(method,params={},timeout=30000)=>new Promise((resolve,reject)=>{const n=++id,timer=setTimeout(()=>{pending.delete(n);reject(Error(method+' timed out'));},timeout);pending.set(n,message=>{clearTimeout(timer);message.error?reject(Error(message.error.message)):resolve(message.result);});socket.send(JSON.stringify({id:n,method,params}));});
    const evaluate=async(expression,timeout)=>{const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,allowUnsafeEvalBlockedByCSP:false},timeout);if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;};
    await send('Runtime.enable');await send('Network.enable');if(!allowNetwork)await send('Network.setBlockedURLs',{urls:['http://*','https://*']});
    const shutdown=async()=>{try{await evaluate('setTimeout(()=>window.electronAPI.windowControl("close"),0);true');}catch{}for(let i=0;i<100&&child.exitCode===null;i++)await wait(50);close();};
    for(let i=0;i<200;i++){if(await evaluate('!!window.__pg&&typeof document.getElementById("btnGen").onclick==="function"'))return {...workspace,send,evaluate,events,close,shutdown,diagnostic:()=>diagnostic};await wait(100);}
    throw Error('Disposable application did not finish initialization. '+diagnostic.slice(-1800));
  }catch(error){close();throw error;}
}
module.exports={open,prepare,dispose,wait};
