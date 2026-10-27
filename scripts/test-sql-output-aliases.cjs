'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test');
const {create}=require('../app/renderer/sql-completion.js');
const schema=[{name:'orders',columns:['order_id','customer_id','amount','total_raw']},{name:'customers',columns:['customer_id','name']}];
function suggest(marked,mode='next3',tables=schema,complete=create()){const position=marked.indexOf('¦');assert(position>=0);return complete({text:marked.replace('¦',''),position,mode,schema:tables});}
const top=(...args)=>suggest(...args)?.top??null;

test('ORDER BY and HAVING complete explicit output aliases in every suggestion mode',()=>{
 for(const mode of ['word','next1','next3','line']){
  for(const prefix of ['t','tot','total_rev'])assert.equal(top('SELECT SUM(amount) AS total_revenue FROM orders ORDER BY '+prefix+'¦',mode),'total_revenue');
  assert.equal(top('SELECT customer_id,SUM(amount) AS total_revenue FROM orders GROUP BY customer_id HAVING tot¦ > 100',mode),'total_revenue');
  assert.equal(top('SELECT customer_id,SUM(amount) AS total_revenue FROM orders GROUP BY customer_id HAVING customer_id>0 AND tot¦ > 100',mode),'total_revenue');
  assert.equal(top('SELECT SUM(amount) AS total_revenue FROM orders ORDER BY total_revenue D¦',mode),'DESC');
 }
});

test('quoted, Unicode, nested expressions and bare result aliases retain valid spelling',()=>{
 for(const [projection,prefix,expected] of [
  ['ROUND(AVG(amount),2) AS average_amount','aver','average_amount'],
  ['SUM(amount) AS "total revenue"','tot','"total revenue"'],
  ['SUM(amount) AS `total revenue`','tot','"total revenue"'],
  ['SUM(amount) AS [total revenue]','tot','"total revenue"'],
  ['SUM(amount) AS toplam_gelir','top','toplam_gelir'],
  ['COUNT(*) AS "order"','ord','"order"'],
  ['SUM(amount) total_revenue','tot','total_revenue'],
  ['amount * 2 AS doubled_amount','dou','doubled_amount'],
  ['CASE WHEN amount>0 THEN amount ELSE 0 END AS positive_amount','pos','positive_amount'],
  ['(SELECT COUNT(*) AS internal_count FROM customers) AS customer_count','cust','customer_count']
 ])assert.equal(top('SELECT '+projection+' FROM orders ORDER BY '+prefix+'¦'),expected,projection);
 assert.equal(top('SELECT SUM(amount) AS total_revenue, COUNT(*) AS order_count FROM orders ORDER BY total_revenue, ord¦'),'order_count');
});

test('aliases stay in their SELECT scope and do not become table-qualified columns',()=>{
 for(const sql of [
  'SELECT SUM(amount) AS total_revenue FROM orders; SELECT * FROM customers ORDER BY tot¦',
  'SELECT (SELECT SUM(amount) AS inner_total FROM orders) AS outer_total FROM customers ORDER BY inner_t¦',
  'SELECT (SELECT amount FROM orders ORDER BY outer_t¦) AS outer_total FROM customers',
  'WITH totals AS (SELECT SUM(amount) AS cte_total FROM orders) SELECT * FROM customers ORDER BY cte_t¦',
  'SELECT amount AS previous_total FROM orders UNION ALL SELECT customer_id AS current_total FROM customers ORDER BY previous_t¦',
  'SELECT SUM(amount) AS total_revenue FROM orders o ORDER BY o.total_rev¦',
  'SELECT SUM(amount) AS total_revenue, ROW_NUMBER() OVER (ORDER BY total_rev¦) FROM orders',
  'SELECT amount + total_rev¦ AS total_revenue FROM orders',
  'SELECT SUM(amount) AS total_revenue FROM orders ORDER BY "tot¦',
  "SELECT SUM(amount) AS total_revenue FROM orders ORDER BY 'tot¦",
  'SELECT SUM(amount) AS total_revenue FROM orders ORDER BY /* tot¦'
 ])assert.equal(top(sql),null,sql);
 assert.equal(top('SELECT * FROM orders WHERE EXISTS (SELECT SUM(amount) AS inner_total FROM orders HAVING inner_t¦ > 0)'),'inner_total');
 assert.equal(top('SELECT (SELECT SUM(amount) AS inner_total FROM orders) AS outer_total FROM customers ORDER BY outer_t¦'),'outer_total');
 const reusable=create();assert.equal(top('SELECT SUM(amount) AS total_revenue FROM orders ORDER BY tot¦','line',schema,reusable),'total_revenue');assert.equal(top('SELECT * FROM customers ORDER BY tot¦','line',schema,reusable),null);
});

test('duplicate names are excluded and schema columns remain available beside output aliases',()=>{
 assert.equal(top('SELECT amount AS total_revenue, customer_id AS total_revenue FROM orders ORDER BY total_rev¦'),null);
 assert.equal(top('SELECT SUM(amount) AS total_revenue FROM orders ORDER BY total_r¦'),'total_revenue');
 assert.equal(top('SELECT SUM(amount) AS total_revenue FROM orders HAVING total_r¦ > 100'),'total_revenue');
 assert.equal(top('SELECT SUM(amount) AS total_revenue FROM orders HAVING total_ra¦ > 100'),'total_raw');
 assert.equal(top('SELECT SUM(amount) AS total_revenue FROM orders ORDER BY am¦'),'amount');
 assert.equal(top('SELECT amount + 1 FROM orders ORDER BY am¦'),'amount');
 assert.equal(top('SELECT CAST(amount AS REAL) FROM orders ORDER BY REA¦'),null);
 assert.equal(top('SELECT amount AS total_revenue FROM orders ORDER BY ¦'),null);
});

test('accepted output aliases execute through SQLite without changing the query suffix',async()=>{
 const SQL=await require('sql.js')(),db=new SQL.Database();
 try{
  db.run('CREATE TABLE orders(order_id INTEGER,customer_id INTEGER,amount REAL,total_raw REAL); INSERT INTO orders VALUES(1,1,25,100),(2,1,15,120),(3,2,10,80); CREATE TABLE customers(customer_id INTEGER,name TEXT); INSERT INTO customers VALUES(1,\'A\'),(2,\'B\');');
  for(const marked of ['SELECT customer_id,SUM(amount) AS total_revenue FROM orders GROUP BY customer_id ORDER BY tot¦ DESC;','SELECT customer_id,SUM(amount) AS total_revenue FROM orders GROUP BY customer_id HAVING tot¦>20 ORDER BY total_revenue DESC;','SELECT ROUND(AVG(amount),2) AS "average amount" FROM orders HAVING aver¦ > 0;','SELECT amount * 2 doubled_amount FROM orders ORDER BY dou¦ DESC;']){
   const completion=suggest(marked);assert(completion,marked);const position=marked.indexOf('¦'),text=marked.replace('¦',''),accepted=text.slice(0,completion.start)+completion.top+text.slice(position);assert.doesNotThrow(()=>db.exec(accepted),accepted);assert(db.exec(accepted)[0].values.length>0,accepted);
  }
 }finally{db.close();}
});
