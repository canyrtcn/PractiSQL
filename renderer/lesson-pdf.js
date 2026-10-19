/* Lesson-only authoring context. Never executes model-generated SQL or reads the learner's database. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.LessonPdf=api;})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  const quote=s=>'"'+String(s).replace(/"/g,'""')+'"';
  function tableState(db){
    const definitions=db.exec("SELECT name,sql FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")[0]?.values||[];
    return Object.fromEntries(definitions.map(([name,ddl])=>[name,{ddl,rows:db.exec('SELECT * FROM '+quote(name))[0]||{columns:[],values:[]}}]));
  }
  function reference(SQL,fixtures,sql){
    const db=new SQL.Database();
    try{
      db.exec('PRAGMA foreign_keys=ON');
      for(const f of fixtures){db.exec(f.ddl);db.exec(f.seed);}
      const before=tableState(db),sqliteVersion=db.exec('SELECT sqlite_version()')[0].values[0][0];
      const results=[];let error=null;
      try{
        for(const statement of db.iterateStatements(sql)){
          const columns=statement.getColumnNames(),values=[];
          while(statement.step())values.push(statement.get());
          if(columns.length)results.push({sql:statement.getSQL(),columns,values});
        }
      }catch(e){error=String(e.message||e);}
      const after=tableState(db),changes=[];
      for(const name of new Set([...Object.keys(before),...Object.keys(after)])){
        if(JSON.stringify(before[name])!==JSON.stringify(after[name]))changes.push({table:name,before:before[name]||null,after:after[name]||null});
      }
      return {sql,sqliteVersion,foreignKeys:true,results,error,changes};
    }finally{db.close();}
  }
  function build({language,lesson,detail,fixtures,persona,SQL}){
    const lang=language==='en'?'en':'tr',localized=lesson[lang],title=String(localized.title||lesson.id).replace(/^\d+\.\s*/,'');
    if(!persona?.trim())throw new Error('Lesson authoring requires the application teacher persona');
    const sqls=[...(lesson.ex||[]).map(e=>lang==='en'?(e.sqlEn||e.sql):e.sql),...Array.from(String(detail||'').matchAll(/```sql\s*\n([\s\S]*?)```/g),m=>m[1])];
    const executions=[...new Set(sqls.map(s=>String(s||'').trim()).filter(Boolean))].map(sql=>reference(SQL,fixtures,sql));
    const contract=lang==='en'
      ? 'Write a self-contained SQLite lesson for a printable PDF. Return only an HTML body using h2/h3/p/ul/ol/table/pre/code tags, with no scripts. Explain the topic, why it matters and the steps; include at least three worked examples, common mistakes and a mini exercise. Use the supplied lesson dataset and reference executions; show the relevant starting data so results can be understood. Each reference example starts from a fresh copy of that dataset, independently of the others. Empty results mean no result set for that code, not a table with zero matching rows; distinguish SELECT output, data/schema changes and errors. For new illustrative examples, state the input and assumptions and distinguish expected outcomes from supplied engine observations. Do not attribute this dataset to the student’s workspace. This is written instruction only: the application does not execute the PDF’s generated SQL. Explain transaction commands when the lesson requires them; ordinary SQLite semantics apply here.'
      : 'Yazdırılabilir PDF için kendi içinde anlaşılır bir SQLite dersi yaz. Yalnız h2/h3/p/ul/ol/table/pre/code etiketleriyle HTML gövde döndür; script kullanma. Konuyu, önemini ve adımlarını anlat; en az üç açıklamalı örnek, sık hatalar ve mini alıştırma ekle. Verilen ders veri setini ve referans yürütmelerini kullan; sonuçların anlaşılması için ilgili başlangıç kayıtlarını göster. Her referans örnek, diğerlerinden bağımsız olarak aynı veri setinin yeni kopyasında başlar. Boş results dizisi o kodun sonuç kümesi döndürmediğini belirtir; sıfır eşleşmeli tablo anlamına gelmez. SELECT çıktısını, veri/şema değişikliğini ve hatayı ayır. Yeni açıklama örneklerinde başlangıç verisini ve varsayımları belirt; beklenen sonuç ile sağlanan motor gözlemini ayır. Bu veri setini öğrencinin çalışma alanı gibi anlatma. Bu yalnız yazılı derstir: PDF’te üretilen SQL’i uygulama çalıştırmaz. Konu gerektiriyorsa işlem komutlarını anlat; burada SQLite’ın doğal davranışı geçerlidir.';
    const user='Topic: '+title+'\nLesson overview:\n'+localized.body+'\nFull lesson text:\n'+String(detail||'')+
      '\nLesson dataset — exact definitions and initial records (not the active workspace):\n'+fixtures.map(f=>f.ddl+';\n'+f.seed+';').join('\n')+
      '\nSQLite reference executions — each independently starts from the lesson dataset; changes show state immediately after the code, not an assertion that an open transaction was committed:\n'+JSON.stringify(executions);
    return {title,language:lang,executions,messages:[{role:'system',content:persona+'\n\n'+contract},{role:'user',content:user}]};
  }
  return {build,reference};
});
