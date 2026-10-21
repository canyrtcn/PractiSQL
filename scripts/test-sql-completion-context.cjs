'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{test}=require('node:test');
const {create}=require('../app/renderer/sql-completion.js');
const app=fs.readFileSync(path.join(__dirname,'../app/renderer/app.js'),'utf8');
const vocabulary={};for(const [name,key] of [['SQL_KW','keywords'],['SQL_FN','functions'],['SQL_TY','types']]){const match=app.match(new RegExp('const '+name+" = new Set\\(\\('([^']+)'\\)\\.split"));assert(match,name);vocabulary[key]=match[1].toUpperCase().split(' ');}
const schema=[
 {name:'customers',columns:['customer_id','first_name','last_name','debt_to_income_pct','left_branch_code']},
 {name:'loans',columns:['loan_id','customer_id','branch_id'],foreignKeys:[{id:0,seq:0,table:'customers',from:'customer_id',to:'customer_id'}]},
 {name:'installments',columns:['installment_id','loan_id','due_amount'],foreignKeys:[{id:0,seq:0,table:'loans',from:'loan_id',to:'loan_id'}]},
 {name:'branches',columns:['branch_id','name']},
 {name:'products',columns:['product_id','name']},
 {name:'accounts',columns:['account_id','customer_id']},
 {name:'payments',columns:['payment_id','amount']}
];
const screenshot=`SELECT
 c.customer_id,
 c.first_name || ' ' || c.last_name AS full_name,
 l.loan_id,
 l.branch_id,
 i.due_amount,
 ROW_NUMBER() OVER (
  PARTITION BY c.customer_id
  ORDER BY i.due_amount ¦
 ) AS rn
FROM customers AS c
LEFT JOIN loans AS l ON c.customer_id = l.customer_id
LEFT JOIN installments AS i ON l.loan_id = i.loan_id`;
const linked=[{name:'customers',columns:['customer_id','name']},{name:'orders',columns:['order_id','customer_id','amount'],foreignKeys:[{id:0,seq:0,table:'customers',from:'customer_id',to:'customer_id'}]}];
function suggestion(marked,mode='next3',tables=schema){const position=marked.indexOf('¦'),text=marked.replace('¦','');assert(position>=0);return create(vocabulary)({text,position,mode,schema:tables});}
function top(sql,mode,tables){return suggestion(sql,mode,tables)?.top??null;}

test('the reported window ORDER BY chooses a sort direction before similarly named columns',()=>{
 for(const mode of ['word','next1','next3','line'])for(const prefix of ['D','DE','DES','A','AS'])assert.equal(top(screenshot.replace('¦',prefix+'¦'),mode),prefix.startsWith('D')?'DESC':'ASC',mode+' '+prefix);
 for(const expression of ['i.due_amount','SUM(i.due_amount)','COALESCE(i.due_amount, 0)','i.due_amount + 1'])assert.equal(top('SELECT * FROM installments i ORDER BY '+expression+' D¦'),'DESC',expression);
 assert.equal(top('SELECT * FROM customers c ORDER BY c.first_name, c.debt_to_income_pct D¦'),'DESC');
 assert.equal(top('SELECT ROW_NUMBER() OVER (ORDER BY SUM(i.due_amount) D¦) FROM installments i'),'DESC');
 assert.equal(top('SELECT ROW_NUMBER() OVER (PARTITION BY c.customer_id ORDER B¦) FROM customers c'),'BY');
 assert.equal(top('SELECT ROW_NUMBER() OVER (PARTI¦) FROM customers c'),'PARTITION BY');
});

test('a fresh JOIN keyword is legal after an ON predicate and independent of line breaks',()=>{
 const query=screenshot.replace('ORDER BY i.due_amount ¦','ORDER BY i.due_amount DESC');
 for(const separator of [' ','\n','\n  '])assert.equal(top(query+separator+'LE¦'),'LEFT JOIN');
 assert.equal(top('SELECT * FROM customers c JOIN loans l ON l.customer_id=c.customer_id LE¦\nWHERE c.customer_id>0'),'LEFT JOIN');
 assert.equal(top('SELECT * FROM customers c JOIN loans l ON l.customer_id=c.customer_id INN¦'),'INNER JOIN installments ON');
 assert.equal(top('SELECT * FROM customers c JOIN loans l ON l.customer_id=c.customer_id WHE¦'),'WHERE');
 assert.equal(top('SELECT * FROM customers c LE¦','word'),'LEFT');
});

