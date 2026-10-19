'use strict';
const { parentPort } = require('node:worker_threads');
const path = require('node:path');
const engineRoot = path.resolve(__dirname, '../renderer/vendor');
const engine = require(path.join(engineRoot, 'sql-wasm-snapshot.js'))({ locateFile: file => path.join(engineRoot, file) });
const fail = (code, message) => { throw Object.assign(new Error(message), { code }); };
let SQL, db, statement, columns, pendingRow = null, finished = false, rowOffset = 0, sequence = 0;
const callbacks = [], cells = new Map();
// Deferred cells are JS-owned copies, outside SQLite's allocation limit.
// Count their retained payload separately, across all pages of this cursor.
const retainedCellAllowance = 64 * 1024 * 1024;
let retainedCellBytes = 0;
const safeInteger = n => n >= BigInt(Number.MIN_SAFE_INTEGER) && n <= BigInt(Number.MAX_SAFE_INTEGER);

function encode(value) {
  if (typeof value === 'bigint') return safeInteger(value) ? Number(value) : { type: 'integer', decimal: String(value) };
  if (typeof value === 'number' && !Number.isFinite(value)) return { type: 'real', value: String(value) };
  const blob = value instanceof Uint8Array;
  const length = blob ? value.length * 2 : typeof value === 'string' ? value.length : 0;
  if (length > 8000) {
    const bytes = blob ? value.byteLength : value.length * 2;
    if (retainedCellBytes + bytes > retainedCellAllowance)
      fail('INSPECTION_MEMORY', 'Deferred inspection values exceeded their memory allowance. This cursor is closed; previously returned pages remain historical observations, not a complete result. Select needed columns, shorter cell fragments or aggregate values in a new query.');
    retainedCellBytes += bytes;
    const id = 'cell-' + ++sequence;
    cells.set(id, blob ? new Uint8Array(value) : value);
    return { type: 'cell_reference', id, valueType: blob ? 'blob' : 'text', encoding: blob ? 'hex' : 'text', characters: length };
  }
  return blob ? { type: 'blob', hex: Buffer.from(value).toString('hex') } : value;
}
function step() {
  if (finished) return null;
  if (!statement.step()) { finished = true; statement.free(); statement = null; return null; }
  return statement.get(null, { useBigInt: true }).map(encode);
}
function readPage({ rows = 100, characters = 24000 }) {
  if (!Number.isInteger(rows) || rows < 1 || rows > 1000 || !Number.isInteger(characters) || characters < 1024 || characters > 24000)
    fail('INSPECTION_INPUT', 'Page size must be 1–1000 rows and 1024–24000 characters.');
  const values = [], offset = rowOffset;
  let size = JSON.stringify(columns).length + 128;
  while (values.length < rows) {
    const row = pendingRow || step(); pendingRow = null;
    if (row === null) break;
    const cost = JSON.stringify(row).length + 1;
    if (size + cost > characters) {
      pendingRow = row;
      if (!values.length) fail('INSPECTION_ROW_TOO_WIDE', 'A row exceeds this page size. Select fewer columns or use a larger page. No row was returned.');
      break;
    }
    size += cost; values.push(row); rowOffset++;
  }
  // A look-ahead distinguishes an exact page boundary from a partial result.
  if (!pendingRow && !finished) pendingRow = step();
  return { columns, values, offset, nextOffset: finished && !pendingRow ? null : rowOffset, complete: finished && !pendingRow,
    hasDeferredCells: cells.size > 0,
    valueEncoding: 'JSON scalars; unsafe integers as {type:integer,decimal}; BLOB as {type:blob,hex}; long cells as recoverable references. SQL NULL is JSON null.' };
}
function readCell({ cellId, offset = 0, characters = 8000 }) {
  if (!cells.has(cellId)) fail('INSPECTION_CELL', 'Cell reference does not belong to this inspection.');
  if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(characters) || characters < 1 || characters > 24000)
    fail('INSPECTION_INPUT', 'Invalid cell page.');
  const value = cells.get(cellId), blob = value instanceof Uint8Array, length = blob ? value.length * 2 : value.length;
  if (offset > length) fail('INSPECTION_INPUT', 'Cell offset is outside the value.');
  // Offset is in hex characters for BLOBs, UTF-16 code units for text (JSON-safe).
  const end = Math.min(offset + characters, length);
  const text = blob ? Buffer.from(value.subarray(Math.floor(offset / 2), Math.ceil(end / 2))).toString('hex').slice(offset % 2, offset % 2 + end - offset) : value.slice(offset, end);
  return { cellId, encoding: blob ? 'hex' : 'text', text, offset, characters: length, nextOffset: end < length ? end : null, complete: end === length };
}
async function open({ snapshot, sql }) {
  if (db) fail('INSPECTION_OPEN', 'An inspection is already open.');
  SQL = await engine;
  db = new SQL.Database(snapshot.database);
  // Trusted setup, before the authorizer. This bounds SQLite allocations in
  // this disposable inspection only, not the application's user SQL engine.
  const memoryAllowance = 64 * 1024 * 1024;
  if (db.exec('PRAGMA hard_heap_limit=' + memoryAllowance)[0]?.values[0]?.[0] !== memoryAllowance)
    fail('INSPECTION_MEMORY_POLICY', 'Inspection memory policy is unavailable.');
  for (const name of ['foreign_keys', 'reverse_unordered_selects', 'read_uncommitted', 'recursive_triggers', 'ignore_check_constraints', 'short_column_names', 'full_column_names']) {
    const value = snapshot.connection?.pragmas?.[name];
    if (value === 0 || value === 1) db.exec('PRAGMA ' + name + '=' + value);
  }
  if (snapshot.connection?.caseSensitiveLike) db.exec('PRAGMA case_sensitive_like=ON');
  db.exec('PRAGMA query_only=ON;');
  const register = SQL.cwrap('sqlite3_create_function_v2', 'number', ['number','string','number','number','number','number','number','number','number']);
  for (const [i, name] of ['last_insert_rowid', 'changes', 'total_changes'].entries()) {
    const value = snapshot.connection?.counters?.[i];
    if (typeof value !== 'string' || !/^-?\d+$/.test(value)) fail('INSPECTION_CONNECTION', 'Connection counters were not captured.');
    const integer = BigInt(value), callback = SQL.addFunction(context => SQL._sqlite3_result_int64(context, integer), 'viii');
    callbacks.push(callback); db.handleError(register(db.db, name, 0, 1, 0, callback, 0, 0, 0));
  }
  // SQLite decides the operation's meaning. No SQL-prefix/intent regex.
  // SQLITE_READ=20, SELECT=21, FUNCTION=31, RECURSIVE=33. DENY is 1.
  const authorizer = SQL.addFunction((_user, action, _arg1, arg2) => {
    if (action === 31) {
      const name = arg2 ? SQL.UTF8ToString(arg2).toLowerCase() : '';
      return ['load_extension', 'readfile', 'writefile', 'eval'].includes(name) ? 1 : 0;
    }
    return [20, 21, 33].includes(action) ? 0 : 1;
  }, 'iiiiiii');
  callbacks.push(authorizer); db.handleError(SQL._sqlite3_set_authorizer(db.db, authorizer, 0));
  let count = 0;
  // Validate all SQL before evaluating any. Iterator frees temporary statements.
  for (const parsed of db.iterateStatements(sql)) {
    count++;
    if (count > 1) fail('INSPECTION_STATEMENTS', 'Supply one read-only statement per inspection.');
  }
  if (count !== 1) fail('INSPECTION_STATEMENTS', 'One read-only statement is required.');
  statement = db.prepare(sql); columns = statement.getColumnNames();
  if (!columns.length) fail('INSPECTION_READ_ONLY', 'The statement does not return a read result.');
  return { columns, complete: false };
}
let queue = Promise.resolve();
parentPort.on('message', message => {
  queue = queue.then(async () => {
    try {
      const result = message.command === 'open' ? await open(message) : message.command === 'page' ? readPage(message) : message.command === 'cell' ? readCell(message) : fail('INSPECTION_INPUT', 'Unknown inspection command.');
      parentPort.postMessage({ id: message.id, result });
    } catch (error) {
      const memory = /out of memory/i.test(error.message);
      parentPort.postMessage({ id: message.id, code: memory ? 'INSPECTION_MEMORY' : error.code || 'INSPECTION_SQL', error: memory ? 'This inspection exceeded its SQLite memory allowance. No complete result is available; the application database was not changed. Select the needed columns or aggregate the data.' : error.message });
    }
  });
});
