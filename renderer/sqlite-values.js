/* Lossless SQLite numeric transport; ordinary finite values keep their existing types. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SqliteValues=api;})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 function integerText(value){
  if(!value||typeof value!=='object'||Object.keys(value).length!==1||typeof value.sqliteIntegerText!=='string')return null;
  const text=value.sqliteIntegerText;
  if(!/^-?(?:0|[1-9]\d*)$/.test(text))return null;
  const n=BigInt(text);return n>=-9223372036854775808n&&n<=9223372036854775807n?text:null;
 }
 function realText(value){
  return value&&typeof value==='object'&&Object.keys(value).length===2&&value.sqliteType==='real'&&['Infinity','-Infinity','NaN'].includes(value.value)?value.value:null;
 }
 function realLiteral(value){const text=realText(value);return text==='Infinity'?'1e999':text==='-Infinity'?'-1e999':text==='NaN'?'NULL':null;}
 function encode(value){if(typeof value==='number'&&!Number.isFinite(value))return {sqliteType:'real',value:String(value)};if(typeof value!=='bigint')return value;const n=Number(value);return Number.isSafeInteger(n)?n:{sqliteIntegerText:String(value)};}
 function row(values){return values.map(encode);}
 function exec(db,sql,params){return db.exec(sql,params,{useBigInt:true}).map(r=>({...r,values:r.values.map(row)}));}
 function text(value){return integerText(value)??realText(value)??String(value??'');}
 function numericKey(value){const integer=integerText(value);if(integer!==null)return BigInt(integer).toString();return typeof value==='number'&&Number.isFinite(value)&&Math.abs(value)<=Number.MAX_SAFE_INTEGER?String(value):null;}
 function claim(text){if(text===undefined)return undefined;if(/^[+-]?\d+$/.test(text)){const n=BigInt(text);return n>=-9223372036854775808n&&n<=9223372036854775807n?encode(n):undefined;}const n=Number(text);return numericKey(n)===null?undefined:n;}
 return {integerText,realText,realLiteral,encode,row,exec,text,numericKey,claim};
});
