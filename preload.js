// Context-isolated renderer bridge for supported application operations.
const { contextBridge, ipcRenderer } = require('electron');

// Prepare inert HTML before sending it to the script-disabled print window.
function preparePdfHtml(html) {
  const document = new DOMParser().parseFromString(String(html || ''),'text/html');
  const style = document.createElement('style');
  style.textContent = '@media print { pre { break-inside:auto; orphans:3; widows:3 } thead { display:table-header-group; break-inside:avoid } tr { break-inside:avoid } }';
  document.head.appendChild(style);
  for (const table of document.querySelectorAll('table')) {
    if (table.tHead) continue;
    const rows = Array.from(table.rows), headers = [];
    for (const row of rows) {
      if (!row.cells.length || Array.from(row.cells).some(cell => cell.tagName !== 'TH' || ['row','rowgroup'].includes(cell.scope))) break;
      headers.push(row);
    }
    // Only explicit leading column headers move. Do not infer titles from data
    // cells, all-header matrices, or row spans crossing into the data group.
    if (!headers.length || headers.length === rows.length || headers.some((row,i) => Array.from(row.cells).some(cell => cell.rowSpan === 0 || cell.rowSpan > headers.length-i))) continue;
    const head = table.createTHead();
    for (const row of headers) head.appendChild(row);
  }
  return '<!doctype html>\n'+document.documentElement.outerHTML;
}

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  projectExploreAvailable: () => ipcRenderer.invoke('project-explore:available'),
  projectExplore: (operation,input) => ipcRenderer.invoke('project-explore:invoke',operation,input),
  inspectCurrentData: input => ipcRenderer.invoke('ai:inspect-current-data',input),
  hasProjects: () => ipcRenderer.invoke('project:available'),
  projectCatalogue: () => ipcRenderer.invoke('project:catalogue'),
  openProjectSource: id => ipcRenderer.invoke('project:source',id),
  importProjectFile: bytes => ipcRenderer.invoke('project:import',bytes),
  evaluateProject: payload => ipcRenderer.invoke('project:evaluate',payload),
  importRemoteDatabase: config => ipcRenderer.invoke('transfer:remote',config),
  saveExport: payload => ipcRenderer.invoke('transfer:save',payload),
  aiWaitForSlot: provider => ipcRenderer.invoke('ai:wait-for-slot', provider),
  diagnoseWrite: (database,sql,connection) => ipcRenderer.invoke('sql:write-evidence',database,sql,connection),
  seedEvidence: database => ipcRenderer.invoke('sql:seed-evidence',database),
  executeRead: (database,sql,limit,connection) => ipcRenderer.invoke('sql:read',database,sql,limit,connection),
  saveOperationResults: record => ipcRenderer.invoke('ai:result-save',record),
  readOperationResults: (reference,offset,characters) => ipcRenderer.invoke('ai:result-read',reference,offset,characters),
  chatgptSession: () => ipcRenderer.invoke('chatgpt:session'),
  chatgptSignIn: options => ipcRenderer.invoke('chatgpt:sign-in',options),
  chatgptProfiles: () => ipcRenderer.invoke('chatgpt:profiles'),
  chatgptSelectProfile: id => ipcRenderer.invoke('chatgpt:select-profile',id),
  chatgptCancelSignIn: () => ipcRenderer.invoke('chatgpt:cancel-sign-in'),
  chatgptDisconnect: () => ipcRenderer.invoke('chatgpt:disconnect'),
  chatgptModels: () => ipcRenderer.invoke('chatgpt:models'),
  chatgptResponse: (model,messages,options) => ipcRenderer.invoke('chatgpt:response',model,messages,options),
  chatgptCancelResponse: id => ipcRenderer.invoke('chatgpt:cancel-response',id),
  chatgptUsage: () => ipcRenderer.invoke('chatgpt:usage'),
  onChatgptSession: fn => ipcRenderer.on('chatgpt:session',(_e,s)=>fn(s)),
  // wasm main process'ten gelir (sandbox'lı preload'da fs yok)
  getWasmBinary: () => ipcRenderer.invoke('app:get-wasm'),
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (cfg) => ipcRenderer.invoke('config:set', cfg),
  listDbs: () => ipcRenderer.invoke('db:list'),
  saveDb: (name, u8arr) => ipcRenderer.invoke('db:save', name, Array.from(u8arr)),
  loadDb: (name) => ipcRenderer.invoke('db:load', name),
  deleteDb: (name) => ipcRenderer.invoke('db:delete', name),
  renameDb: (oldName, newName) => ipcRenderer.invoke('db:rename', oldName, newName),
  getVersion: () => ipcRenderer.invoke('app:version'),
  startupPainted: () => ipcRenderer.invoke('window:startup-painted'),
  restartApp: () => ipcRenderer.invoke('app:restart'),
  recoverBackups: () => ipcRenderer.invoke('db:recover'),
  openDbDir: () => ipcRenderer.invoke('app:open-db-dir'),
  exportPdf: (html, name) => ipcRenderer.invoke('notes:export', preparePdfHtml(html), name),
  windowControl: (action) => ipcRenderer.invoke('window:control', action),
  windowState: () => ipcRenderer.invoke('window:state'),
  interfaceState: () => ipcRenderer.invoke('window:interface-get'),
  setInterfaceScale: value => ipcRenderer.invoke('window:interface-set', value),
  onInterfaceState: fn => { const listener=(_e,state)=>fn(state);ipcRenderer.on('window:interface',listener);return ()=>ipcRenderer.removeListener('window:interface',listener); },
  onWinState: (fn) => ipcRenderer.on('win:state', (_e, s) => fn(s)),
  updCheck: () => ipcRenderer.invoke('upd:check'),
  updInstall: () => ipcRenderer.invoke('upd:install'),
  openUrl: (url) => ipcRenderer.invoke('app:open-url', url),
  onUpd: (fn) => ipcRenderer.on('upd:status', (_e, s) => fn(s))
});
