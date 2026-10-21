'use strict';
// The read worker resolves its WASM beside the application in development too.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),source=path.join(root,'node_modules/sql.js'),target=path.join(root,'app/node_modules/sql.js');
assert(fs.existsSync(path.join(source,'dist/sql-wasm.wasm')),'Install the locked dependencies first');
assert.equal(path.dirname(path.dirname(target)),path.join(root,'app'));
fs.mkdirSync(path.dirname(target),{recursive:true});fs.cpSync(source,target,{recursive:true});
require('./build-sql-editor.cjs');
console.log('Local SQLite worker assets prepared.');
