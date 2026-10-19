'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events');
const {createWindowInterface}=require('../window-interface.cjs');
const {initialZoomFactor,interfaceScales}=require('../renderer/window-layout.js');
const wait=()=>new Promise(resolve=>setTimeout(resolve,110));
function fixture(config={},display={bounds:{width:1920,height:1080},scaleFactor:1}){
  const screen=new EventEmitter();let primary=display,stored=structuredClone(config),zoom=initialZoomFactor(display.bounds,display.scaleFactor,config.uiScale),fail=false;
  screen.getPrimaryDisplay=()=>primary;
  screen.getDisplayNearestPoint=()=>{throw Error('Must use the Windows primary display');};
  const webContents=Object.assign(new EventEmitter(),{isDestroyed:()=>false,getZoomFactor:()=>zoom,setZoomFactor:value=>{zoom=value;},send:(channel,state)=>messages.push({channel,state})});
  const window=Object.assign(new EventEmitter(),{webContents,isDestroyed:()=>false,setBounds:()=>{throw Error('Scaling cannot change window bounds');},hide:()=>{throw Error('Scaling cannot hide panels');}}),messages=[];
  const controller=createWindowInterface({screen,readConfig:()=>structuredClone(stored),writeConfig:value=>{if(fail)throw Error('Simulated full disk');stored=structuredClone(value);}});
  controller.attach(window);
  return {controller,window,screen,messages,get stored(){return stored;},get zoom(){return zoom;},set display(value){primary=value;},set failWrite(value){fail=value;}};
}
test('Automatic keeps the approved HD adjustment and all manual choices override it',()=>{
  for(const dpi of [1,1.25,1.5,2])for(const width of [1360,1366]){
    const display={width:width/dpi,height:768/dpi};
    assert.equal(initialZoomFactor(display,dpi,'auto'),.9);
    for(const value of interfaceScales)assert.equal(initialZoomFactor(display,dpi,value),value);
  }
  for(const bounds of [{width:1920,height:1080},{width:2000,height:1200},{width:1600,height:1200},{width:1080,height:1440}])assert.equal(initialZoomFactor(bounds,1,'auto'),1);
});
test('Every setting persists independently without altering profile, provider or database preferences',()=>{
  const original={profile:{name:'Scale test'},stats:{xp:985},provider:'openai',apiKey:'disposable-test-secret',provState:{openai:{model:'test-model'}},activeDb:'local',theme:'leaf',projects:{items:[]}};
  const f=fixture(original);
  for(const value of [...interfaceScales,'auto']){
    const result=f.controller.setScale(value);
    assert.equal(result.preference,value);assert.equal(f.zoom,value==='auto'?1:value);
    assert.deepEqual(f.stored,{...original,uiScale:value});
    assert.equal(f.messages.at(-1).channel,'window:interface');
    assert.deepEqual(Object.keys(f.messages.at(-1).state).sort(),['automaticZoomFactor','preference','zoomFactor']);
  }
  f.window.emit('closed');
});
test('Saved choices apply again on renderer reload and invalid stored choices safely fall back',()=>{
  for(const value of [...interfaceScales,'auto',undefined,0,-1,100,NaN,Infinity,'1.25',{},null]){
    const f=fixture({uiScale:value});f.window.webContents.setZoomFactor(2);f.window.webContents.emit('did-finish-load');
    const expected=interfaceScales.includes(value)?value:1;
    assert.equal(f.zoom,expected);assert.equal(f.controller.state().preference,interfaceScales.includes(value)?value:'auto');
    f.window.emit('closed');
  }
});
test('Invalid IPC choices cannot change the current zoom or persisted settings',()=>{
  const f=fixture({uiScale:1.1});
  for(const value of [undefined,null,'1','1.1','',0,-1,2,Infinity,NaN,{},[],true])assert.throws(()=>f.controller.setScale(value),/INVALID_INTERFACE_SCALE/);
  assert.equal(f.zoom,1.1);assert.deepEqual(f.stored,{uiScale:1.1});f.window.emit('closed');
});
test('A failed durable write restores the previous native zoom and saved setting',()=>{
  const f=fixture({uiScale:1.25,profile:{name:'Keep me'}});f.failWrite=true;
  assert.throws(()=>f.controller.setScale(.8),/full disk/);
  assert.equal(f.zoom,1.25);assert.deepEqual(f.stored,{uiScale:1.25,profile:{name:'Keep me'}});
  assert.equal(f.messages.at(-1).state.preference,1.25);f.window.emit('closed');
});
test('Primary display and DPI changes recalculate automatic scale but preserve a manual override',async()=>{
  const f=fixture();
  f.display={bounds:{x:-1500,width:1366/1.25,height:768/1.25},scaleFactor:1.25};f.screen.emit('display-metrics-changed');await wait();
  assert.equal(f.zoom,.9);
  f.controller.setScale(1.1);f.display={bounds:{width:3840/2,height:2160/2},scaleFactor:2};f.screen.emit('display-removed');await wait();
  assert.equal(f.zoom,1.1);assert.equal(f.controller.state().automaticZoomFactor,1);
  f.controller.setScale('auto');assert.equal(f.zoom,1);
  f.window.emit('closed');
});
test('Ctrl+0 is a persistent recovery shortcut; unrelated shortcuts do not reset the setting',()=>{
  const f=fixture({uiScale:1.5});let prevented=false;
  const event={preventDefault:()=>{prevented=true;}};
  for(const input of [{type:'keyUp',control:true,key:'0'},{type:'keyDown',key:'0'},{type:'keyDown',control:true,alt:true,key:'0'},{type:'keyDown',control:true,shift:true,key:'0'}])f.window.webContents.emit('before-input-event',event,input);
  assert.equal(f.zoom,1.5);assert.equal(prevented,false);
  f.window.webContents.emit('before-input-event',event,{type:'keyDown',control:true,key:'0'});
  assert(prevented);assert.equal(f.zoom,1);assert.equal(f.stored.uiScale,'auto');f.window.emit('closed');
});
test('Closing the window clears display subscriptions and pending recalculations',async()=>{
  const f=fixture();f.screen.emit('display-added');f.window.emit('closed');
  for(const event of ['display-added','display-removed','display-metrics-changed'])assert.equal(f.screen.listenerCount(event),0);
  await wait();assert.equal(f.messages.length,0);
});
