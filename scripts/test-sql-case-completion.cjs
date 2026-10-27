'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test');
const {create}=require('../app/renderer/sql-completion.js');
const schema=[{name:'sales',columns:['amount','status','threshold','elsewhere','end_date','when_created','end','when']}];
function suggest(marked,mode='next3'){const position=marked.indexOf('¦');assert(position>=0);return create()({text:marked.replace('¦',''),position,mode,schema});}
const top=(...args)=>suggest(...args)?.top??null;

test('searched CASE follows WHEN, THEN, ELSE and END instead of unrelated schema columns',()=>{
 for(const mode of ['word','next1','next3','line'])for(const [marked,expected] of [
  ['SELECT CASE WH¦ FROM sales','WHEN'],
  ['SELECT CASE WHEN amount>100 TH¦ FROM sales','THEN'],
  ['SELECT CASE WHEN amount>100 THEN 1 EL¦ FROM sales','ELSE'],
  ['SELECT CASE WHEN amount>100 THEN 1 EN¦ FROM sales','END'],
  ['SELECT CASE WHEN amount>100 THEN 1 ELSE 0 EN¦ FROM sales','END'],
  ['SELECT CASE WHEN amount>100 THEN 1 WH¦ FROM sales','WHEN'],
  ['SELECT CASE WHEN amount>100 THEN 1 WHEN amount>10 TH¦ FROM sales','THEN'],
  ["SELECT CASE WHEN status='paid' TH¦ FROM sales",'THEN'],
  ['SELECT CASE WHEN amount IS NULL TH¦ FROM sales','THEN'],
  ['SELECT CASE WHEN amount BETWEEN 1 AND 100 TH¦ FROM sales','THEN'],
  ['SELECT CASE WHEN (amount>100 AND status IS NOT NULL) TH¦ FROM sales','THEN']
 ])assert.equal(top(marked,mode),expected,mode+': '+marked);
});

test('simple CASE and nested CASE expressions keep independent states',()=>{
 for(const [marked,expected]of [
  ['SELECT CASE status WH¦ FROM sales','WHEN'],
  ["SELECT CASE status WHEN 'paid' TH¦ FROM sales",'THEN'],
  ["SELECT CASE status WHEN 'paid' THEN 1 ELSE 0 EN¦ FROM sales",'END'],
  ['SELECT CASE WHEN amount>0 THEN CASE status WH¦ FROM sales','WHEN'],
  ["SELECT CASE WHEN amount>0 THEN CASE status WHEN 'paid' THEN 1 END EL¦ FROM sales",'ELSE'],
  ['SELECT CASE WHEN CASE WHEN amount>0 THEN 1 ELSE 0 END=1 TH¦ FROM sales','THEN'],
  ['SELECT COALESCE(CASE WHEN amount>0 TH¦,0) FROM sales','THEN'],
  ['SELECT CASE COALESCE(status,\'unknown\') WH¦ FROM sales','WHEN']
 ])assert.equal(top(marked),expected,marked);
});

test('expressions inside CASE retain columns, aliases, functions and condition keywords',()=>{
 for(const [marked,expected]of [
  ['SELECT CASE WHEN am¦ > 10 THEN 1 END FROM sales','amount'],
  ['SELECT CASE WHEN s.am¦ > 10 THEN 1 END FROM sales s','amount'],
  ['SELECT CASE WHEN amount>10 THEN am¦ END FROM sales','amount'],
  ['SELECT CASE WHEN amount>10 THEN 1 ELSE COU¦ FROM sales','COUNT'],
  ['SELECT CASE WHEN COALESCE(st¦,\'unknown\')=\'paid\' THEN 1 END FROM sales','status'],
  ['SELECT CASE WHEN amount>10 AN¦ FROM sales','AND'],
  ['SELECT CASE WHEN amount>10 AND st¦ FROM sales','status'],
  ['SELECT CASE WHEN amount I¦ FROM sales','IS']
 ])assert.equal(top(marked),expected,marked);
 for(const [marked,expected]of [['SELECT CASE WHEN amount> TH¦ FROM sales','threshold'],['SELECT CASE WHEN amount>0 THEN EL¦ FROM sales','elsewhere'],['SELECT CASE WHEN amount>0 THEN 1 ELSE WH¦ FROM sales','when_created']])assert.equal(top(marked),expected,marked);
});

