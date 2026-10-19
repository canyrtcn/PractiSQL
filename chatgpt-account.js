// Credentials stay in the main process and use Windows DPAPI through safeStorage.
const path=require('node:path');
const {webcrypto}=require('node:crypto');
function setupChatGPT({app,ipcMain,shell,safeStorage}) {
  let client;
  const responses=new Map();
  const responseKey=(event,id)=>{
    if(typeof id!=='string'||!/^[a-zA-Z0-9-]{1,100}$/.test(id)||!Number.isSafeInteger(event.sender?.id))throw Error('Invalid response identity');
    return event.sender.id+':'+id;
  };
  function runtime(){
    if(client)return client;
    if(!globalThis.crypto)globalThis.crypto=webcrypto;
    const {createChatGPT}=require('./vendor/chatgpt-sdk.cjs');
    const available=()=>app.isReady() && safeStorage.isEncryptionAvailable();
    const requireEncryption=()=>{if(!available())throw Error('OS credential encryption is unavailable.');};
    client=createChatGPT({appName:'PractiSQL',appId:'practisql',redirectPort:0,sendHostId:true,
      storageDir:path.join(app.getPath('userData'),'chatgpt'),
      credentialEncryption:{id:'electron-safe-storage-v1',isAvailable:available,
        encrypt:s=>{requireEncryption();return safeStorage.encryptString(s);},
        decrypt:b=>{requireEncryption();return safeStorage.decryptString(Buffer.from(b));}},
      openBrowser:async url=>{const target=new URL(url);if(target.origin!=='https://auth.openai.com')throw Error('Unexpected sign-in destination.');await shell.openExternal(target.href);}
    });
    client.subscribe(session=>{for(const w of require('electron').BrowserWindow.getAllWindows())if(!w.isDestroyed())w.webContents.send('chatgpt:session',session);});
    return client;
  }
  const safe=(fn,withEvent=false)=>async(event,...args)=>{try{return {ok:true,value:await fn(...(withEvent?[event,...args]:args))};}catch(error){return {ok:false,error:{code:error.code || 'account_error',message:String(error.message || 'ChatGPT connection failed.').slice(0,400)}};}};
  ipcMain.handle('chatgpt:session',safe(()=>runtime().getSession()));
  ipcMain.handle('chatgpt:sign-in',safe(options=>{
    // A registration belongs to one account/workspace. New-account login must
    // not reuse the selected account's issued client ID or identity hints.
    if(options?.profileId!==undefined){
      if(typeof options.profileId!=='string'||!/^[a-zA-Z0-9-]{1,100}$/.test(options.profileId))throw Error('Invalid ChatGPT profile.');
      return runtime().signIn({profileId:options.profileId});
    }
    return runtime().signIn({newProfile:true});
  }));
  ipcMain.handle('chatgpt:profiles',safe(()=>runtime().listProfiles()));
  ipcMain.handle('chatgpt:select-profile',safe(id=>{
    if(typeof id!=='string'||!/^[a-zA-Z0-9-]{1,100}$/.test(id))throw Error('Invalid ChatGPT profile.');
    return runtime().selectProfile(id);
  }));
  ipcMain.handle('chatgpt:cancel-sign-in',()=>{client?.cancelSignIn();return true;});
  ipcMain.handle('chatgpt:disconnect',safe(()=>runtime().disconnect()));
  ipcMain.handle('chatgpt:models',safe(()=>runtime().listModels()));
  ipcMain.handle('chatgpt:cancel-response',safe((event,id)=>{
    const controller=responses.get(responseKey(event,id));
    if(!controller||controller.signal.aborted)return false;
    controller.abort(Object.assign(new Error('The response request was cancelled.'),{code:'cancelled'}));return true;
  },true));
  ipcMain.handle('chatgpt:response',safe(async(event,model,messages,options={})=>{
    if(typeof model!=='string'||!model||model.length>150||!Array.isArray(messages))throw Error('Invalid ChatGPT request.');
    if(messages.some(m=>!m||!['system','user','assistant','developer'].includes(m.role)||typeof m.content!=='string'||m.content.length>2_000_000))throw Error('Invalid ChatGPT messages.');
    if(JSON.stringify(messages).length>32*1024*1024)throw Error('ChatGPT request is too large.');
    if(!options||typeof options!=='object'||Array.isArray(options)||Object.keys(options).some(k=>!['details','tools','input','maxOutputTokens','requestId'].includes(k)))throw Error('Invalid response options');
    if(options.input&&(!Array.isArray(options.input)||JSON.stringify(options.input).length>32*1024*1024||options.input.some(m=>!m||typeof m!=='object'||!(['user','assistant','developer'].includes(m.role)||['reasoning','function_call','function_call_output'].includes(m.type)))))throw Error('Invalid continuation input');
    // Each request gets one application capability group. Project discovery has
    // four tools; the normal SQL conversation still exposes only its two readers.
    const toolGroups=[['read_context','inspect_database'],['search_project_datasets','describe_project_dataset','inspect_project_dataset','propose_project'],['read_project_evidence','submit_project_review']];
    if(options.tools&&(!Array.isArray(options.tools)||options.tools.length<1||options.tools.length>4||new Set(options.tools.map(t=>t?.name)).size!==options.tools.length||options.tools.some(t=>t?.type!=='function'||!t.parameters||t.parameters.type!=='object')||!toolGroups.some(group=>options.tools.every(t=>group.includes(t.name)))||JSON.stringify(options.tools).length>64000))throw Error('Invalid application tools');
    if(options.maxOutputTokens!==undefined&&(!Number.isSafeInteger(options.maxOutputTokens)||options.maxOutputTokens<1))throw Error('Invalid output limit');
    const instructions=messages.filter(m=>m.role==='system').map(m=>m.content).join('\n');
    const input=messages.filter(m=>m.role!=='system').map(m=>({role:m.role,content:m.content}));
    const key=options.requestId===undefined?null:responseKey(event,options.requestId);
    if(key&&responses.has(key))throw Error('Response request is already active');
    const controller=new AbortController();if(key)responses.set(key,controller);
    const timeout=setTimeout(()=>controller.abort(Object.assign(new Error('The response did not finish within ten minutes.'),{code:'ai_timeout'})),600000);
    const destroyed=()=>controller.abort(Object.assign(new Error('The window was closed.'),{code:'cancelled'}));
    event.sender?.once?.('destroyed',destroyed);
    try{
      const result=await runtime().streamResponse({model,input:options.input||input,instructions,signal:controller.signal,...(options.maxOutputTokens?{maxOutputTokens:options.maxOutputTokens}:{}),...(options.tools?{tools:options.tools}:{})});
      controller.signal.throwIfAborted();
      return options.details?result:result.text;
    }catch(error){if(controller.signal.aborted)throw controller.signal.reason;throw error;}
    finally{clearTimeout(timeout);event.sender?.removeListener?.('destroyed',destroyed);if(key)responses.delete(key);}
  },true));
  ipcMain.handle('chatgpt:usage',()=>shell.openExternal('https://chatgpt.com/settings/usage'));
}
module.exports={setupChatGPT};
