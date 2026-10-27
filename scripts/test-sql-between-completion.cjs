'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),{create}=require('../app/renderer/sql-completion.js');
const schema=[{name:'sales',columns:['amount','threshold','and_amount','status','then_amount']}];
function suggest(marked,mode='next3'){const position=marked.indexOf('¦');assert(position>=0);return create()({text:marked.replace('¦',''),position,mode,schema});}
const top=(...args)=>suggest(...args)?.top??null;
test('an unfinished BETWEEN bound requires AND rather than a CASE transition',()=>{
 for(const mode of ['word','next1','next3','line'])for(const bound of ['10','threshold','COALESCE(threshold,10)','(5+5)',"'A'",'(SELECT MAX(amount) FROM sales)']){
  assert.equal(top('SELECT CASE WHEN amount BETWEEN '+bound+' TH¦ FROM sales',mode),null,mode+': '+bound);
  assert.equal(top('SELECT CASE WHEN amount BETWEEN '+bound+' AN¦ FROM sales',mode),'AND',mode+': '+bound);
 }
 for(const sql of ['SELECT * FROM sales WHERE amount BETWEEN 10 OR¦','SELECT CASE WHEN amount NOT BETWEEN 10 TH¦ FROM sales','SELECT CASE WHEN amount BETWEEN 10 EN¦ FROM sales'])assert.equal(top(sql),null,sql);
});
test('both bounds still use normal expression completion and a completed range permits THEN',()=>{
 for(const [marked,expected]of [
  ['SELECT CASE WHEN amount BETWEEN th¦ AND 100 THEN 1 END FROM sales','threshold'],
  ['SELECT CASE WHEN amount BETWEEN 10 + th¦ AND 100 THEN 1 END FROM sales','threshold'],
  ['SELECT CASE WHEN amount BETWEEN 10 AND th¦ THEN 1 END FROM sales','threshold'],
  ['SELECT CASE WHEN amount BETWEEN 10 AND 100 TH¦ FROM sales','THEN'],
  ['SELECT CASE WHEN amount BETWEEN 10 AND 100 AND status IS NULL TH¦ FROM sales','THEN'],
  ['SELECT CASE WHEN amount BETWEEN CASE WHEN status IS NULL THEN 10 ELSE 20 END AN¦ 100 THEN 1 END FROM sales','AND'],
  ['SELECT CASE WHEN amount BETWEEN 10 AND CASE WHEN status IS NULL THEN 100 ELSE 200 END TH¦ FROM sales','THEN'],
  ['SELECT CASE WHEN amount BETWEEN COALESCE((CASE WHEN status IS NULL THEN 10 ELSE 20 END),0) AN¦ FROM sales','AND']
 ])assert.equal(top(marked),expected,marked);
});
test('BETWEEN separators ignore AND in nested queries, CASE branches, strings and comments',()=>{
 for(const sql of ['SELECT CASE WHEN amount BETWEEN (SELECT MAX(amount) FROM sales WHERE amount>0 AND status IS NULL) AN¦ FROM sales','SELECT CASE WHEN amount BETWEEN CASE WHEN amount>0 AND status IS NULL THEN 10 ELSE 20 END AN¦ FROM sales',"SELECT CASE WHEN status BETWEEN 'AND' AN¦ FROM sales",'SELECT CASE WHEN amount BETWEEN 10 /* AND */ AN¦ FROM sales'])assert.equal(top(sql),'AND',sql);
 assert.equal(top('SELECT CASE WHEN amount BETWEEN 10 THEN 1 ELSE CASE WHEN amount>0 TH¦ FROM sales'),'THEN');
 assert.equal(top('SELECT * FROM sales WHERE amount BETWEEN 1 AND 2; SELECT CASE WHEN amount>0 TH¦ FROM sales'),'THEN');
 assert.equal(top('SELECT CASE WHEN amount BETWEEN 10 AND (SELECT CASE WHEN amount>0 TH¦ FROM sales) END FROM sales'),'THEN');
});
test('accepted BETWEEN and CASE completions execute without changing SQL execution',async()=>{
 const SQL=await require('sql.js')(),db=new SQL.Database();try{
  db.run("CREATE TABLE sales(amount REAL,threshold REAL,status TEXT); INSERT INTO sales VALUES(15,10,NULL),(50,20,'paid');");
  for(const marked of ['SELECT CASE WHEN amount BETWEEN 10 AN¦ 100 THEN 1 ELSE 0 END FROM sales;','SELECT CASE WHEN amount BETWEEN 10 AND 100 TH¦ 1 ELSE 0 END FROM sales;','SELECT CASE WHEN amount BETWEEN CASE WHEN status IS NULL THEN 10 ELSE 20 END AN¦ 100 THEN 1 ELSE 0 END FROM sales;']){
   const result=suggest(marked);assert(result);const position=marked.indexOf('¦'),text=marked.replace('¦',''),sql=text.slice(0,result.start)+result.top+text.slice(position);assert.equal(db.exec(sql)[0].values.length,2,sql);
  }
 }finally{db.close();}
});
