'use strict';
function blocked(){return Object.assign(new Error('Signed updates are not configured for this build. A verified publisher is required.'),{code:'UPDATE_PUBLISHER_REQUIRED'});}
function publisherList(value){const list=typeof value==='string'?[value]:value;if(!Array.isArray(list)||!list.length||list.some(name=>typeof name!=='string'||!name.trim()))throw blocked();return [...new Set(list.map(name=>name.trim()))];}

// electron-updater normally skips Authenticode verification when publisherName
// is absent. Keep unsigned development builds usable, but never install an
// update on that implicit trust path.
function createVerifiedUpdater(updater){
  updater.autoInstallOnAppQuit=false;
  let initialization;
  async function initialize(){
    if(!initialization)initialization=(async()=>{
      let config;try{config=await updater.configOnDisk.value;}catch{throw blocked();}
      const expected=publisherList(config?.publisherName),verify=updater.verifyUpdateCodeSignature;
      if(typeof verify!=='function')throw blocked();
      updater.verifyUpdateCodeSignature=async(names,file)=>{
        const actual=publisherList(names);
        if(actual.length!==expected.length||actual.some(name=>!expected.includes(name)))throw blocked();
        return verify.call(updater,expected,file);
      };
    })();
    return initialization;
  }
  return {
    async check(){await initialize();return updater.checkForUpdates();},
    async install(){await initialize();return updater.quitAndInstall(false,true);}
  };
}
function createUpdaterForBuild(updater,{signedRelease=false}={}){
  // Installation requires the explicit install action, including after deferral.
  updater.autoInstallOnAppQuit=false;
  if(signedRelease)return createVerifiedUpdater(updater);
  // Unsigned builds use the same consent policy without claiming publisher trust.
  return {check:()=>updater.checkForUpdates(),install:()=>updater.quitAndInstall(false,true)};
}
module.exports={createVerifiedUpdater,createUpdaterForBuild,publisherList};
