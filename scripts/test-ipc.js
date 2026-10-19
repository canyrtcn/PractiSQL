// main.js IPC mantığını electron'u stub'layıp gerçek fs ile test eder.
const path = require('path');
const fs = require('fs');
const os = require('os');

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sqlpg-test-'));
  const handlers = {};
  const appEvents = {};
  const windowCalls = [];
  const hiddenWindow = { loadFile: async () => {}, isDestroyed: () => false, isMinimized: () => true,
    once: () => {}, on: () => {}, webContents: {once: () => {}, on: () => {}, send: () => {}},
    restore: () => windowCalls.push('restore'), show: () => windowCalls.push('show'), focus: () => windowCalls.push('focus'), close: () => windowCalls.push('close') };
  const fakeApp = {
    getPath: (n) => { const p = (n === 'userData' ? path.join(tmp, 'userData') : (n === 'appData' ? path.join(tmp, 'appData') : tmp)); fs.mkdirSync(p, { recursive: true }); return p; },
    getVersion: () => require('../package.json').version,
    whenReady: () => Promise.resolve(),
    on: (event, handler) => { appEvents[event] = handler; },
    quit: () => {},
    requestSingleInstanceLock: () => true
  };
  function FakeWin() {}
  FakeWin.prototype.loadFile = async () => {};

  const Module = require('module');
  const origLoad = Module._load;
  Module._load = function (req, ...rest) {
    if (req === 'electron') {
      return {
        app: fakeApp,
        // Keep window geometry deterministic without creating a native window.
        screen: {getPrimaryDisplay: () => ({bounds:{x:0,y:0,width:1920,height:1080},workArea:{x:0,y:0,width:1920,height:1032},scaleFactor:1}),on:()=>{},removeListener:()=>{}},
        safeStorage: {isEncryptionAvailable:()=>true,encryptString:value=>Buffer.from('test-only:'+value),decryptString:bytes=>{const text=Buffer.from(bytes).toString();if(!text.startsWith('test-only:'))throw Error('Invalid test protection');return text.slice(10);}},
        BrowserWindow: Object.assign(function () { return hiddenWindow; }, { getAllWindows: () => [hiddenWindow], getFocusedWindow: () => null }),
        ipcMain: { handle: (ch, fn) => { handlers[ch] = fn; } }
      };
    }
    return origLoad.call(this, req, ...rest);
  };
  require('../main.js');
  await new Promise(r => setTimeout(r, 100));
  Module._load = origLoad;

  const databaseDirectory=require('../database-store.cjs').directoryName;
  const call = (ch, ...a) => handlers[ch]({}, ...a);
  let fail = 0;
  const ok = (c, msg) => { console.log((c ? '[OK] ' : '[FAIL] ') + msg); if (!c) fail++; };
  appEvents['second-instance']();
  ok(windowCalls.join(',') === 'restore', 'ikinci açılış hazırlanmakta olan pencereyi erken göstermez');
  hiddenWindow._startupShown = true;
  windowCalls.length = 0;
  appEvents['second-instance']();
  ok(windowCalls.join(',') === 'restore,show,focus', 'ikinci açılış hazırlanmış pencereyi gösterir ve öne getirir');
  await call('window:control', 'close');
  ok(windowCalls.includes('close'), 'odaksız pencere de uygulama kontrolünden kapatılır');

  const cfg0 = await call('config:get');
  // window:state her zaman {max:boolean} döner
  const ws0 = await call('window:state');
  ok(ws0 && typeof ws0.max === 'boolean', 'window:state');
  // updater IPC kayıtlı + publish hedefi GitHub
  ok(typeof handlers['upd:check'] === 'function' && typeof handlers['upd:install'] === 'function', 'upd IPC kayıtlı');
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  ok(pkg.build && pkg.build.publish && pkg.build.publish.provider === 'github' && pkg.build.publish.owner === 'canyrtcn' && pkg.build.publish.repo === 'practisql', 'publish: canyrtcn/practisql');
  ok(cfg0.baseUrl === 'https://opencode.ai/zen/go/v1' && cfg0.model === 'deepseek-v4-flash', 'varsayılan config');
  await call('config:set', { baseUrl: 'https://x.test/v1', apiKey: 'sk-test', model: 'm1' });
  const cfg1 = await call('config:get');
  ok(cfg1.apiKey === 'sk-test', 'config set/get turu');

  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs({ locateFile: (f) => path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', f) });
  global.window = {};
  eval(fs.readFileSync(path.join(__dirname, '..', 'renderer', 'demos.js'), 'utf8'));
  const db = new SQL.Database();
  db.exec(global.window.DEMOS.satis.sql);
  const saved = await call('db:save', 'test-kayit', Array.from(db.export()));
  ok(saved === 'test-kayit', 'db:save');
  const list = await call('db:list');
  ok(list.length === 1 && list[0].name === 'test-kayit', 'db:list (' + JSON.stringify(list.map(l => l.name)) + ')');
  const loaded = await call('db:load', 'test-kayit');
  const db2 = new SQL.Database(new Uint8Array(loaded));
  const n = db2.exec('SELECT COUNT(*) FROM musteriler')[0].values[0][0];
  ok(n === 8, 'db:load turu (8 müşteri, gelen: ' + n + ')');
  await call('db:delete', 'test-kayit');
  ok((await call('db:list')).length === 0, 'db:delete');
  // db:list tek girdide patlasa da liste döner
  await call('db:save', 'saglam', Array.from(db.export()));
  const statOrig = fs.statSync;
  fs.statSync = function (p, ...a) { if (String(p).includes('saglam')) throw new Error('uçuç'); return statOrig.call(this, p, ...a); };
  let listRob = null, threw = false;
  try { listRob = await call('db:list'); } catch { threw = true; }
  fs.statSync = statOrig;
  ok(!threw && Array.isArray(listRob), 'db:list bozuk girdide patlamaz');
  await call('db:delete', 'saglam');
  // db:delete .bak artıklarını da temizler
  await call('db:save', 'silinecek', [1, 2, 3]);
  await call('db:save', 'silinecek', Array.from(db.export()));
  const bd = path.join(tmp, 'appData', 'sql-playground-backup');
  const bakBefore = fs.readdirSync(bd).filter(f => f.startsWith('silinecek.'));
  ok(bakBefore.length > 0, 'silmeden önce .bak var (' + bakBefore.length + ')');
  await call('db:delete', 'silinecek');
  const bakAfter = fs.readdirSync(bd).filter(f => f.startsWith('silinecek.'));
  ok(bakAfter.length === 0 && !fs.existsSync(path.join(tmp, 'userData', databaseDirectory, 'silinecek.sqlite')), 'db:delete .bak artıklarını temizledi');
  ok(typeof (await call('app:version')) === 'string', 'app:version');
  // yedek + kurtarma: kaydet, canlı dosyayı sil, yedekten geri getir
  await call('db:save', 'rectest', Array.from(db.export()));
  await call('db:save', '__autosave', Array.from(db.export()));
  await call('db:save', '__autosave', Array.from(db.export()));
  ok(fs.existsSync(path.join(tmp, 'userData', databaseDirectory, '__autosave.prev1.sqlite')), 'rotasyon prev1');
  fs.rmSync(path.join(tmp, 'userData', databaseDirectory, 'rectest.sqlite'));
  const rec = await call('db:recover');
  ok(JSON.stringify(rec) === '["rectest"]', 'db:recover (' + JSON.stringify(rec) + ')');
  const rl = await call('db:load', 'rectest');
  ok(Array.isArray(rl) && rl.length > 0, 'kurtarılan dosya yükleniyor');
  const wasm = await call('app:get-wasm');
  ok(wasm && wasm.byteLength > 100000, 'app:get-wasm (' + (wasm && wasm.byteLength) + ' byte)');
  // db:rename turu (canlı + yedek taşınır, çakışma reddedilir)
  await call('db:save', 'eskiad', Array.from(db.export()));
  const rn = await call('db:rename', 'eskiad', 'yeniad');
  ok(rn === 'yeniad' && fs.existsSync(path.join(tmp, 'userData', databaseDirectory, 'yeniad.sqlite')) && !fs.existsSync(path.join(tmp, 'userData', databaseDirectory, 'eskiad.sqlite')), 'db:rename taşır');
  await call('db:save', 'dolu', Array.from(db.export()));
  const cfgP = path.join(tmp, 'userData', 'config.json');
  fs.writeFileSync(cfgP, JSON.stringify({ lang: 'tr' }));
  let clash = '';
  try { await call('db:rename', 'yeniad', 'dolu'); } catch (e) { clash = String((e && e.message) || e); }
  ok(/zaten var/.test(clash), 'db:rename çakışmayı reddeder (TR)');
  let sysN = '';
  try { await call('db:rename', 'yeniad', '__autosave'); } catch (e) { sysN = String((e && e.message) || e); }
  ok(/sistem/.test(sysN), 'db:rename sistem alanını korur (TR)');
  fs.writeFileSync(cfgP, JSON.stringify({ lang: 'en' }));
  let clashEn = '';
  try { await call('db:rename', 'yeniad', 'dolu'); } catch (e) { clashEn = String((e && e.message) || e); }
  ok(/already taken/.test(clashEn), 'db:rename çakışmayı reddeder (EN)');
  let sysEn = '';
  try { await call('db:rename', 'yeniad', '__autosave'); } catch (e) { sysEn = String((e && e.message) || e); }
  ok(/system area/.test(sysEn), 'db:rename sistem alanını korur (EN)');

  // Crash/failure safety: replacing config must preserve the old file on error.
  await call('config:set', { lang: 'en', marker: 'before' });
  const renameOriginal = fs.renameSync;
  fs.renameSync = function(src, dst) { if (dst === cfgP) throw Error('simulated rename failure'); return renameOriginal.apply(this, arguments); };
  let configFailure = false;
  try { await call('config:set', { marker: 'after' }); } catch { configFailure = true; }
  finally { fs.renameSync = renameOriginal; }
  ok(configFailure && (await call('config:get')).marker === 'before', 'config yazma hatası önceki ayarları korur');
  ok(!fs.existsSync(cfgP + '.tmp'), 'config geçici dosyası hata sonrası temizlenir');
  await call('db:save', 'same-size', [1,2,3]);
  await call('db:save', 'same-size', [4,5,6]);
  const equalSizeBackup = fs.readdirSync(bd).find(f => f.startsWith('same-size.') && f.endsWith('.bak.sqlite'));
  ok(equalSizeBackup && fs.readFileSync(path.join(bd, equalSizeBackup)).equals(Buffer.from([1,2,3])), 'aynı boyutlu veri değişikliğinde önceki kayıt yedeklenir');
  let blankRename = false;
  try { await call('db:rename', 'same-size', '  ??? '); } catch { blankRename = true; }
  ok(blankRename && fs.existsSync(path.join(tmp, 'userData', databaseDirectory, 'same-size.sqlite')), 'boş/geçersiz yeniden adlandırma kaynak dosyayı korur');
  if(path.dirname(path.resolve(tmp))!==path.resolve(os.tmpdir())||!path.basename(tmp).startsWith('sqlpg-test-'))throw Error('Cleanup outside the owned test profile');
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(fail === 0 ? 'IPC TESTLERI GECTI' : fail + ' HATA VAR');
  process.exit(fail === 0 ? 0 : 1);
})();