test('all modes expand partial JOIN phrases using the same declared relationship',()=>{
 const sql='SELECT * FROM customers c LE¦';
 assert.equal(top(sql,'word',linked),'LEFT');
 assert.equal(top(sql,'next1',linked),'LEFT JOIN');
 assert.equal(top(sql,'next3',linked),'LEFT JOIN orders ON');
 assert.equal(top(sql,'line',linked),'LEFT JOIN orders ON orders.customer_id = c.customer_id');
 assert.equal(top('SELECT * FROM customers c LEFT¦','next3',linked),'LEFT JOIN orders ON');
 assert.equal(top('SELECT * FROM customers c LEFT ¦','next3',linked),'JOIN orders ON');
 assert.equal(top('SELECT * FROM customers c LEFT JO¦','next3',linked),'JOIN orders ON orders.customer_id');
 assert.equal(top('SELECT * FROM customers c LEFT JO¦','line',linked),'JOIN orders ON orders.customer_id = c.customer_id');
 assert.equal(top('SELECT * FROM customers c INN¦','line',linked),'INNER JOIN orders ON orders.customer_id = c.customer_id');
 assert.equal(top('SELECT * FROM customers c JOIN ord¦','next3',linked),'orders ON orders.customer_id =');
 assert.equal(top('SELECT * FROM customers c JOIN orders o ON¦','line',linked),'ON o.customer_id = c.customer_id');
});

test('a larger continuation budget never creates columns, predicates or duplicate suffixes',()=>{
 for(const mode of ['next1','next3','line']){
  assert.equal(top('SELECT * FROM installments i ORDER BY i.du¦',mode),'due_amount');
  assert.equal(top('SELECT SUM(c.de¦) FROM customers c',mode),'debt_to_income_pct');
  assert.equal(top('SELECT * FROM customers c WHERE c.de¦',mode),'debt_to_income_pct');
  assert.equal(top('SELECT * FROM customers c WHERE c.customer_id = ¦',mode),null);
  assert.equal(top('SELECT * FROM customers; ¦',mode),null);
  assert.equal(top('SELECT * FROM customers c LE¦ JOIN loans l ON l.customer_id=c.customer_id',mode),'LEFT');
  assert.equal(top('SELECT * FROM customers c LEFT JO¦ loans l ON l.customer_id=c.customer_id',mode),'JOIN');
  assert.equal(top('SELECT * FROM customers c ORDER B¦ c.customer_id',mode),'BY');
 }
 assert.notEqual(top('SELECT LE¦ FROM customers'),'LEFT JOIN');
 assert.notEqual(top('SELECT * FROM customers c WHERE LE¦'),'LEFT JOIN');
 assert.equal(top('SELECT * FROM customers c ORDER BY c.first_name D¦ESC'),null);
 assert.equal(top('SELECT * FROM customers c ORDER BY c.first_name /* D¦'),null);
 assert.equal(top("SELECT * FROM customers c WHERE c.first_name='LE¦"),null);
});

test('window clauses and nested queries keep their own grammar and source aliases',()=>{
 assert.equal(top('SELECT ROW_NUMBER() OVER (PARTITION BY c.customer_id ORDER BY c.de¦) FROM customers c'),'debt_to_income_pct');
 assert.equal(top('SELECT (SELECT ROW_NUMBER() OVER (ORDER BY i.due_amount D¦) FROM installments i) FROM customers c'),'DESC');
 assert.equal(top('SELECT ROW_NUMBER() OVER (ORDER BY c.customer_id DESC ROW¦) FROM customers c'),'ROWS');
 assert.equal(top('SELECT ROW_NUMBER() OVER (ORDER BY c.customer_id ROWS UNB¦) FROM customers c'),'UNBOUNDED PRECEDING');
 assert.equal(top('SELECT * FROM customers c WHERE c.customer_id IN (SELECT l.customer_id FROM loans l ORDER BY l.loan_id D¦)'),'DESC');
 assert.equal(top('SELECT * FROM customers c WHERE EXISTS (SELECT 1 FROM loans l WHERE l.loan_id>0) ORDER BY c.customer_id D¦'),'DESC');
 assert.equal(top('SELECT ROW_NUMBER() OVER (ORDER BY c.customer_id D¦), c.first_name FROM customers c ORDER BY c.first_name'),'DESC');
});

