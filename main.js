// Electron main process: windows, privileged operations, and local persistence.
const { app, BrowserWindow, ipcMain, shell, dialog, safeStorage, screen } = require('electron');
const {initialWindowBounds,initialZoomFactor}=require('./renderer/window-layout.js');
require('./database-transfer.cjs').setup({ipcMain,dialog,win:()=>BrowserWindow.getFocusedWindow()});
const path = require('path');
const fs = require('fs');
const {createConfigStore}=require('./secure-config.cjs');
const {createUpdaterForBuild}=require('./verified-updater.cjs');
const databaseStore=require('./database-store.cjs');
const resultStore=()=>require('./operation-result-store.cjs').createResultStore(path.join(app.getPath('userData'),'ai-operation-results'));
ipcMain.handle('ai:result-save',(_event,record)=>resultStore().save(record));
ipcMain.handle('ai:result-read',(_event,reference,offset,characters)=>resultStore().read(reference,offset,characters));
const projectModulePath=path.join(__dirname,'learning-projects/main.cjs');
const projectModuleAvailable=fs.existsSync(projectModulePath);
if(projectModuleAvailable)require('./learning-projects/main.cjs').setup({app,ipcMain,shell});
ipcMain.handle('project:available',()=>projectModuleAvailable);
const projectExploreAvailable=fs.existsSync(path.join(__dirname,'learning-projects/discovery/project-ipc.cjs'));
ipcMain.handle('project-explore:available',()=>projectExploreAvailable);
if(projectExploreAvailable)require('./learning-projects/discovery/project-ipc.cjs').setup({app,ipcMain,shell,rendererFile:path.join(__dirname,'renderer/index.html')});
const { printStudyPdf } = require('./pdf-print');
const waitForAiSlot = require('./ai-rate-limit').createProviderGate();
require('./database-inspection/ipc.cjs').setup({ipcMain,app});
const readRunner=require('./sql-read-runner.cjs').createReadRunner();
ipcMain.handle('sql:read',(_event,database,sql,limit,connection)=>readRunner.execute(database,sql,limit,connection));
const writeEvidenceRunner=require('./sql-write-evidence-runner.cjs').createEvidenceRunner();
ipcMain.handle('sql:write-evidence',(_event,database,sql,connection)=>writeEvidenceRunner.execute(database,sql,{connection}));
const seedEvidenceRunner=require('./sql-seed-evidence-runner.cjs').createSeedRunner();
ipcMain.handle('sql:seed-evidence',(_event,database)=>seedEvidenceRunner.collect(database));
app.on('before-quit',()=>{readRunner.dispose();writeEvidenceRunner.dispose();seedEvidenceRunner.dispose();});
ipcMain.handle('ai:wait-for-slot', (_event, provider) => waitForAiSlot(provider));
require('./chatgpt-account').setupChatGPT({app,ipcMain,shell,safeStorage});

let win = null;

// ikinci tıklama yeni pencere açmasın — yoksa iki ayrı bellek
// aynı config.json'u sırayla yazıp birbirinin mesajını ezer (kaybolan cevap vakası).
// İkinci çalıştırma mevcut pencereyi öne getirir.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); }
else {
  app.on('second-instance', () => {
    try {
      const w = win;
      if (w && !w.isDestroyed()) { if (w.isMinimized()) w.restore(); if(w._startupShown){w.show();w.focus();}else void revealStartupWindow(w); }
    } catch {}
  });
}

