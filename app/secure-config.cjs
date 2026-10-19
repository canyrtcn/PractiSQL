'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const VAULT='_practisqlCredentials';
const own=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
function failure(code,message){return Object.assign(new Error(message),{code});}

// Only persisted API keys change representation. The renderer receives the
// original settings shape, so provider requests and conversation context stay intact.
function createConfigStore({file,safeStorage}){
  let trustedStamp,lastSecretText,lastVault;
  function stamp(){try{const s=fs.statSync(file,{bigint:true});return [s.dev,s.ino,s.size,s.mtimeNs,s.ctimeNs].join(':');}catch(error){if(error.code==='ENOENT')return null;throw error;}}
  function available(){
    if(!safeStorage?.isEncryptionAvailable())throw failure('CREDENTIAL_STORAGE_UNAVAILABLE','OS credential protection is unavailable; saved keys were not changed.');
  }
  function split(settings){
    if(!object(settings))throw failure('CONFIG_INVALID','Invalid application settings.');
    const clean={...settings},secrets={providers:Object.create(null)};
    if(object(settings.provState))clean.provState={...settings.provState};
    delete clean[VAULT];
    if(own(clean,'apiKey')){
      if(typeof clean.apiKey==='string'&&clean.apiKey){secrets.apiKey=clean.apiKey;clean.apiKey='';}
    }
    if(object(clean.provState))for(const [id,state]of Object.entries(clean.provState)){
      if(object(state)&&typeof state.apiKey==='string'&&state.apiKey){secrets.providers[id]=state.apiKey;Object.defineProperty(clean.provState,id,{value:{...state,apiKey:''},writable:true,enumerable:true,configurable:true});}
    }
    return {clean,secrets,hasSecrets:!!secrets.apiKey||Object.keys(secrets.providers).length>0};
  }
  function raw(){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch(error){if(error.code==='ENOENT')return null;throw failure('CONFIG_READ_FAILED','Application settings could not be read; the original file was not changed.');}}
  function unpack(value){
    if(!object(value))throw failure('CONFIG_INVALID','Invalid application settings.');
    const settings={...value},vault=settings[VAULT];delete settings[VAULT];
    if(object(value.provState))settings.provState={...value.provState};
    if(vault!==undefined){
      available();
      if(!object(vault)||vault.version!==1||typeof vault.ciphertext!=='string'||!vault.ciphertext||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(vault.ciphertext))throw failure('CREDENTIAL_STORAGE_INVALID','Saved credential protection data is invalid; it was not changed.');
      let secrets;
      try{secrets=JSON.parse(safeStorage.decryptString(Buffer.from(vault.ciphertext,'base64')));}catch{throw failure('CREDENTIAL_STORAGE_LOCKED','Saved credentials could not be unlocked; they were not changed.');}
      if(!object(secrets)||!object(secrets.providers)||Object.values(secrets.providers).some(key=>typeof key!=='string')||(own(secrets,'apiKey')&&typeof secrets.apiKey!=='string'))throw failure('CREDENTIAL_STORAGE_INVALID','Saved credential protection data is invalid; it was not changed.');
      if(secrets.apiKey&&!settings.apiKey)settings.apiKey=secrets.apiKey;
      for(const [id,key]of Object.entries(secrets.providers)){
        if(!object(settings.provState))settings.provState={};
        // Define an own property, including for unusual imported provider names.
        let state=own(settings.provState,id)&&object(settings.provState[id])?settings.provState[id]:{};
        if(!state.apiKey)state={...state,apiKey:key};
        Object.defineProperty(settings.provState,id,{value:state,writable:true,enumerable:true,configurable:true});
      }
      lastSecretText=JSON.stringify(split(settings).secrets);lastVault=vault;
    }
    return settings;
  }
  function protectedValue(settings){
    const {clean,secrets,hasSecrets}=split(settings);
    if(hasSecrets){const text=JSON.stringify(secrets);if(text===lastSecretText&&lastVault)clean[VAULT]=lastVault;else{available();let encrypted;try{encrypted=safeStorage.encryptString(text);}catch{throw failure('CREDENTIAL_STORAGE_UNAVAILABLE','Credentials could not be protected; saved settings were not changed.');}clean[VAULT]={version:1,ciphertext:Buffer.from(encrypted).toString('base64')};lastSecretText=text;lastVault=clean[VAULT];}}
    return clean;
  }
  function atomicWrite(value){
    fs.mkdirSync(path.dirname(file),{recursive:true});
    const temporary=file+'.'+randomUUID()+'.tmp';
    try{fs.writeFileSync(temporary,JSON.stringify(value,null,2),'utf8');fs.renameSync(temporary,file);trustedStamp=stamp();}finally{try{fs.rmSync(temporary,{force:true});}catch{}}
  }
  return {
    read(){
      const value=raw();if(value===null)return null;
      const settings=unpack(value);
      // Migrate before returning a legacy key; failure leaves the old file intact.
      if(split(value).hasSecrets)atomicWrite(protectedValue(settings));
      else trustedStamp=stamp();
      return settings;
    },
    write(settings){
      const currentStamp=stamp(),previous=currentStamp===trustedStamp?null:raw();
      // A failed unlock must never turn a later autosave into key deletion.
      if(previous!==null){unpack(previous);if(split(previous).hasSecrets)available();}
      const value=protectedValue(settings);atomicWrite(value);return true;
    }
  };
}
module.exports={createConfigStore};
