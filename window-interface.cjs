'use strict';
const {initialZoomFactor,normalizeInterfaceScale,interfaceScales}=require('./renderer/window-layout.js');

// Application zoom never changes the native window rectangle or panel visibility.
function createWindowInterface({screen,readConfig,writeConfig}) {
  let target=null,preference='auto',timer=null,lastState='';
  function state() {
    const display=screen.getPrimaryDisplay(),automaticZoomFactor=initialZoomFactor(display.bounds,display.scaleFactor);
    return {preference,automaticZoomFactor,zoomFactor:preference==='auto'?automaticZoomFactor:preference};
  }
  function publish(force=false) {
    if(!target||target.isDestroyed()||target.webContents.isDestroyed())return null;
    const next=state();
    if(Math.abs(target.webContents.getZoomFactor()-next.zoomFactor)>.001)target.webContents.setZoomFactor(next.zoomFactor);
    const key=JSON.stringify(next);
    if(force||key!==lastState){lastState=key;target.webContents.send('window:interface',next);}
    return next;
  }
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(()=>publish(),80);};
  function setScale(value) {
    if(value!=='auto'&&!(typeof value==='number'&&interfaceScales.includes(value)))throw new TypeError('INVALID_INTERFACE_SCALE');
    if(!target||target.isDestroyed())throw new Error('WINDOW_UNAVAILABLE');
    const config=readConfig()||{},oldPreference=preference,oldZoom=target.webContents.getZoomFactor();
    const display=screen.getPrimaryDisplay(),nextZoom=initialZoomFactor(display.bounds,display.scaleFactor,value);
    target.webContents.setZoomFactor(nextZoom);
    try{writeConfig({...config,uiScale:value});preference=value;}
    catch(error){preference=oldPreference;target.webContents.setZoomFactor(oldZoom);publish(true);throw error;}
    return publish(true);
  }
  function attach(window) {
    target=window;preference=normalizeInterfaceScale(readConfig()?.uiScale);lastState='';
    window.webContents.on('did-finish-load',()=>publish(true));
    window.webContents.on('before-input-event',(event,input)=>{
      if(input.type==='keyDown'&&input.control&&!input.alt&&!input.shift&&(input.key==='0'||input.code==='Numpad0')){
        event.preventDefault();try{setScale('auto');}catch{}
      }
    });
    const events=['display-added','display-removed','display-metrics-changed'];
    for(const event of events)screen.on(event,schedule);
    window.once('closed',()=>{clearTimeout(timer);for(const event of events)screen.removeListener(event,schedule);if(target===window)target=null;});
  }
  return {attach,state,setScale};
}
module.exports={createWindowInterface};