test('CASE expressions work outside SELECT lists and qualified keyword columns stay ordinary names',()=>{
 for(const marked of ['SELECT * FROM sales WHERE CASE WHEN amount>0 TH¦ 1 ELSE 0 END=1','SELECT SUM(CASE WHEN amount>0 TH¦ amount ELSE 0 END) FROM sales','SELECT SUM(amount) FROM sales HAVING CASE WHEN SUM(amount)>0 TH¦ 1 ELSE 0 END=1','SELECT * FROM sales ORDER BY CASE WHEN amount>0 TH¦ 1 ELSE 0 END','UPDATE sales SET status=CASE WHEN amount>0 TH¦ \'paid\' ELSE \'pending\' END','SELECT CASE WHEN s.end>0 TH¦ 1 ELSE 0 END FROM sales s','SELECT CASE WHEN s.when>0 TH¦ 1 ELSE 0 END FROM sales s'])assert.equal(top(marked),'THEN',marked);
});

test('completed CASE expressions do not leak into other expressions or nested SELECTs',()=>{
 assert.equal(top('SELECT CASE WHEN amount>0 THEN 1 END, TH¦ FROM sales'),'threshold');
 assert.equal(top('SELECT CASE WHEN amount>0 THEN 1 END FROM sales ORDER BY am¦'),'amount');
 assert.equal(top('SELECT CASE WHEN amount>0 THEN 1 END AS positive_flag FROM sales ORDER BY pos¦'),'positive_flag');
 assert.equal(top('SELECT CASE WHEN amount>0 THEN 1 END FROM sales; SELECT TH¦ FROM sales'),'threshold');
 assert.equal(top('SELECT CASE WHEN amount>0 THEN (SELECT TH¦ FROM sales) END FROM sales'),'threshold');
 assert.equal(top('SELECT CASE WHEN amount>0 THEN (SELECT CASE WHEN amount>0 TH¦ FROM sales) END FROM sales'),'THEN');
 for(const marked of ["SELECT CASE WHEN status='TH¦",'SELECT CASE WHEN amount>0 -- TH¦','SELECT CASE WHEN amount>0 /* TH¦'])assert.equal(top(marked),null,marked);
});

test('completed CASE suggestions execute in SQLite with the original text after the cursor',async()=>{
 const SQL=await require('sql.js')(),db=new SQL.Database();
 try{
  db.run("CREATE TABLE sales(amount REAL,status TEXT); INSERT INTO sales VALUES(150,'paid'),(25,'pending'),(0,NULL);");
  for(const marked of ['SELECT CASE WHEN amount>100 TH¦ 1 ELSE 0 END FROM sales;','SELECT CASE WHEN amount>100 THEN 1 EL¦ 0 END FROM sales;','SELECT CASE WHEN amount>100 THEN 1 ELSE 0 EN¦ FROM sales;',"SELECT CASE status WH¦ 'paid' THEN 1 ELSE 0 END FROM sales;",'SELECT CASE WHEN amount>0 THEN CASE WHEN amount>100 TH¦ 2 ELSE 1 END ELSE 0 END FROM sales;']){
   const completion=suggest(marked);assert(completion,marked);const position=marked.indexOf('¦'),text=marked.replace('¦',''),accepted=text.slice(0,completion.start)+completion.top+text.slice(position);assert.doesNotThrow(()=>db.exec(accepted),accepted);assert.equal(db.exec(accepted)[0].values.length,3);
  }
 }finally{db.close();}
});
