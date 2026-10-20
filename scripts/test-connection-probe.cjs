'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {open,prepare,dispose}=require('./test-support/electron-session.cjs');
const source=path.resolve(process.argv[2]||'.'),out=path.resolve(process.argv[3]||'artifacts/connection-probe.json');
const packaged=process.argv[4]?path.resolve(process.argv[4]):null;
assert(!fs.existsSync(out),'Preserve previous connection-test evidence');
const proof={at:new Date().toISOString(),status:'running',realModelCalls:0,personalDataUsed:false,visibleWindows:0,checks:[]};
const check=(ok,label)=>{assert(ok,label);proof.checks.push(label);};
const models={chat:'deepseek-v4.1-flash',messages:'qwen3.8-flash',responses:'gpt-6-luna'};
function response(transport,kind){
  if(kind==='unauthorized')return {status:401,body:{error:{message:'Invalid fixture credential'}}};
  if(kind==='limited')return {status:429,body:{error:{message:'Fixture rate limit'}}};
  if(kind==='invalid-json')return {status:200,raw:'{'};
  const truncated=kind==='truncated'||kind==='invalid-shape',empty=kind==='empty',filtered=kind==='filtered';
  let body;
  if(transport==='chat')body={choices:[{finish_reason:truncated?'length':filtered?'content_filter':'stop',message:{role:kind==='invalid-shape'?'user':'assistant',content:truncated||empty?null:'OK',...(truncated?{reasoning_content:'Fixture reasoning only'}:{})}}]};
  else if(transport==='messages')body={type:'message',role:kind==='invalid-shape'?'user':'assistant',stop_reason:truncated?'max_tokens':filtered?'pause_turn':'end_turn',content:truncated?[{type:'thinking',thinking:'Fixture reasoning only'}]:empty?[]:[{type:'text',text:'OK'}]};
  else body={status:truncated||filtered?'incomplete':'completed',...(truncated||filtered?{incomplete_details:{reason:filtered?'content_filter':'max_output_tokens'}}:{}),...(kind==='invalid-shape'?{}:{output:truncated?[{type:'reasoning',summary:[]}]:empty?[]:[{type:'message',role:'assistant',content:[{type:'output_text',text:'OK'}]}]})};
  return {status:200,body};
}
let app,workspace;
async function fixture(transport,kind){
  await app.evaluate('('+function(model,reply){
    const select=document.getElementById('aiModel');select.replaceChildren(new Option(model,model));select.value=model;window.__pg.setModel(model);
    window.__probeRequests=[];window.fetch=async(url,options={})=>{
      if(options.method!=='POST')return new Response(JSON.stringify({data:[{id:model,limit:{context:128000,output:16384}}]}),{status:200});
      const body=JSON.parse(options.body);window.__probeRequests.push({path:new URL(url).pathname,body,hasSession:!!options.headers['x-opencode-session']});
      return new Response(reply.raw??JSON.stringify(reply.body),{status:reply.status,headers:{'Content-Type':'application/json'}});
    };
  }+')('+JSON.stringify(models[transport])+','+JSON.stringify(response(transport,kind))+')');
}
(async()=>{try{
  for(const lang of ['en','tr']){
    workspace=prepare(source);
    let executable;
    if(packaged){
      const target=path.join(workspace.directory,'packaged');fs.cpSync(packaged,target,{recursive:true});
      workspace.root=path.join(target,'resources/app');executable=path.join(target,'PractiSQL.exe');
      proof.packagedVersion=JSON.parse(fs.readFileSync(path.join(workspace.root,'package.json'))).version;
      const entry=path.join(workspace.root,'main.js');fs.writeFileSync(entry,"require('electron').app.on('browser-window-created',(_event,window)=>{window.show=()=>{};window.focus=()=>{};});\n"+fs.readFileSync(entry,'utf8'));
    }
    const main=path.join(workspace.root,'main.js');fs.writeFileSync(main,fs.readFileSync(main,'utf8').replace('webPreferences: {','webPreferences: {offscreen:true,backgroundThrottling:false,'));
    app=await open({source,prepared:workspace,executable,config:{lang,provider:'opencode',baseUrl:'https://opencode.ai/zen/go/v1',apiKey:'fixture-not-a-real-key',model:models.chat,theme:'leaf',autoUpdate:false,onboarding:{completed:true,providerChoice:'later'},showMascot:false,tips:false,soundEnabled:false,welcomed:true}});
    for(const transport of Object.keys(models)){
      for(const kind of ['truncated','complete','unauthorized','limited','invalid-json','filtered','invalid-shape','empty']){
        await fixture(transport,kind);await app.evaluate('window.__pg.test()');
        const state=await app.evaluate('({ok:document.getElementById("aiDot").classList.contains("ok"),error:document.getElementById("aiDot").classList.contains("err"),message:document.getElementById("aiStatus").title,requests:window.__probeRequests})');
        const accepted=kind==='complete'||kind==='truncated';
        check(accepted?state.ok&&!state.error:state.error&&!state.ok,lang+'/'+transport+'/'+kind+': connection status matches authenticated provider response');
        check(state.requests.length===(kind==='empty'?2:1),lang+'/'+transport+'/'+kind+': bounded dispatch count');
        check(state.requests.every(r=>r.hasSession),lang+'/'+transport+'/'+kind+': stable conversation session header');
        if(accepted){
          const r=state.requests[0],limit=r.body.max_tokens??r.body.max_output_tokens;
          check(limit>=16&&limit<=128&&!r.body.tools,lang+'/'+transport+'/'+kind+': small probe with no database tools');
          check(r.body.model===models[transport]&&r.path.endsWith(transport==='chat'?'/chat/completions':transport==='messages'?'/messages':'/responses'),lang+'/'+transport+'/'+kind+': selected model and protocol retained');
          check(JSON.stringify(r.body).includes('Reply only with OK.'),lang+'/'+transport+'/'+kind+': probe contains no personal database or conversation');
        }
        if(kind==='unauthorized'||kind==='limited')check(state.message.includes(kind==='unauthorized'?'401':'429'),lang+'/'+transport+'/'+kind+': actual HTTP failure remains visible');
      }
      await fixture(transport,'truncated');
      const generation=await app.evaluate('(async()=>{try{await window.__pg.chat([{role:"user",content:"Explain SELECT."}]);return {rejected:false};}catch(error){return {rejected:true,message:error.message,requests:window.__probeRequests.length};}})()');
      check(generation.rejected&&generation.message.includes(lang==='tr'?'yarım bıraktı':'mid-output')&&generation.requests===1,lang+'/'+transport+': ordinary truncated answers are still rejected');
    }
    await app.shutdown();app=null;dispose(workspace.directory);workspace=null;
  }
  proof.status='passed';
}catch(error){proof.status='failed';proof.error=error.stack;process.exitCode=1;}
finally{if(app)await app.shutdown();if(workspace)dispose(workspace.directory);fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({status:proof.status,checks:proof.checks.length,realModelCalls:proof.realModelCalls,error:proof.error}));}
})();
