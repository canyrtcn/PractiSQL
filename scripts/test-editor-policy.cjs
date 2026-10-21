'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test');
const {create}=require('../app/renderer/sql-completion.js'),presentation=require('../app/renderer/repair-presentation.js');
const schema=[{name:'customers',columns:['customer_id','name','city']},{name:'orders',columns:['order_id','customer_id','amount']}];
const complete=create();
function suggest(sql,mode='line',tables=schema){const marker=sql.indexOf('|'),text=sql.replace('|','');return complete({text,position:marker<0?text.length:marker,mode,schema:tables});}

test('an empty editor or completed statement never invents a new SELECT',()=>{
 for(const mode of ['word','next1','next3','line'])for(const sql of ['', ' ', 'SELECT 1;', 'SELECT 1;   ', 'SELECT 1;\n', '-- note\n', 'SELECT 1; /* done */'])assert.equal(suggest(sql,mode),null,mode+': '+sql);
 assert.equal(suggest('SELECT 1;\nSEL','word').top,'SELECT');
 assert.equal(suggest('SELECT 1;\nSEL','line').top,'SELECT * FROM');
});

test('values and numbers are never replaced by an arbitrary column or statement',()=>{
 for(const sql of ['SELECT * FROM customers c WHERE c.city = ','SELECT * FROM orders o WHERE o.amount > ','SELECT * FROM customers LIMIT ','SELECT * FROM customers LIMIT 10 OFFSET ','UPDATE customers SET city = ','SELECT 1 + ','INSERT INTO orders VALUES ('])assert.equal(suggest(sql),null,sql);
 assert.equal(suggest('SELECT SUM(o.am|) FROM orders o').top,'amount');
 assert.equal(suggest('SELECT COALESCE(SUM(o.am|),0) FROM orders o').top,'amount');
 assert.equal(suggest('SELECT * FROM orders o WHERE (o.am| > 10)').top,'amount');
});
test('word, next word, three words and line produce distinct lengths',()=>{
 const one=[schema[0]];
 assert.equal(suggest('SEL','word',one).top,'SELECT');
 assert.equal(suggest('SEL','next1',one).top,'SELECT *');
 assert.equal(suggest('SEL','next3',one).top,'SELECT * FROM customers;');
 assert.equal(suggest('SEL','line',one).top,'SELECT * FROM customers;');
 assert.equal(suggest('SELECT ','next1',one).top,'*');
 assert.equal(suggest('SELECT ','next3',one).top,'* FROM customers;');
 assert.equal(suggest('SELECT ','line',one).top,'* FROM customers;');
});
test('table and alias context selects real columns including a future FROM',()=>{
 assert.equal(suggest('SELECT c.na| FROM customers AS c JOIN orders o ON o.customer_id=c.customer_id').top,'name');
 assert.equal(suggest('SELECT o.am| FROM customers c JOIN orders AS o ON o.customer_id=c.customer_id').top,'amount');
 assert.equal(suggest('SELECT * FROM customers c WHERE c.ci').top,'city');
 assert.equal(suggest('SELECT na| FROM customers c').top,'name');
 assert.equal(suggest('SELECT * FROM main.customers AS c WHERE c.na').top,'name');
 assert.equal(suggest('SELECT * FROM customers ORDER B').top,'BY');
 assert.equal(suggest('SELECT * FROM customers LEFT JO').top,'JOIN');
 assert.equal(suggest('SELECT * FROM ord').top,'orders;');
 assert.equal(suggest('CREATE TABLE demo(id INT').top,'INTEGER');
 assert.equal(suggest('SELECT COU').top,'COUNT');
});
test('ambiguous sources and unrelated aliases are not guessed',()=>{
 for(const sql of ['SELECT * FROM ','SELECT * FROM customers c JOIN ','SELECT * FROM customers c WHERE ','SELECT x.na| FROM customers c','SELECT * FROM customers WHERE customer_id = 42 '])assert.equal(suggest(sql),null,sql);
 assert.equal(suggest('SELECT * FROM customers JOIN orders o ON o.ci'),null);
 assert.equal(suggest('SELECT * FROM customers c WHERE am'),null);
 assert.equal(suggest('SELECT (SELECT c.am| FROM orders c), (SELECT c.name FROM customers c)').top,'amount');
 assert.equal(suggest('SELECT (SELECT c.name FROM customers c), (SELECT c.am| FROM orders c)').top,'amount');
});
test('comments, strings, quoted partial identifiers and caret inside tokens stay untouched',()=>{
 for(const sql of ["SELECT 'FROM na",'-- SELECT na','SELECT 1 /* FROM na','SELECT "na','SELECT [na','SELECT `na','SELECT n|ame FROM customers'])assert.equal(suggest(sql),null,sql);
 assert.equal(suggest("SELECT 'it''s; FROM'; SEL",'word').top,'SELECT');
 assert.equal(suggest('/* ; ignored */ SELECT * FROM customers c WHERE c.na').top,'name');
 assert.equal(suggest('SELECT 1;\n-- explanation\nSEL','word').top,'SELECT');
});
test('line continuation uses declared foreign keys and retains composite tuples',()=>{
 const linked=[schema[0],{...schema[1],foreignKeys:[{id:0,seq:0,table:'customers',from:'customer_id',to:'customer_id'}]}];
 assert.equal(suggest('SELECT * FROM customers c LEFT JO','line',linked).top,'JOIN orders ON orders.customer_id = c.customer_id');
 assert.equal(suggest('SELECT * FROM customers c LEFT JO','next3',linked).top,'JOIN orders ON orders.customer_id');
 assert.equal(suggest('SELECT * FROM customers c JOIN ord','line',linked).top,'orders ON orders.customer_id = c.customer_id');
 assert.equal(suggest('SELECT * FROM customers c JOIN orders o ON ','line',linked).top,'o.customer_id = c.customer_id');
 const pair=[{name:'parent',columns:['a','b']},{name:'child',columns:['pa','pb'],foreignKeys:[{id:0,seq:0,table:'parent',from:'pa',to:'a'},{id:0,seq:1,table:'parent',from:'pb',to:'b'}]}];
 assert.equal(suggest('SELECT * FROM parent p JOIN child ch ON ','line',pair).top,'ch.pa = p.a AND ch.pb = p.b');
 const ambiguous=[linked[0],{...linked[1],foreignKeys:[...linked[1].foreignKeys,{id:1,seq:0,table:'customers',from:'other_id',to:'customer_id'}]}];
 assert.equal(suggest('SELECT * FROM customers c LEFT JO','line',ambiguous).top,'JOIN');
});
test('batch boundaries, edited statements, quoted names and full schema are respected',()=>{
 assert.equal(suggest('SELECT * FROM orders; SELECT c.na| FROM customers c').top,'name');
 assert.equal(suggest('SELECT * FROM orders o WHERE o.am').top,'amount');
 assert.equal(suggest('SELECT * FROM customers o WHERE o.am'),null);
 assert.equal(suggest('SEL','line',[{name:'order details',columns:['unit price']}]).top,'SELECT * FROM "order details";');
 assert.equal(suggest('SELECT * FROM order','word',[{name:'order details',columns:[]}]).top,'"order details"');
 const many=Array.from({length:80},(_,i)=>({name:'catalog_'+i,columns:['field_'+i]}));
 assert.equal(suggest('SELECT x.field_7| FROM catalog_79 x','word',many).top,'field_79');
 assert.equal(suggest('SEL| FROM customers','line',[schema[0]]).top,'SELECT *');
});
test('automatic repair diagnostics are removed only from successful presentation',()=>{
 const sql='```sql\nCREATE TABLE demo(note TEXT);\nINSERT INTO demo VALUES (\'## Neden hata oluşmuştu?\');\n```';
 for(const heading of ['## Neden hata oluşmuştu? 🛠','## Hatanın nedeni','## What went wrong','## Why the query failed','## Error explanation']){
  const original=sql+'\n\n'+heading+'\nInternal error: no such column l.loan_id.\n\n### Details\nDo not show these internal steps.\n\n## Database contents\nThe final database has useful data.';
  const options={automatic:true,completed:true,request:'Create a realistic database'};
  const shown=presentation.display(original,options);
  assert(shown.includes(sql),'SQL is byte-for-byte preserved');assert(!shown.includes('Internal error:'));assert(!shown.includes('internal steps'));assert(shown.includes('final database'));
  assert.equal(presentation.display(original,{...options,completed:false}),original);
  assert.equal(presentation.display(original,{...options,automatic:false}),original);
  assert.equal(presentation.display(original,{...options,request:'Explain this error and fix it'}),original);
 }
});
test('repair prompt is bilingual; explicit debugging and real errors remain visible',()=>{
 assert(presentation.instruction('Yeni bir veritabanı oluştur','tr').includes('iç turudur'));
 assert(presentation.instruction('Create a database','en').includes('internal application turn'));
 assert.equal(presentation.instruction('Bu hatayı açıkla ve düzelt','tr'),'');
 assert.equal(presentation.instruction('debug this SQL','en'),'');
 assert(presentation.instruction('Create a database without errors','en'));
 const text='The query failed: FOREIGN KEY constraint failed';
 assert.equal(presentation.display(text,{automatic:true,completed:false}),text);
 assert.equal(presentation.display('## SQL explanation\nUse LEFT JOIN.',{automatic:true,completed:true}),'## SQL explanation\nUse LEFT JOIN.');
});
