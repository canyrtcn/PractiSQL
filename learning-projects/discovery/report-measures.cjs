'use strict';
// An optional project rubric engine. It evaluates a declared report specification
// over source records, without generating/executing reference SQL or interpreting
// a student's natural-language request. Business suitability is a separate review.
const {parseCsv,columnProfile,digest}=require('./verified-csv.cjs');
const rowMeasures=require('./row-measures.cjs');
const {at}=require('./project-errors.js');
const fail=code=>{throw Error('PROJECT_REPORT_'+code);};
const own=(o,keys)=>!!o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).every(k=>keys.includes(k));
const label=s=>typeof s==='string'&&!!s.trim()&&s.length<=128&&!s.includes('\0');
const numeric=c=>['INTEGER','REAL'].includes(c.storage);
const key=values=>JSON.stringify(values);
const binary=(a,b)=>Buffer.compare(Buffer.from(a,'utf8'),Buffer.from(b,'utf8'));
const compare=(a,b)=>a===b?0:a===null?-1:b===null?1:typeof a==='string'?binary(a,b):a<b?-1:1;
function filterValid(f,columns){
 if(!own(f,['column','op','value'])||!columns.has(f.column)||!['eq','ne','lt','lte','gt','gte','is-null','not-null'].includes(f.op))fail('FILTER');
 if(['is-null','not-null'].includes(f.op)){if(f.value!==null)fail('FILTER');}
 else{const c=columns.get(f.column);if(numeric(c)?typeof f.value!=='number'||!Number.isFinite(f.value)||Math.abs(f.value)>Number.MAX_SAFE_INTEGER:typeof f.value!=='string')fail('FILTER_TYPE');}
}
function datePart(value,transform){
 if(value===null)return null;
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))fail('DATE_UNSUPPORTED');
 const date=new Date(value+'T00:00:00Z');if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==value)fail('DATE_INVALID');
 return transform==='year'?value.slice(0,4):transform==='month'?value.slice(5,7):value.slice(0,7);
}
function matches(row,filters,index){return filters.every(f=>{
 const v=row[index.get(f.column)];if(f.op==='is-null')return v===null;if(f.op==='not-null')return v!==null;if(v===null)return false;
 const c=compare(v,f.value);return ({eq:c===0,ne:c!==0,lt:c<0,lte:c<=0,gt:c>0,gte:c>=0})[f.op];
});}
function normalize(spec,receipt){
 if(!own(spec,['version','sourceSha256','stages','derived','orderBy',...(spec?.version===2?['rowTransforms']:[])])||![1,2].includes(spec.version)||spec.sourceSha256!==receipt?.sha256||!Array.isArray(spec.stages)||!spec.stages.length||spec.stages.length>4||!Array.isArray(spec.derived)||!Array.isArray(spec.orderBy))fail('SPEC');
 let columns=new Map(receipt.columns.map(c=>[c.name,{name:c.name,storage:c.storage}]));
 const normalized=structuredClone(spec);let finalDimensions=[];
 if(spec.version===2)rowMeasures.addColumns(normalized.rowTransforms,columns);
 for(const [si,stage]of normalized.stages.entries())at('/stages/'+si,()=>{
  if(!own(stage,['dimensions','metrics','filters'])||!Array.isArray(stage.dimensions)||stage.dimensions.length>8||!Array.isArray(stage.metrics)||!stage.metrics.length||stage.metrics.length>16||!Array.isArray(stage.filters)||stage.filters.length>32)fail('STAGE');
  stage.filters.forEach((f,i)=>at('/filters/'+i,()=>filterValid(f,columns)));const next=new Map();
  const add=(as,storage)=>{if(!label(as)||[...next.keys()].some(k=>k.toLowerCase()===as.toLowerCase()))fail('OUTPUT_COLUMN');next.set(as,{name:as,storage});};
  for(const [i,d]of stage.dimensions.entries())at('/dimensions/'+i,()=>{
   if(!own(d,['column','transform','as'])||!columns.has(d.column)||!['value','year','month','year-month'].includes(d.transform))fail('DIMENSION');
   if(d.transform!=='value'&&columns.get(d.column).storage!=='TEXT')fail('DATE_COLUMN');
   add(d.as,d.transform==='value'?columns.get(d.column).storage:'TEXT');
  });
  for(const [i,m]of stage.metrics.entries())at('/metrics/'+i,()=>{
   if(!own(m,['op','column','as','filters','empty'])||!['count-rows','count','sum','mean','min','max',...(spec.version===2?['count-distinct']:[])].includes(m.op)||!Array.isArray(m.filters)||m.filters.length>32||!['null','zero'].includes(m.empty))fail('METRIC');
   if(m.op==='count-rows'?m.column!==null:!columns.has(m.column))fail('METRIC_COLUMN');
   if(['sum','mean','min','max'].includes(m.op)&&!numeric(columns.get(m.column)))fail('NUMERIC_COLUMN');
   if(m.op.startsWith('count')&&m.empty!=='zero')fail('COUNT_EMPTY');
   m.filters.forEach((f,j)=>at('/filters/'+j,()=>filterValid(f,columns)));
   add(m.as,m.op.startsWith('count')?'INTEGER':m.op==='mean'?'REAL':columns.get(m.column).storage);
  });
  finalDimensions=stage.dimensions.map(d=>d.as);columns=next;
 });
 if(normalized.derived.length>8)fail('DERIVED');
 for(const [i,d]of normalized.derived.entries())at('/derived/'+i,()=>{
  if(!own(d,['op','left','right','as'])||!['difference','ratio','percent-change'].includes(d.op)||!numeric(columns.get(d.left)||{})||!numeric(columns.get(d.right)||{})||!label(d.as)||[...columns.keys()].some(k=>k.toLowerCase()===d.as.toLowerCase()))fail('DERIVED');
  columns.set(d.as,{name:d.as,storage:'REAL'});
 });
 const sorted=new Set();for(const [i,o]of normalized.orderBy.entries())at('/orderBy/'+i,()=>{
  if(!own(o,['column','direction'])||!columns.has(o.column)||!['asc','desc'].includes(o.direction)||sorted.has(o.column))fail('ORDER');sorted.add(o.column);
 });
 // A declared order must resolve every tie through the complete grouping key.
 // An unspecified order is compared as a set of uniquely identified groups.
 if(normalized.orderBy.length&&finalDimensions.some(d=>!sorted.has(d)))at('/orderBy',()=>fail('ORDER_TIES'));
 return {spec:normalized,columns:[...columns.values()],dimensions:finalDimensions};
}
function sourceRows(receipt,bytes){
 if(!(bytes instanceof Uint8Array)||digest(bytes)!==receipt.sha256)fail('SOURCE_DIGEST');
 const parsed=parseCsv(bytes);if(parsed.contentSha256!==receipt.contentSha256||parsed.rows.length!==receipt.rowCount||parsed.columns.some((c,i)=>c!==receipt.columns[i]?.name)||parsed.columns.length!==receipt.columns.length)fail('SOURCE_CONTENT');
 const profiles=parsed.columns.map((name,i)=>columnProfile(name,parsed.rows.map(r=>r[i]),receipt.columns[i].metadata,receipt.metadata.missingValueSymbol));
 if(profiles.some((p,i)=>p.storage!==receipt.columns[i].storage))fail('SOURCE_TYPES');
 return {columns:receipt.columns.map(c=>({name:c.name,storage:c.storage})),rows:parsed.rows.map((_,i)=>profiles.map(p=>p.values[i]))};
}
function aggregate(rows,m,index,columns){
 const selected=rows.filter(r=>matches(r,m.filters,index));if(m.op==='count-rows')return selected.length;
 const values=selected.map(r=>r[index.get(m.column)]).filter(v=>v!==null);
 if(m.op==='count')return values.length;
 if(m.op==='count-distinct')return new Set(values).size;
 if(!values.length)return m.empty==='zero'?0:null;
 if(m.op==='min'||m.op==='max')return values.reduce((a,b)=>m.op==='min'?Math.min(a,b):Math.max(a,b));
 let total;
 if(columns.get(m.column).storage==='INTEGER'){
  const exact=values.reduce((s,v)=>s+BigInt(v),0n);
  if(exact>BigInt(Number.MAX_SAFE_INTEGER)||exact<BigInt(Number.MIN_SAFE_INTEGER))fail('INTEGER_RANGE');
  total=Number(exact);
 }else{
  // Compensated summation avoids losing a small amount when large positive
  // and negative records cancel. It is still floating point, not exact money.
  let sum=0,correction=0;for(const value of values){const next=sum+value;correction+=Math.abs(sum)>=Math.abs(value)?(sum-next)+value:(value-next)+sum;sum=next;}total=sum+correction;
  if(!Number.isFinite(total)||Math.abs(total)>Number.MAX_SAFE_INTEGER)fail('NUMERIC_RANGE');
 }
 return m.op==='mean'?total/values.length:total;
}
function evaluate(spec,receipt,bytes){
 const contract=normalize(spec,receipt);let data=sourceRows(receipt,bytes);
 if(spec.version===2)data=rowMeasures.apply(contract.spec.rowTransforms,data);
 const stages=[];
 for(const [si,stage]of contract.spec.stages.entries())at('/stages/'+si,()=>{
  const index=new Map(data.columns.map((c,i)=>[c.name,i])),columns=new Map(data.columns.map(c=>[c.name,c])),groups=new Map();
  if(!stage.dimensions.length)groups.set('[]',{dimensions:[],rows:[]});
  const filtered=data.rows.filter(r=>matches(r,stage.filters,index));
  for(const row of filtered){
   const dimensions=stage.dimensions.map((d,i)=>d.transform==='value'?row[index.get(d.column)]:at('/dimensions/'+i,()=>datePart(row[index.get(d.column)],d.transform)));
   const id=key(dimensions);if(!groups.has(id))groups.set(id,{dimensions,rows:[]});groups.get(id).rows.push(row);
  }
  if(groups.size>5000)fail('OUTPUT_TOO_LARGE');
  const rows=[...groups.values()].map(g=>[...g.dimensions,...stage.metrics.map((m,i)=>at('/metrics/'+i,()=>aggregate(g.rows,m,index,columns)))]);
  const outputColumns=[...stage.dimensions.map(d=>({name:d.as,storage:d.transform==='value'?columns.get(d.column).storage:'TEXT'})),...stage.metrics.map(m=>({name:m.as,storage:m.op.startsWith('count')?'INTEGER':m.op==='mean'?'REAL':columns.get(m.column).storage}))];
  stages.push({inputRows:data.rows.length,selectedRows:filtered.length,outputRows:rows.length,columns:outputColumns});data={columns:outputColumns,rows};
 });
 for(const [i,d]of contract.spec.derived.entries())at('/derived/'+i,()=>{
  const li=data.columns.findIndex(c=>c.name===d.left),ri=data.columns.findIndex(c=>c.name===d.right);
  for(const row of data.rows){const a=row[li],b=row[ri];let value=a===null||b===null?null:d.op==='difference'?a-b:b===0?null:d.op==='ratio'?a/b:100*(a-b)/b;if(value!==null&&(!Number.isFinite(value)||Math.abs(value)>Number.MAX_SAFE_INTEGER))fail('NUMERIC_RANGE');row.push(value);}
  data.columns.push({name:d.as,storage:'REAL'});
 });
 const order=contract.spec.orderBy.map(o=>({index:data.columns.findIndex(c=>c.name===o.column),factor:o.direction==='asc'?1:-1}));
 if(order.length)data.rows.sort((a,b)=>{for(const o of order){const c=compare(a[o.index],b[o.index]);if(c)return c*o.factor;}return 0;});
 const specSha256=digest(JSON.stringify(contract.spec));
 return {version:1,sourceSha256:receipt.sha256,specSha256,columns:data.columns.map(c=>c.name),columnTypes:data.columns.map(c=>c.storage),values:data.rows,dimensionCount:contract.dimensions.length,ordered:order.length>0,stages,method:'Direct record computation; no reference SQL, no model judge.',businessMeaningVerified:false};
}
function assess(actual,expected){
 if(!expected||!Array.isArray(expected.values)||!Number.isSafeInteger(expected.dimensionCount))fail('EXPECTED');
 const result={correct:false,scope:'Result equality against a declared report specification, not verification of the business assignment or explanation.',businessMeaningVerified:false};
 if(!actual||actual.limited||!Array.isArray(actual.columns)||actual.columns.length!==expected.columns.length||!Array.isArray(actual.values)||actual.values.length!==expected.values.length||actual.values.some(r=>!Array.isArray(r)||r.length!==expected.columns.length))return {...result,reason:'shape-or-completeness'};
 const same=(a,b,i)=>{
  if(i<expected.dimensionCount||typeof b!=='number')return a===b;
  if(typeof a!=='number'||!Number.isFinite(a))return false;
  // Exact integer counts/totals; REAL measures may have binary rounding error.
  // Scale only by floating-point roundoff, not a percentage of a large total.
  // A 1e-9 relative tolerance would incorrectly accept an error of 1,000 at 1e12.
  return expected.columnTypes[i]==='INTEGER'?a===b:Math.abs(a-b)<=Math.max(1e-9,Math.abs(b)*Number.EPSILON*8);
 };
 let rows=actual.values;
 if(!expected.ordered){const byKey=new Map();for(const row of rows){const id=key(row.slice(0,expected.dimensionCount));if(byKey.has(id))return {...result,reason:'duplicate-group'};byKey.set(id,row);}rows=expected.values.map(r=>byKey.get(key(r.slice(0,expected.dimensionCount))));}
 const correct=expected.values.every((row,i)=>rows[i]&&row.every((v,j)=>same(rows[i][j],v,j)));
 return {...result,correct,reason:correct?'declared-result-matched':'values-or-order'};
}
module.exports={normalize,evaluate,assess};
