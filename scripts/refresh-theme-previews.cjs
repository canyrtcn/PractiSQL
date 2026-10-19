'use strict';
// Capture packaged UI with a synthetic empty profile; never capture a user's app.
const path=require('node:path'),fs=require('node:fs');
const {open,dispose,wait}=require('./test-support/electron-session.cjs');
const source=path.resolve(__dirname,'..');
(async()=>{for(const lang of ['en','tr'])for(const theme of ['light','leaf','dark']){
  let app;
  try{
    app=await open({source,config:{lang,theme,apiKey:'',tips:false,soundEnabled:false,welcomed:true,showMascot:true,onboarding:{completed:true,providerChoice:'later'}}});
    await app.send('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
    for(let i=0;i<150&&!await app.evaluate('window.__startupSplash?.phase==="hidden"');i++)await wait(60);
    await app.evaluate('document.fonts.ready');
    await app.evaluate('window.PractiMascotMotion?.stop();window.__pg.roaming.target({x:850,y:10000,tx:850,ty:10000,stopped:true});');
    await wait(900);
    const actual=await app.evaluate('document.getElementById("ver").textContent');
    if(actual!=='v'+JSON.parse(fs.readFileSync(path.join(source,'package.json'))).version)throw Error('Preview source version mismatch');
    const image=await app.send('Page.captureScreenshot',{format:'png'}),file=path.join(source,'renderer/assets/theme-previews',lang+'-'+theme+'.png');
    fs.writeFileSync(file,Buffer.from(image.data,'base64'));console.log(lang+' '+theme+' '+actual);
  }finally{await app?.shutdown();if(app)dispose(app.directory);}
}})().catch(error=>{console.error(error.message);process.exitCode=1;});
