'use strict';
const { Worker } = require('node:worker_threads');
const path = require('node:path');
const crypto = require('node:crypto');
const failure = (code, message) => Object.assign(new Error(message), { code });

// One isolated cursor per inspection. No worker or database copy until opened.
// A timeout invalidates that cursor; a later inspection starts a fresh worker.
async function open(snapshot, sql, { assertCurrent, timeoutMs = 10000, initTimeoutMs = 30000 } = {}) {
  if (!(snapshot?.database instanceof Uint8Array) || typeof sql !== 'string' || !sql.trim() || typeof assertCurrent !== 'function')
    throw failure('INSPECTION_INPUT', 'Invalid inspection input.');
  assertCurrent();
  const bytes = new Uint8Array(snapshot.database);
  const provenance = {
    identity: structuredClone(snapshot.identity), coverage: snapshot.coverage,
    snapshotSha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    sql, capturedAt: snapshot.capturedAt
  };
  const worker = new Worker(path.join(__dirname, 'worker.cjs'), {resourceLimits:{maxOldGenerationSizeMb:128}});
  let active = null, closed = false, nextId = 0, termination, completedPage = null;
  function stop(error) {
    if (closed) return;
    closed = true;
    if (active) { clearTimeout(active.timer); active.reject(error); active = null; }
    termination = worker.terminate();
  }
  worker.on('error', error => stop(failure(error.code==='ERR_WORKER_OUT_OF_MEMORY'?'INSPECTION_MEMORY':'INSPECTION_WORKER', error.message)));
  worker.on('exit', () => { if (!closed) stop(failure('INSPECTION_WORKER', 'Inspection worker exited.')); });
  worker.on('message', message => {
    if (!active || message.id !== active.id) return;
    const job = active; active = null; clearTimeout(job.timer);
    try {
      assertCurrent();
      if (message.error) {
        const error=failure(message.code, message.error);job.reject(error);
        if(message.code==='INSPECTION_MEMORY')stop(error);
      } else {
        const result={ ...message.result, provenance };
        if(result.complete && result.hasDeferredCells===false){
          completedPage={...result,values:[],offset:result.offset+result.values.length};
          stop(failure('INSPECTION_COMPLETE','Completed inspection released its worker.'));
        }
        job.resolve(result);
      }
    } catch (error) { job.reject(error); stop(error); }
  });
  async function send(command, args, duration = timeoutMs) {
    if(command==='page' && completedPage){assertCurrent();return structuredClone(completedPage);}
    if (closed) throw failure('INSPECTION_CLOSED', 'Inspection is closed.');
    if (active) throw failure('INSPECTION_BUSY', 'Read the current page before requesting another.');
    try { assertCurrent(); } catch (error) { stop(error); throw error; }
    return new Promise((resolve, reject) => {
      const id = ++nextId;
      active = { id, resolve, reject, timer: setTimeout(() => stop(failure('INSPECTION_TIMEOUT', 'Inspection exceeded its time limit. No complete result is available.')), duration) };
      // Transfer the private copy: keep the request snapshot, avoid another copy.
      worker.postMessage({ ...args, id, command }, command === 'open' ? [args.snapshot.database.buffer] : []);
    });
  }
  try { await send('open', { snapshot: { ...snapshot, database: bytes }, sql }, initTimeoutMs); }
  catch (error) { stop(error); await termination; throw error; }
  return {
    provenance,
    page(options = {}) { return send('page', options); },
    cell(id, offset = 0, characters = 8000) { return send('cell', { cellId: id, offset, characters }); },
    state() {return {workerActive:!closed,completed:!!completedPage};},
    async close() { completedPage=null;stop(failure('INSPECTION_CLOSED', 'Inspection closed.')); await termination; }
  };
}
module.exports = { open };
