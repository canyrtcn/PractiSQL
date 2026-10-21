'use strict';
const fs=require('node:fs'),path=require('node:path'),esbuild=require('esbuild');
const root=path.resolve(__dirname,'..'),target=path.join(root,'app/renderer/vendor');
fs.mkdirSync(target,{recursive:true});
esbuild.buildSync({entryPoints:[path.join(root,'app/renderer/sql-editor-source.mjs')],outfile:path.join(target,'sql-editor.js'),bundle:true,format:'iife',globalName:'PractiSqlEditor',platform:'browser',target:'chrome130',minify:true,legalComments:'eof',logLevel:'warning'});
esbuild.buildSync({entryPoints:[path.join(root,'app/renderer/sql-highlight-source.mjs')],outfile:path.join(target,'sql-highlight-worker.js'),bundle:true,format:'iife',platform:'browser',target:'chrome130',minify:true,legalComments:'eof',logLevel:'warning'});
const packages=['@codemirror/state','@codemirror/view','@codemirror/commands','@codemirror/language','@codemirror/lang-sql','@codemirror/autocomplete','@codemirror/streamparser','@lezer/common','@lezer/lr','@lezer/highlight','@marijn/find-cluster-break','crelt','style-mod','w3c-keyname'];
fs.writeFileSync(path.join(target,'sql-editor-LICENSE.txt'),packages.map(name=>{const directory=path.join(root,'node_modules',name),pkg=JSON.parse(fs.readFileSync(path.join(directory,'package.json'),'utf8'));return name+' '+pkg.version+'\n'+fs.readFileSync(path.join(directory,'LICENSE'),'utf8');}).join('\n\n'));
console.log('Local SQL editor bundle prepared.');
