(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AiWaitProgress=api;})(typeof globalThis==='object'?globalThis:this,function(){
 // Time changes reassurance, never claims a completed table or a percentage.
 const words={
  tr:{
   build:[['Veritabanını tasarlıyorum','Tablolar, ilişkiler ve örnek veriler hazırlanıyor. Bu işlem birkaç dakika sürebilir.'],['Hâlâ buradayım','Kapsamlı bir tasarım biraz zaman alabilir. Yanıtı bekliyorum.'],['Tablolar ve ilişkiler için çalışıyorum','Veritabanı taslağının tamamlanmasını bekliyoruz.'],['Yanıt hazırlanıyor','İşlem sürüyor. Hazır olduğunda burada göreceksin.']],
   query:[['Sorgun hazırlanıyor','Sorun ve mevcut veritabanın için yanıt bekliyorum.'],['Hâlâ buradayım','Yanıt hazırlanıyor; işlem devam ediyor.'],['Sorgun üzerinde çalışılıyor','Yanıt tamamlanınca sonucu burada göreceksin.']],
   data:[['Örnek veriler hazırlanıyor','Mevcut tablolarına uygun veri için yanıt bekliyorum.'],['Hâlâ buradayım','Örnek veriler için işlem sürüyor.'],['Yanıt hazırlanıyor','Tamamlanınca verileri burada göreceksin.']],
   checking:['Yanıtı gözden geçiriyorum','Sorgu ve veritabanı kuralları kontrol ediliyor.'],
   applying:['Veritabanın hazırlanıyor','Tablolar ve örnek veriler uygulamaya aktarılıyor.'],
   reading:['Sonucun hazırlanıyor','Sorgu çalıştırılıyor; sonucu birazdan burada göreceksin.']
  },
  en:{
   build:[['Designing your database','Preparing tables, relationships and sample data. This can take a few minutes.'],['Still here','A detailed design can take a little time. Waiting for the response.'],['Working on tables and relationships','Waiting for the database draft to finish.'],['Your response is being prepared','The request is still in progress. It will appear here when ready.']],
   query:[['Preparing your query','Waiting for a response to your question about this database.'],['Still here','Your response is being prepared; the request is in progress.'],['Working on your query','The result will appear here when the response is complete.']],
   data:[['Preparing sample data','Waiting for data suited to your existing tables.'],['Still here','The sample-data request is in progress.'],['Your response is being prepared','The data will appear here when ready.']],
   checking:['Reviewing the response','Checking the query and database constraints.'],
   applying:['Preparing your database','Applying the tables and sample data in the app.'],
   reading:['Preparing your result','Running the query; the result will appear here when ready.']
  }
 };
 function describe({kind='query',phase='waiting',elapsedMs=0}={},language='tr'){
  const w=words[language==='en'?'en':'tr'],seconds=Math.max(0,Math.floor(elapsedMs/1000));
  const messages=w[kind]||w.query,index=seconds<12?0:seconds<30?1:seconds<60?2:kind==='build'?3:2;
  const pair=phase==='waiting'?messages[Math.min(index,messages.length-1)]:(w[phase]||w.checking);
  return {heading:pair[0],detail:pair[1],elapsed:Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0'),long:seconds>=12,kind,phase};
 }
 return {describe};
});
