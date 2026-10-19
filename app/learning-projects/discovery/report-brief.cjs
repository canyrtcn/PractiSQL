'use strict';
const {normalize}=require('./report-measures.cjs');
// Render the measurable request from the same specification the evaluator uses.
// This is not an AI-derived answer or a technique hint. Optional business prose
// remains an unverified draft and cannot silently override these requirements.
function describe(spec,receipt,language='tr'){
 if(!['tr','en'].includes(language))throw Error('PROJECT_REPORT_LANGUAGE');
 const {spec:valid}=normalize(spec,receipt),tr=language==='tr',quote=s=>'“'+s+'”';
 const transform=d=>d.transform==='value'?quote(d.column):quote(d.column)+(tr?{year:' tarihinin yılı',month:' tarihinin ayı (01–12)','year-month':' tarihinin yıl-ayı'}:{year:' calendar year',month:' calendar month (01–12)','year-month':' calendar year-month'})[d.transform];
 const filters=items=>items.length?items.map(f=>{
  if(f.op==='is-null')return quote(f.column)+(tr?' eksik olan':' is missing');
  if(f.op==='not-null')return quote(f.column)+(tr?' eksik olmayan':' is present');
  const op=({eq:'=',ne:'≠',lt:'<',lte:'≤',gt:'>',gte:'≥'})[f.op];return quote(f.column)+' '+op+' '+JSON.stringify(f.value);
 }).join(tr?' ve ':' and '):(tr?'bütün kayıtlar':'all records');
 const stages=valid.stages.map((s,i)=>{
  const metrics=s.metrics.map(m=>{
   const metric=m.op==='count-rows'?(tr?'kayıt sayısı':'number of records'):m.op==='count'?(tr?quote(m.column)+' değeri bulunan kayıt sayısı':'number of records with '+quote(m.column)+' present'):m.op==='count-distinct'?(tr?quote(m.column)+' sütunundaki farklı NULL olmayan değerlerin sayısı':'number of distinct non-NULL values in '+quote(m.column)):quote(m.column)+' '+(tr?{sum:'toplamı',mean:'ortalaması',min:'en küçük değeri',max:'en büyük değeri'}:{sum:'total',mean:'average',min:'minimum',max:'maximum'})[m.op];
   const missing=m.op.startsWith('count')?(tr?'Uygun kayıt yoksa 0.':'Zero when there are no qualifying records.'):(tr?'Eksik değerler hesaba katılmaz; uygun dolu değer yoksa '+(m.empty==='zero'?'0':'boş (NULL)')+'.':'Exclude missing values; when no qualifying present value remains, report '+(m.empty==='zero'?'0':'NULL')+'.');
   return {name:m.as,request:metric,scope:filters(m.filters),missing,...(m.op==='count-distinct'?{identity:tr?'Eksik (NULL) değer sayılmaz. Boş metin ve boşluklar ayrı değerlerdir; dışlanmaları isteniyorsa kapsamda açıkça belirtilir. Farklı yazımlar birleştirilmez.':'NULL is excluded. Empty text and whitespace are values unless explicitly excluded in the scope. Different spellings are not merged.'}:{})};
  });
  return {source:i===0?receipt.table:(tr?'Bir önceki raporun satırları':'Rows of the previous report'),scope:filters(s.filters),oneRow:s.dimensions.length?s.dimensions.map(d=>transform(d)+' → '+quote(d.as)).join(', '):(tr?'Bütün kapsam için tek özet':'One summary for the entire scope'),measures:metrics};
 });
 const derived=valid.derived.map(d=>({name:d.as,request:d.op==='difference'?quote(d.left)+' − '+quote(d.right):d.op==='ratio'?quote(d.left)+' / '+quote(d.right):'100 × ('+quote(d.left)+' − '+quote(d.right)+') / '+quote(d.right),missing:d.op==='difference'?(tr?'Bir bileşen eksikse boş (NULL).':'NULL if a component is missing.'):(tr?'Bir bileşen eksikse veya bölme tabanı 0 ise boş (NULL).':'NULL if a component is missing or the denominator is zero.')}));
 const last=valid.stages.at(-1),columns=[...last.dimensions.map(d=>d.as),...last.metrics.map(m=>m.as),...valid.derived.map(d=>d.as)];
 const rowMeasures=(valid.rowTransforms||[]).map(t=>({name:t.as,request:t.op==='product'?quote(t.left)+' × '+quote(t.right):quote(t.column)+(tr?' içindeki takvim günü':' calendar date'),...(t.op==='calendar-date'?{format:t.format,meaning:tr?'Kaynakta yazan yerel takvim günü; saat dilimi dönüşümü yok. Gün/ay sırası bu biçime göre okunur; tahmin edilmez.':'Use the local calendar date as written; no timezone conversion. Day/month order follows this declared format, without guessing.'}:{meaning:tr?'Her özgün kayıtta ayrı hesaplanır. Bir bileşen eksikse sonuç boş (NULL); negatif ve sıfır değerler korunur.':'Calculate separately for each source record. NULL if a component is missing; retain negative and zero values.'})}));
 return {language,source:{name:receipt.name,url:receipt.source,rows:receipt.rowCount,sha256:receipt.sha256},...(valid.version===2?{rowMeasures}:{}),stages,derived,columns,order:valid.orderBy.length?valid.orderBy.map(o=>quote(o.column)+' '+(tr?(o.direction==='asc'?'artan':'azalan'):(o.direction==='asc'?'ascending':'descending'))).join(', '):(tr?'Satır sırası serbest':'Any row order'),notes:tr?['Verilen sütun sırasını koru; başlıkları değiştirebilirsin.','Yalnız veride görülen grupları raporla; tarih aralığındaki eksik dönemler kendiliğinden sıfır değildir.','Gözlemlerin iş anlamı ve kaynak birimleri ayrıca doğrulanmalıdır.']:['Keep the requested column order; aliases may differ.','Report observed groups only; unobserved calendar periods are not automatically zero.','Business meaning and source units still require separate verification.'],businessMeaningVerified:false};
}
module.exports={describe};
