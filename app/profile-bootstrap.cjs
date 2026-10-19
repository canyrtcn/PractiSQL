// An upgrade of any existing profile must never trigger first-run onboarding.
const fs=require('node:fs'),path=require('node:path');
function hasExistingProfile(directory){
 if(fs.existsSync(path.join(directory,'config.json')))return true;
 for(const name of ['sql-databases','databases'])try{if(fs.readdirSync(path.join(directory,name)).some(file=>/\.sqlite$/i.test(file)))return true;}catch{}
 return false;
}
function onboardingState(config,existing){
 if(config.onboarding&&typeof config.onboarding.completed==='boolean')return config;
 return {...config,onboarding:{version:1,completed:existing}};
}
module.exports={hasExistingProfile,onboardingState};
