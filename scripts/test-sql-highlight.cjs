'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{test}=require('node:test');
const source=fs.readFileSync(path.join(__dirname,'../app/renderer/app.js'),'utf8'),vocabulary={};
for(const name of ['KW','FN','TY']){const match=source.match(new RegExp('const SQL_'+name+" = new Set\\(\\('([^']+)'\\)\\.split"));assert(match,name);vocabulary[name]=match[1].split(' ');}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function worker(){const messages=[],self={postMessage:message=>messages.push(message)};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../app/renderer/vendor/sql-highlight-worker.js'),'utf8'),{self,setTimeout,clearTimeout,performance},{timeout:1000});let request=0;return {
 send:value=>self.onmessage({data:value}),
 async paint(id,length){const wanted=++request;self.onmessage({data:{type:'viewport',id,request:wanted,ranges:[{from:0,to:length}]}});for(let i=0;i<200;i++){const message=messages.find(m=>m.id===id&&m.request===wanted);if(message)return message.spans;await delay(5);}assert.fail('Highlight worker did not finish');}
};}
const colour=(spans,from,to)=>spans.find(span=>span.from<=from&&span.to>=to)?.style??null;

test('the shipped highlight worker colours every chat function consistently in both cases',async()=>{
 const functions=vocabulary.FN.filter(name=>!vocabulary.KW.includes(name));
 const text='SELECT '+functions.flatMap(name=>[name+'(value)',name.toUpperCase()+'(value)']).join(', ')+' FROM sample;';
 const run=worker();run.send({type:'open',id:1,text});const spans=await run.paint(1,text.length);
 const matches=[...text.matchAll(/([A-Za-z_][A-Za-z0-9_]*)\(value\)/g)];assert.equal(matches.length,functions.length*2);
 for(const match of matches)assert.equal(colour(spans,match.index,match.index+match[1].length),'sql-fn',match[1]);
 run.send({type:'close',id:1});
});

test('nested functions, keywords, types, strings and comments retain distinct token colours',async()=>{
 const text="SELECT ROUND(AVG(value), 2), COUNT(*), DATE('now'), ROW_NUMBER() OVER (ORDER BY value), 'ROUND AVG', \"ROUND\" FROM sample; -- ROUND AVG\n/* AVG\nROUND */\nCREATE TABLE demo(value INTEGER, note TEXT);";
 const run=worker();run.send({type:'open',id:1,text});const spans=await run.paint(1,text.length);
 for(const word of ['ROUND','AVG','COUNT','DATE','ROW_NUMBER']){const at=text.indexOf(word);assert.equal(colour(spans,at,at+word.length),'sql-fn',word);}
 for(const word of ['SELECT','OVER','ORDER','BY','CREATE']){const at=text.indexOf(word);assert.equal(colour(spans,at,at+word.length),'sql-kw',word);}
 for(const word of ['INTEGER','TEXT']){const at=text.indexOf(word);assert.equal(colour(spans,at,at+word.length),'sql-ty',word);}
 assert.equal(colour(spans,text.indexOf('2'),text.indexOf('2')+1),'sql-num');
 const stringAt=text.indexOf("'ROUND AVG'");assert.equal(colour(spans,stringAt,stringAt+11),'sql-str');
 const identifierAt=text.indexOf('"ROUND"');assert.notEqual(colour(spans,identifierAt,identifierAt+7),'sql-fn');
 const lineAt=text.indexOf('-- ROUND');assert.equal(colour(spans,lineAt,lineAt+12),'sql-com');
 const blockAt=text.indexOf('/* AVG');assert.equal(colour(spans,blockAt,blockAt+15),'sql-com');
 run.send({type:'close',id:1});
});

test('incremental edits recolour function names without restarting the document',async()=>{
 const run=worker(),text='SELECT ROUN(value), AVG(value) FROM sample;';run.send({type:'open',id:1,text});
 assert.notEqual(colour(await run.paint(1,text.length),7,11),'sql-fn');
 run.send({type:'change',id:1,revision:1,changes:[{from:11,to:11,insert:'D'}]});
 assert.equal(colour(await run.paint(1,text.length+1),7,12),'sql-fn');
 run.send({type:'change',id:1,revision:2,changes:[{from:11,to:12,insert:''}]});
 assert.notEqual(colour(await run.paint(1,text.length),7,11),'sql-fn');run.send({type:'close',id:1});
});
