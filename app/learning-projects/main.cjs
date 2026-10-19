const {createService}=require('./engine.cjs');
function setup({app,ipcMain,shell}){
 const service=createService();
 ipcMain.handle('project:catalogue',()=>service.catalogue());
 ipcMain.handle('project:import',(_event,bytes)=>service.importFile(bytes));
 ipcMain.handle('project:evaluate',(_event,payload)=>service.evaluate(payload));
 ipcMain.handle('project:source',async(_event,id)=>{const c=service.catalogue();if(id!==c.id)throw Error('PROJECT_UNKNOWN_SOURCE');await shell.openExternal(c.source);return true;});
 app.on('before-quit',()=>service.dispose());
}
module.exports={setup};