function dbDir() {
  return databaseStore.directory(app.getPath('userData'));
}
function backupDir() {
  if (process.env.SQLPG_ISOLATED) {
    const d = path.join(app.getPath('userData'), 'backups');
    fs.mkdirSync(d, { recursive: true });
    return d;
  }
  const d = path.join(app.getPath('appData'), 'sql-playground-backup');
  fs.mkdirSync(d, { recursive: true });
  return d;
}
function configPath() {
  return path.join(app.getPath('userData'), 'config.json');
}
// main-process mesajları da arayüz diline uyar (config yoksa İngilizce).
function uiLang() {
  try {
    const c = JSON.parse(fs.readFileSync(configPath(), 'utf8'));
    return c.lang === 'tr' ? 'tr' : 'en';
  } catch { return 'en'; }
}
const MAIN_MSG = {
  tr: { emptyName: 'ad boş', sysArea: 'sistem alanı', noRecord: 'kayıt yok', nameTaken: 'bu ad zaten var: ', untitled: 'adsiz', pdfTitle: 'Özet PDF kaydet', noteName: 'calisma-notu' },
  en: { emptyName: 'name is empty', sysArea: 'system area', noRecord: 'no such record', nameTaken: 'name already taken: ', untitled: 'untitled', pdfTitle: 'Save Summary PDF', noteName: 'study-note' }
};
function M(k) { return (MAIN_MSG[uiLang()] || MAIN_MSG.en)[k]; }
// GitHub Releases üzerinden otomatik güncelleme. Veri userData'da
// durur, updater yalnız uygulama dosyalarına dokunur — veri kaybı olmaz.
function updEnabled() {
  try {
    const c = JSON.parse(fs.readFileSync(configPath(), 'utf8'));
    return c.autoUpdate !== false;
  } catch { return true; }
}
function setupAutoUpdate() {
  try {
    if (process.env.SQLPG_ISOLATED) return;
    const { autoUpdater } = require('electron-updater');
    const verified=app.isPackaged?createUpdaterForBuild(autoUpdater,{signedRelease:require('./package.json').practisqlSignedRelease===true}):null;
    const send = (ch, d) => { try { if (win && !win.isDestroyed()) win.webContents.send(ch, d); } catch {} };
    const updateError=error=>send('upd:status',{st:'error',code:error.code||'UPDATE_FAILED',msg:String(error.message||'Update failed.').slice(0,160)});
    ipcMain.handle('upd:check', async () => { try { if(!verified)return false;await verified.check(); return true; } catch(error) { updateError(error);return false; } });
    ipcMain.handle('upd:install', async () => { try{if(!verified)return false;await verified.install();return true;}catch(error){updateError(error);return false;} });
    if (!app.isPackaged) return;
    autoUpdater.autoDownload = true;
    autoUpdater.on('checking-for-update', () => send('upd:status', { st: 'checking' }));
    autoUpdater.on('update-available', (i) => send('upd:status', { st: 'available', ver: (i && i.version) || '' }));
    autoUpdater.on('update-not-available', () => send('upd:status', { st: 'none' }));
    autoUpdater.on('download-progress', (p) => send('upd:status', { st: 'downloading', pct: Math.round((p && p.percent) || 0) }));
    autoUpdater.on('update-downloaded', (i) => send('upd:status', { st: 'ready', ver: (i && i.version) || '' }));
    autoUpdater.on('error', (e) => send('upd:status', { st: 'error', msg: String((e && e.message) || e).slice(0, 160) }));
    if (updEnabled()) setTimeout(() => { verified.check().catch(updateError); }, 6000);
  } catch {}
}
// sql-playground → practisql. Yeni profil boşsa eski veriyi taşı (veri kaybı yok).
function migrateLegacyUserData() {
  try {
    if (process.env.SQLPG_ISOLATED) return; // izole test: gerçek profili okuma
    const cur = app.getPath('userData');
    const old = path.join(app.getPath('appData'), 'sql-playground');
    if (path.resolve(cur) === path.resolve(old)) return;
    const curCfg = path.join(cur, 'config.json');
    if (fs.existsSync(curCfg)) return;
    const oldCfg = path.join(old, 'config.json');
    if (!fs.existsSync(oldCfg)) return;
    fs.mkdirSync(cur, { recursive: true });
    fs.copyFileSync(oldCfg, curCfg);
    const oldDb = path.join(old, 'databases'), curDb = path.join(cur, 'databases');
    if (fs.existsSync(oldDb)) {
      fs.mkdirSync(curDb, { recursive: true });
      for (const f of fs.readdirSync(oldDb)) {
        if (/\.sqlite$/i.test(f)) {
          const dst = path.join(curDb, f);
          if (!fs.existsSync(dst)) fs.copyFileSync(path.join(oldDb, f), dst);
        }
      }
    }
  } catch {}
}
migrateLegacyUserData();
// Electron 32+ removes userData/databases as obsolete WebSQL storage. Copy and
// verify native files before Chromium starts; failures prevent that startup.
if(gotLock)databaseStore.migrateLegacy(app.getPath('userData'));
const profileBootstrap=require('./profile-bootstrap.cjs');
// Capture before startup autosaves create files in a brand-new profile.
const existingUserProfile=profileBootstrap.hasExistingProfile(app.getPath('userData'));
function safeName(n) {
  return String(n || '').replace(/[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ_\- ]/g, '').trim().slice(0, 60) || M('untitled');
}