test('grammar positions distinguish expression starts, completed expressions and JOIN modifiers',()=>{
 for(const sql of ['SELECT * FR¦','SELECT c.* FR¦','SELECT DISTINCT * FR¦','SELECT customer_id, * FR¦'])assert.equal(top(sql), 'FROM',sql);
 assert.equal(top('SELECT DISTINCT fir¦ FROM customers'),'first_name');
 assert.equal(top('SELECT i.due_amount * COU¦ FROM installments i'),'COUNT');
 assert.equal(top('SELECT * FROM customers c WHERE c.first_name IS NO¦'),'NOT NULL');
 assert.equal(top('SELECT * FROM customers c ORDER BY c.first_name COLLATE NO¦'),'NOCASE');
 assert.equal(top('SELECT * FROM customers c ORDER BY c.first_name DESC NULLS F¦'),'FIRST');
 assert.equal(top('SELECT * FROM customers c GROUP BY c.first_name D¦'),null);
 assert.equal(top('SELECT * FROM customers c LEFT OU¦','line',linked),'OUTER JOIN orders ON orders.customer_id = c.customer_id');
 assert.equal(top('SELECT * FROM customers c CROSS JO¦','line',linked),'JOIN orders');
 assert.equal(top('SELECT * FROM customers c NATURAL JO¦','line',linked),'JOIN orders');
 assert.equal(top('SELECT "order".fir¦ FROM customers AS "order"'),'first_name');
 for(const sql of ['SELECT (SELECT SUM(i.due_amount) FROM installments i) FR¦','SELECT c.first_name AS full_name FR¦','SELECT COUNT(*) FR¦'])assert.equal(top(sql),'FROM',sql);
 assert.equal(top('INS¦'),'INSERT INTO');assert.equal(top('DEL¦'),'DELETE FROM');assert.equal(top('CRE¦'),'CREATE TABLE');
});

test('window frame continuations respect start bounds, end bounds and BETWEEN',()=>{
 const prefix='SELECT SUM(i.due_amount) OVER (ORDER BY i.loan_id ',suffix=') FROM installments i';
 for(const expression of ['ROWS UNBOUNDED PRECEDING ¦','ROWS CURRENT ROW ¦','ROWS UNBOUNDED F¦','ROWS BETWEEN CURRENT ROW AND UNBOUNDED P¦'])assert.equal(top(prefix+expression+suffix),null,expression);
 assert.equal(top(prefix+'ROWS BETWEEN UNBOUNDED PRECEDING A¦'+suffix),'AND CURRENT ROW');
 assert.equal(top(prefix+'ROWS BETWEEN CURRENT ROW AND UNB¦'+suffix),'UNBOUNDED FOLLOWING');
 assert.equal(top(prefix+'ROWS 2 P¦'+suffix),'PRECEDING');
});

test('context and continuation rules also work with unrelated, Unicode and quoted schemas',()=>{
 const quote=name=>'"'+name.replaceAll('"','""')+'"';
 for(const [parent,child] of [['ledger','entries'],['group','order details'],['müşteriler','ödemeler']]){
  const names=[{name:parent,columns:['id','descending_noise','left_noise']},{name:child,columns:['parent_id','value'],foreignKeys:[{id:0,seq:0,table:parent,from:'parent_id',to:'id'}]}];
  const written=name=>/^[\p{L}_][\p{L}\p{N}_]*$/u.test(name)&&name!=='group'?name:quote(name);
  const from=' FROM '+written(parent)+' p';
  assert.equal(top('SELECT *'+from+' LE¦','next3',names),'LEFT JOIN '+written(child)+' ON');
  assert.equal(top('SELECT *'+from+' LE¦','line',names),'LEFT JOIN '+written(child)+' ON '+written(child)+'.parent_id = p.id');
  assert.equal(top('SELECT ROW_NUMBER() OVER (ORDER BY p.id D¦)'+from,'next3',names),'DESC');
  assert.equal(top('SELECT *'+from+' ORDER BY p.id D¦','next3',names),'DESC');
  assert.equal(top('SELECT *'+from+' ORDER BY p.de¦','next3',names),'descending_noise');
 }
});

test('accepted complete suggestions remain valid SQLite in representative contexts',async()=>{
 const initialize=require('sql.js'),SQL=await initialize(),db=new SQL.Database();
 try{
  db.run('CREATE TABLE customers(customer_id INTEGER,first_name TEXT,last_name TEXT,debt_to_income_pct REAL,left_branch_code TEXT); CREATE TABLE loans(loan_id INTEGER,customer_id INTEGER,branch_id INTEGER); CREATE TABLE installments(installment_id INTEGER,loan_id INTEGER,due_amount REAL); CREATE TABLE orders(order_id INTEGER,customer_id INTEGER,amount REAL);');
  for(const [marked,tables] of [[screenshot.replace('¦','D¦'),schema],['SELECT * FROM customers c LE¦',linked],['SELECT * FROM customers c JOIN orders o ON¦',linked],['SELECT * FROM customers c ORDER BY c.customer_id D¦',schema],['SELECT SUM(i.due_amount) OVER (ORDER BY i.loan_id ROWS BETWEEN CURRENT ROW AND UNB¦) FROM installments i',schema],['SELECT customer_id, * FR¦ customers',schema]]){
   const result=suggestion(marked,'line',tables);assert(result,marked);const position=marked.indexOf('¦'),text=marked.replace('¦',''),completed=text.slice(0,result.start)+result.top+text.slice(position);assert.doesNotThrow(()=>db.exec(completed),completed);
  }
 }finally{db.close();}
});
