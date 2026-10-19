window.AiDatabaseCapture=(function(){
'use strict';
// Used by the current-data inspection tool. Capture only for the current request.
function fail(code, message) { throw Object.assign(new Error(message), { code }); }
function capture({ db, identity, assertCurrent }) {
  if (!db || !identity || !Number.isInteger(identity.revision) || typeof assertCurrent !== 'function')
    fail('INSPECTION_INPUT', 'A database, revision and current-request check are required.');
  assertCurrent();
  if (!db.getAutocommit()) fail('INSPECTION_TRANSACTION', 'An open transaction cannot be represented by this snapshot.');
  if (Object.keys(db.functions || {}).length)
    fail('INSPECTION_FUNCTIONS', 'Connection-local JavaScript functions cannot be represented by this snapshot.');
  const databases = db.exec('PRAGMA database_list')[0]?.values || [];
  if (databases.some(row => !['main', 'temp'].includes(row[1])))
    fail('INSPECTION_ATTACHED', 'Attached databases cannot be represented by this main-database snapshot.');
  if (db.exec('SELECT 1 FROM sqlite_temp_master LIMIT 1')[0]?.values.length)
    fail('INSPECTION_TEMP', 'Temporary objects cannot be represented by this main-database snapshot.');
  const pragmas = {};
  for (const name of ['foreign_keys', 'reverse_unordered_selects', 'read_uncommitted', 'recursive_triggers', 'ignore_check_constraints', 'short_column_names', 'full_column_names'])
    pragmas[name] = db.exec('PRAGMA ' + name)[0].values[0][0];
  const connection = {
    pragmas,
    caseSensitiveLike: db.exec("SELECT 'a' LIKE 'A'")[0].values[0][0] === 0,
    counters: db.exec('SELECT CAST(last_insert_rowid() AS TEXT), CAST(changes() AS TEXT), CAST(total_changes() AS TEXT)')[0].values[0]
  };
  const database = db.snapshot();
  assertCurrent();
  return { database, identity: structuredClone(identity), capturedAt: new Date().toISOString(), connection, coverage: 'committed-main-database-only' };
}
return { capture };

})();
