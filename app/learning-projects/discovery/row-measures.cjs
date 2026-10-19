'use strict';
// Explicit report measurements, never natural-language intent classification.
// Calendar order comes from the reviewed plan; no locale or date guessing.
const formats=['iso-date','iso-local-minute','iso-local-second','mdy-local-minute','dmy-local-minute'];
const {at}=require('./project-errors.js');
const fail=code=>{throw Error('PROJECT_REPORT_'+code);};
const numeric=c=>c&&['INTEGER','REAL'].includes(c.storage);
const exactKeys=(o,keys)=>!!o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join(',')===[...keys].sort().join(',');
function addColumns(transforms,columns){
 if(!Array.isArray(transforms)||transforms.length>8)fail('ROW_TRANSFORMS');
 for(const [i,t]of transforms.entries())at('/rowTransforms/'+i,()=>{
  if(typeof t?.as!=='string'||!t.as.trim()||t.as.length>128||t.as.includes('\0')||[...columns.keys()].some(k=>k.toLowerCase()===t.as.toLowerCase()))fail('ROW_OUTPUT_COLUMN');
  let storage;
  if(t.op==='product'){
   if(!exactKeys(t,['op','left','right','as'])||!numeric(columns.get(t.left))||!numeric(columns.get(t.right)))fail('ROW_PRODUCT');
   storage=columns.get(t.left).storage==='INTEGER'&&columns.get(t.right).storage==='INTEGER'?'INTEGER':'REAL';
  }else if(t.op==='calendar-date'){
   if(!exactKeys(t,['op','column','format','as'])||columns.get(t.column)?.storage!=='TEXT'||!formats.includes(t.format))fail('ROW_DATE');
   storage='TEXT';
  }else fail('ROW_TRANSFORM');
  columns.set(t.as,{name:t.as,storage});
 });
 return columns;
}
function calendarDate(value,format){
 if(value===null)return null;
 if(typeof value!=='string'||!formats.includes(format))fail('DATE_UNSUPPORTED');
 let match,y,m,d,h=0,min=0,s=0;
 if(format.startsWith('iso-')){
  const pattern=format==='iso-date'?/^(\d{4})-(\d{2})-(\d{2})$/:format==='iso-local-minute'?/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/:/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;
  match=pattern.exec(value);if(!match)fail('DATE_UNSUPPORTED');
  [,y,m,d,h='0',min='0',s='0']=match;
 }else{
  match=/^(\d{1,2})\/(\d{1,2})\/(\d{4}) (\d{1,2}):(\d{2})$/.exec(value);if(!match)fail('DATE_UNSUPPORTED');
  const [,first,second,year,hour,minute]=match;y=year;m=format==='mdy-local-minute'?first:second;d=format==='mdy-local-minute'?second:first;h=hour;min=minute;
 }
 [y,m,d,h,min,s]=[y,m,d,h,min,s].map(Number);
 const leap=y%4===0&&(y%100!==0||y%400===0),days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
 if(m<1||m>12||d<1||d>days[m-1]||h>23||min>59||s>59)fail('DATE_INVALID');
 return String(y).padStart(4,'0')+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0');
}
function product(a,b,storage){
 if(a===null||b===null)return null;
 if(storage==='INTEGER'){
  const v=BigInt(a)*BigInt(b);if(v>BigInt(Number.MAX_SAFE_INTEGER)||v<BigInt(Number.MIN_SAFE_INTEGER))fail('INTEGER_RANGE');return Number(v);
 }
 const v=a*b;if(!Number.isFinite(v)||Math.abs(v)>Number.MAX_SAFE_INTEGER||(v===0&&a!==0&&b!==0))fail('NUMERIC_RANGE');return v;
}
function calendarEvidence(values){
 // Report all matching formats, not a guessed locale. Removing a candidate at
 // its first mismatch is enough to prove it cannot represent the full column.
 const candidates=new Map(formats.map(format=>[format,{format,minimum:null,maximum:null}]));let present=0;
 for(const value of values){
  if(value===null)continue;present++;
  for(const [format,span] of candidates){
   try{const day=calendarDate(value,format);span.minimum=span.minimum===null||day<span.minimum?day:span.minimum;span.maximum=span.maximum===null||day>span.maximum?day:span.maximum;}
   catch{candidates.delete(format);}
  }
 }
 return {nonNullValues:present,matchingFormats:present?[...candidates.values()]:[],meaning:'Formats that parse every stored non-NULL cell. Multiple matches stay ambiguous; no automatic conversion, timezone or business-meaning verification.'};
}
function apply(transforms,data){
 const columns=new Map(data.columns.map(c=>[c.name,c]));addColumns(transforms,columns);
 for(const [i,t]of transforms.entries())at('/rowTransforms/'+i,()=>{
  const output=columns.get(t.as);
  if(t.op==='product'){
   const li=data.columns.findIndex(c=>c.name===t.left),ri=data.columns.findIndex(c=>c.name===t.right);
   for(const row of data.rows)row.push(product(row[li],row[ri],output.storage));
  }else{
   const ci=data.columns.findIndex(c=>c.name===t.column);
   for(const row of data.rows)row.push(calendarDate(row[ci],t.format));
  }
  data.columns.push(output);
 });
 return data;
}
module.exports={formats,addColumns,apply,calendarDate,calendarEvidence};
