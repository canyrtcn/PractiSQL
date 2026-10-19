'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {open,prepare,dispose}=require('./test-support/electron-session.cjs');
const root=path.resolve(__dirname,'..');let app,workspace;
(async()=>{try{
 workspace=prepare(root);const main=path.join(workspace.root,'main.js');fs.writeFileSync(main,fs.readFileSync(main,'utf8').replace('webPreferences: {','webPreferences: {offscreen:true,backgroundThrottling:false,'));
 app=await open({source:root,prepared:workspace,config:{lang:'en',theme:'light',showMascot:false,tips:false,soundEnabled:false,welcomed:true,autoUpdate:false,onboarding:{completed:true,providerChoice:'later'}}});
 const boxes=await app.evaluate('(()=>{const result={};for(const avatar of window.PractiProfile.catalog){const svg=new DOMParser().parseFromString(decodeURIComponent(avatar.src.split(",").slice(1).join(",")),"image/svg+xml").documentElement;svg.style.cssText="position:fixed;left:-1000px;top:0;width:104px;height:104px;pointer-events:none";document.body.appendChild(svg);const box=svg.querySelector(".avatar-art").getBBox();result[avatar.id]=[box.x,box.y,box.width,box.height].map(value=>Math.round(value*1000)/1000);svg.remove();}return result;})()');
 assert.equal(Object.keys(boxes).length,48);for(const box of Object.values(boxes))assert(box.every(Number.isFinite)&&box[2]>0&&box[3]>0);
 fs.writeFileSync(path.join(root,'app/renderer/avatar-layout.js'),'/* Foreground geometry is generated from the native SVG paths. */\nwindow.PractiAvatarFrames=Object.freeze('+JSON.stringify(boxes,null,2)+');\n');console.log(JSON.stringify({status:'generated',avatars:Object.keys(boxes).length,visibleWindows:0,rasterImagesCreated:0}));
}finally{await app?.shutdown();if(workspace)dispose(workspace.directory);}})().catch(error=>{console.error(error.stack);process.exitCode=1;});