async function revealStartupWindow(target) {
  if (!target || target.isDestroyed() || target._startupShown || !target._startupReady || !target._startupPrepared) return;
  if(target._startupRevealPending)return target._startupRevealPending;
  target._startupRevealPending=(async()=>{
    // Force a composed local frame before Windows exposes the native surface.
    // The second capture also primes the surface created by the first show.
    try{await target.webContents.capturePage();}catch{}
    if(target.isDestroyed())return;
    target.show();
    try{await target.webContents.capturePage();}catch{}
    if(target.isDestroyed())return;
    target.setOpacity(1);
    target._startupShown=true;
    target.emit('startup-revealed');
  })();
  return target._startupRevealPending;
}
function createWindow() {
  let themeQ = '';
  let languageQ = 'en';
  let interfaceScale = 'auto';
  try {
    const cfg = JSON.parse(fs.readFileSync(configPath(), 'utf8'));
    if (/^(dark|light|leaf)$/.test(cfg?.theme)) themeQ = cfg.theme;
    if (cfg?.lang === 'tr') languageQ = 'tr';
    interfaceScale = cfg?.uiScale;
  } catch {}
  const display = screen.getPrimaryDisplay();
  win = new BrowserWindow({
    ...initialWindowBounds(display.workArea, display.bounds, display.scaleFactor),
    show: false,
    opacity: 0,
    backgroundColor: ({light:'#faf9f7',leaf:'#f3f8f1',dark:'#111510'})[themeQ || 'dark'],
    autoHideMenuBar: true,
    frame: false,
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      zoomFactor: initialZoomFactor(display.bounds, display.scaleFactor, interfaceScale),
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  windowInterface.attach(win);
  // The first native paint can precede document content. Reveal only after the
  // renderer has also prepared and painted the branded opening screen.
  const target = win;
  target.once('ready-to-show', () => {
    target._startupReady = true;
    revealStartupWindow(target);
  });
  target.webContents.on('did-fail-load', (_event, _code, _description, _url, isMainFrame) => {
    if (isMainFrame) { target._startupReady = true; target._startupPrepared = true; revealStartupWindow(target); }
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'), { query: { ...(themeQ ? { theme: themeQ } : {}), lang: languageQ } });
  // maximize/restore değişince renderer ikonunu güncellesin
  try {
    const emitWs = () => { try { if (win && !win.isDestroyed()) win.webContents.send('win:state', { max: win.isMaximized() }); } catch {} };
    win.on('maximize', emitWs); win.on('unmaximize', emitWs);
    win.webContents.on('did-finish-load', emitWs);
  } catch {}
  setupAutoUpdate();
}

if (gotLock) app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

// --- Settings retain their renderer shape; API keys are protected at rest. ---
const configStore=createConfigStore({file:configPath(),safeStorage});
const windowInterface=require('./window-interface.cjs').createWindowInterface({screen,readConfig:()=>configStore.read(),writeConfig:config=>configStore.write(config)});
ipcMain.handle('config:get', () => {
  const config=configStore.read();
  return profileBootstrap.onboardingState(config||{ provider: 'opencode', baseUrl: 'https://opencode.ai/zen/go/v1', apiKey: '', model: 'deepseek-v4-flash' },existingUserProfile);
});
ipcMain.handle('config:set', (_e, cfg) => {
  // A delayed general settings save must not undo a just-applied zoom choice.
  const previous=configStore.read();
  return configStore.write({...cfg,...(previous&&Object.hasOwn(previous,'uiScale')?{uiScale:previous.uiScale}:{})});
});
function interfaceSender(event){if(!win||win.isDestroyed()||event.sender!==win.webContents)throw new Error('WINDOW_UNAVAILABLE');}
ipcMain.handle('window:interface-get',event=>{interfaceSender(event);return windowInterface.state();});
ipcMain.handle('window:interface-set',(event,value)=>{interfaceSender(event);return windowInterface.setScale(value);});

// --- Kayıtlı veritabanları (sql.js export'u birebir .sqlite dosyası) ---
ipcMain.handle('db:list', () => {
  const d = dbDir();
  return fs.readdirSync(d).filter(f => f.endsWith('.sqlite')).map(f => {
    try {
      const st = fs.statSync(path.join(d, f));
      return { name: path.basename(f, '.sqlite'), bytes: st.size, mtime: st.mtimeMs };
    } catch { return null; }
  }).filter(Boolean);
});
function safetyCopy(n, live) {
  try {
    if (!fs.existsSync(live)) return;
    const bd = backupDir();
    const stamp = new Date().toISOString().replace(/[-:T.Z]/g, '') + '-' + Math.random().toString(36).slice(2, 7);
    fs.copyFileSync(live, path.join(bd, `${n}.${stamp}.bak.sqlite`));
    const olds = fs.readdirSync(bd).filter(f => f.startsWith(n + '.') && f.endsWith('.bak.sqlite')).sort();
    while (olds.length > 5) fs.rmSync(path.join(bd, olds.shift()), { force: true });
  } catch {}
}
ipcMain.handle('db:save', (_e, name, u8arr) => {
  const n = safeName(name);
  const data = Buffer.from(u8arr);
  const live = path.join(dbDir(), n + '.sqlite');
  if (n === '__autosave' && fs.existsSync(live)) {
    try {
      for (let g = 3; g >= 1; g--) {
        const src = g === 1 ? live : path.join(dbDir(), `__autosave.prev${g - 1}.sqlite`);
        if (fs.existsSync(src)) fs.copyFileSync(src, path.join(dbDir(), `__autosave.prev${g}.sqlite`));
      }
      const bd = backupDir();
      for (let g = 3; g >= 1; g--) {
        const src = g === 1 ? path.join(bd, '__autosave.sqlite') : path.join(bd, `__autosave.prev${g - 1}.sqlite`);
        if (fs.existsSync(src)) fs.copyFileSync(src, path.join(bd, `__autosave.prev${g}.sqlite`));
      }
    } catch {}
  }
  try { if (fs.existsSync(live) && !n.startsWith('__autosave') && !fs.readFileSync(live).equals(data)) safetyCopy(n, live); } catch {}
  fs.writeFileSync(live + '.tmp', data);
  fs.renameSync(live + '.tmp', live);
  try { fs.writeFileSync(path.join(backupDir(), n + '.sqlite'), data); } catch {}
  return n;
});
ipcMain.handle('db:load', (_e, name) => {
  const buf = fs.readFileSync(path.join(dbDir(), safeName(name) + '.sqlite'));
  return Array.from(buf);
});
ipcMain.handle('db:rename', (_e, oldN, newN) => {
  if (!String(newN || '').replace(/[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ_\- ]/g, '').trim()) throw new Error(M('emptyName'));
  const a = safeName(oldN), b = safeName(newN);
  if (a === b) return b;
  if (a.startsWith('__autosave') || b.startsWith('__autosave')) throw new Error(M('sysArea'));
  const src = path.join(dbDir(), a + '.sqlite');
  if (!fs.existsSync(src)) throw new Error(M('noRecord'));
  const dst = path.join(dbDir(), b + '.sqlite');
  if (fs.existsSync(dst)) throw new Error(M('nameTaken') + b);
  try { safetyCopy(a, src); } catch {}
  fs.renameSync(src, dst);
  try {
    const bs = path.join(backupDir(), a + '.sqlite'), bd = path.join(backupDir(), b + '.sqlite');
    if (fs.existsSync(bs) && !fs.existsSync(bd)) fs.renameSync(bs, bd);
  } catch {}
  return b;
});
ipcMain.handle('db:delete', (_e, name) => {
  const n = safeName(name);
  fs.rmSync(path.join(dbDir(), n + '.sqlite'), { force: true });
  try { fs.rmSync(path.join(backupDir(), n + '.sqlite'), { force: true }); } catch {}
  try {
    for (const f of fs.readdirSync(backupDir())) {
      if (f.startsWith(n + '.') && f.endsWith('.bak.sqlite')) fs.rmSync(path.join(backupDir(), f), { force: true });
    }
  } catch {}
  return true;
});
ipcMain.handle('db:recover', () => {
  if (process.env.SQLPG_NO_RECOVER) return [];
  const restored = [];
  try {
    const bd = backupDir(), dd = dbDir();
    const live = new Set(fs.readdirSync(dd).filter(f => f.endsWith('.sqlite')));
    for (const f of fs.readdirSync(bd).filter(f => f.endsWith('.sqlite') && !f.endsWith('.bak.sqlite'))) {
      if (!live.has(f)) {
        fs.copyFileSync(path.join(bd, f), path.join(dd, f));
        restored.push(path.basename(f, '.sqlite'));
      }
    }
    if (!live.has('__autosave.sqlite')) {
      const inDb = ['__autosave.prev.sqlite', '__autosave.prev1.sqlite', '__autosave.prev2.sqlite', '__autosave.prev3.sqlite'];
      for (const c of inDb) {
        if (fs.existsSync(path.join(dd, c))) {
          fs.copyFileSync(path.join(dd, c), path.join(dd, '__autosave.sqlite'));
          restored.push('__autosave'); break;
        }
      }
      if (!fs.existsSync(path.join(dd, '__autosave.sqlite'))) {
        for (const c of ['__autosave.sqlite', '__autosave.prev.sqlite']) {
          if (fs.existsSync(path.join(bd, c))) {
            fs.copyFileSync(path.join(bd, c), path.join(dd, '__autosave.sqlite'));
            restored.push('__autosave'); break;
          }
        }
      }
    }
  } catch {}
  return restored;
});
ipcMain.handle('app:version', () => app.getVersion());
ipcMain.handle('window:startup-painted', async event => {
  const target=BrowserWindow.fromWebContents(event.sender);
  if(target&&!target.isDestroyed()){
    target._startupPrepared=true;
    if(!target._startupReady)await new Promise(resolve=>target.once('ready-to-show',resolve));
    await revealStartupWindow(target);
  }
  return true;
});
// dil degisimi tam yeniden baslatma ister (soft reload degil) —
// once renderer ayari diske yazmistir, burada sadece yeniden baslatilir.
ipcMain.handle('app:restart', () => { try { app.relaunch(); } catch {} try { app.exit(0); } catch {} return true; });
ipcMain.handle('app:open-db-dir', async () => { await shell.openPath(dbDir()); return true; });
ipcMain.handle('app:open-url', async (_e, url) => {
  const u = String(url || '');
  if (!/^https:\/\/github\.com\/canyrtcn(?:\/[A-Za-z0-9_.-]+)?\/?$/.test(u)) throw new Error('blocked');
  await shell.openExternal(u);
  return true;
});
ipcMain.handle('window:control', (_e, action) => {
  const w = BrowserWindow.getFocusedWindow() || win;
  if (!w) return;
  if (action === 'minimize') w.minimize();
  else if (action === 'maximize') w.isMaximized() ? w.unmaximize() : w.maximize();
  else if (action === 'close') w.close();
});
ipcMain.handle('window:state', () => {
  try { const w = BrowserWindow.getFocusedWindow() || win; return { max: !!(w && w.isMaximized()) }; }
  catch { return { max: false }; }
});
ipcMain.handle('notes:export', async (_e, html, name) => {
  try {
    const pdf = await printStudyPdf(html);
    const r = await dialog.showSaveDialog(win, { title: M('pdfTitle'), defaultPath: (String(name || M('noteName')).slice(0, 60) || M('noteName')) + '.pdf', filters: [{ name: 'PDF', extensions: ['pdf'] }] });
    if (r.canceled || !r.filePath) return { ok: false, canceled: true };
    fs.writeFileSync(r.filePath, pdf);
    return { ok: true, path: r.filePath };
  } catch (e) { return { ok: false, error: String(e.message || e) }; }
});
let _wasmCache = null;
ipcMain.handle('app:get-wasm', () => {
  if (_wasmCache) return _wasmCache;
  const p = path.join(__dirname, 'renderer', 'vendor', 'sql-wasm.wasm');
  const buf = fs.readFileSync(p);
  _wasmCache = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return _wasmCache;
});
