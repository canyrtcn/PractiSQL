// Study material from recorded exam answers; never executes SQL or calls a provider.
(function(root){
 const E=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
 const lessons=[
  [/\bJOIN\b|ilişki|relationship/i,
   ['JOIN ve ilişkiler','JOIN and relationships'],
   ['Önce bir sonuç satırının neyi temsil ettiğini seç. ON koşulunda gerçek FK ve hedef anahtarın bütün alanlarını eşleştir. LEFT JOIN eşleşmeyen ana kayıtları da tutar; sağ tarafın koşulunu WHERE içinde kullanmak bu kayıtları eleyebilir. Birden çok bağımsız çocuk tabloyu doğrudan birleştirmek sayıları çarpabilir; ayrı özetleyip ana tabloya bağla.','First decide what one result row represents. Match every field of the actual FK and referenced key in ON. LEFT JOIN keeps unmatched parent rows; filtering the right side in WHERE can remove them. Joining multiple independent child branches can multiply counts; aggregate branches separately before joining.'],
   ['Bir ana kaydı elle seç. Bağlı çocuklarını say ve JOIN sonucuyla karşılaştır. Çocuksuz bir kaydı da kontrol et.','Choose one parent by hand. Count its related children and compare with the JOIN output. Check a parent with no children too.']],
  [/\bOVER\b|\bLAG\b|\bRANK\b|pencere|window/i,
   ['Pencere fonksiyonları','Window functions'],
   ['OVER hesaplamanın penceresini tanımlar; PARTITION BY ayrı grupları, ORDER BY grup içi sırayı belirler. Koşan toplamda ROWS çerçevesini açık yaz ve eşit değerler için anahtar ekle. DENSE_RANK eşit değerlere aynı sıra verir. Pencere sonucunu filtrelemek için önce CTE/alt sorguda hesapla.','OVER defines the calculation window; PARTITION BY separates groups and ORDER BY sets their order. Use an explicit ROWS frame for a running total and a key to break ties. DENSE_RANK gives ties the same rank. Compute a window result in a CTE/subquery before filtering it.'],
   ['Eşit değerli iki satır ve tek satırlı bir grup eklenen ayrı örnek veride sıralama ve ilk LAG sonucunu incele.','On separate practice data, check two tied rows and a one-row group, including the first LAG result.']],
  [/\bCOUNT\b|\bSUM\b|\bAVG\b|\bGROUP\b|\bHAVING\b|grup|aggregate/i,
   ['Gruplama ve sayma','Grouping and counting'],
   ['WHERE satırları, HAVING grupları süzer. COUNT(*) satırları, COUNT(alan) NULL olmayan alanları sayar. LEFT JOIN sonrasında çocuk sayısı için çocuğun zorunlu anahtarını say; COUNT(*) çocuksuz ana kaydı da bir satır sayar. Ortalama alırken hangi ana kayıtların ve sıfırların kapsama girdiğini belirle.','WHERE filters rows; HAVING filters groups. COUNT(*) counts rows and COUNT(column) counts non-NULL values. After LEFT JOIN, count a required child key for child counts; COUNT(*) also counts the unmatched parent row. Define which parents and zero counts belong in an average.'],
   ['Sıfır, bir ve birden çok çocuğu olan üç ana kayıt için beklenen sayıları önce elle hesapla.','First calculate expected counts by hand for parents with zero, one and multiple children.']],
  [/\bRECURSIVE\b|özyine|hiyerar|descendant|ancestor/i,
   ['Özyinelemeli sorgu','Recursive queries'],
   ['Başlangıç kaydı ve her adımda izlenen yön ayrı belirlenir. FK çocuk kayıttan parent’a gider; alt kayıtları bulmak için çocuğun parent alanını mevcut kimlikle eşleştir. Kökün sonuca dahil olup olmayacağını ve döngü ihtimalini düşün. UNION ile UNION ALL farklı tekrar davranışı gösterir.','Choose the starting row and traversal direction separately. An FK goes from child to parent; find descendants by matching a child’s parent field to the current ID. Decide whether to include the root and account for cycles. UNION and UNION ALL handle duplicates differently.'],
   ['Üç seviyeli küçük bir ağaç çiz; beklenen kimlikleri ve mesafelerini SQL sonucuyla karşılaştır.','Draw a three-level tree and compare the expected IDs and distances with the query output.']],
  [/\bNULL\b|boş/i,
   ['NULL ve eksik değerler','NULL and missing values'],
   ['NULL eksik/bilinmeyen değerdir. = NULL yerine IS NULL kullan. COUNT(alan) NULL’u atlar. NOT IN listesindeki NULL sonucu belirsiz yapabilir; ilişkili NOT EXISTS ile kayıt yokluğunu sınayabilirsin. NOT NULL boş metni engellemez.','NULL is missing/unknown. Use IS NULL instead of = NULL. COUNT(column) skips NULLs. A NULL in a NOT IN list can make the result unknown; correlated NOT EXISTS can test record absence. NOT NULL does not reject empty text.'],
   ['NULL, boş metin ve normal değer bulunan ayrı örneklerde aynı filtreyi dene ve farkı açıklamaya çalış.','Try the same filter on separate examples containing NULL, empty text and a normal value; explain the differences.']],
  [/\bORDER\b|\bLIMIT\b|sıral|sort/i,
   ['Sıralama ve kapsam','Ordering and scope'],
   ['ORDER BY sonucu sıralar; LIMIT dönen satırları sınırlar. Aynı değere sahip kayıtlar için benzersiz anahtarı da sıraya ekle. LIMIT sonrası sıralama ile sıralama sonrası LIMIT farklı soruları cevaplayabilir.','ORDER BY sorts the result; LIMIT restricts returned rows. Add a unique key to order ties. Sorting after LIMIT can answer a different question from limiting after sorting.'],
   ['İki eşit değerli kayıtla ilk-N sonucunun ve anahtar sırasının kararlı olup olmadığını kontrol et.','Check first-N results and key ordering using two tied records.']],
 ];
 function build(context){
  const lang=context.lang==='en'?'en':'tr',n=lang==='en'?1:0,words=(tr,en)=>n?en:tr;
  const wrong=context.items.filter(item=>item.ok===false);
  const title=words('Sınavdan çalışma defterin','Your exam study workbook');
  let body='<style>.hdr{padding-bottom:12px;margin-bottom:16px}h1{font-size:26px;margin-bottom:10px}.exam-study-item{margin-top:22px;break-before:auto}.exam-study-item h2{margin-bottom:10px}.exam-study-item h3{margin:10px 0 5px}.exam-study-item p{margin-bottom:6px}.exam-study-item .card{padding:8px 12px;margin:9px 0}.exam-study-item pre{padding:8px 10px;margin:6px 0;line-height:1.5}.exam-study-item .card{break-inside:auto}.exam-study-item .writing-lines{break-inside:avoid}.exam-study-item h2,.exam-study-item h3{break-after:avoid}</style><h1>'+E(title)+'</h1><p>'+E(words('Yanlış cevaplarını anlayarak yeniden dene. Bu belge sınavdaki kaydedilmiş AI değerlendirmesini ve SQL çalıştırma kontrollerini gösterir; değerlendirme bir doğruluk garantisi değildir.','Understand your mistakes and try again. This document uses the recorded AI exam grading and SQL execution checks; grading is not an accuracy guarantee.'))+'</p>';
  for(const [index,item]of wrong.entries()){
   const content=item.q+'\n'+item.u+'\n'+item.a,selected=lessons.filter(l=>l[0].test(content)).slice(0,3);
   body+='<section class="exam-study-item"><h2>'+E(words('Tekrar çalış','Review'))+' '+(index+1)+'</h2><div class="card"><h3>'+E(words('Soru','Question'))+'</h3><p>'+E(item.q)+'</p>'+(item.template?'<pre>'+E(item.template)+'</pre>':'')+'<h3>'+E(words('Senin cevabın','Your answer'))+'</h3><pre>'+E(item.u||words('Cevap verilmedi.','No answer was given.'))+'</pre></div>';
   if(item.execution)body+='<div class="card"><h3>'+E(words('SQL çalışma kontrolü','SQL execution check'))+'</h3><pre>'+E(item.execution)+'</pre><p>'+E(words('Çalışması, sorunun bütün koşullarını doğru yanıtladığını tek başına kanıtlamaz.','Successful execution alone does not prove that every question requirement was met.'))+'</p></div>';
   body+='<div class="card teacher"><h3>'+E(words('Sınavdaki AI düzeltmesi ve açıklaması','Recorded AI correction and explanation'))+'</h3><pre>'+E(item.a||words('Kaydedilmiş açıklama yok.','No explanation was recorded.'))+'</pre></div>';
   if(!selected.length)body+='<h3>'+E(words('Soruyu parçalara ayır','Break down the question'))+'</h3><p>'+E(words('İstenen sütunları, filtreleri, hangi kayıtların kapsama girdiğini ve beklenen sıralamayı tek tek yaz. Kaydedilmiş çözümde her koşulun nerede karşılandığını bul; belirsiz noktayı şema ve örnek kayıtlarla doğrula.','List requested columns, filters, included records and expected order. Locate where each condition is met in the recorded solution; check uncertainty against the schema and sample records.'))+'</p>';
   for(const lesson of selected)body+='<h3>'+E(lesson[1][n])+'</h3><p>'+E(lesson[2][n])+'</p><div class="card"><b>'+E(words('Kendin dene','Try it yourself'))+'</b><p>'+E(lesson[3][n])+'</p></div>';
   body+='<h3>'+E(words('Yeniden çözüm alanı','Try again'))+'</h3><div class="writing-lines" style="height:66px"></div></section>';
  }
  if(context.schema)body+='<section><h2>'+E(words('Sınav anındaki şema','Schema at exam time'))+'</h2><pre>'+E(context.schema)+'</pre></section>';
  return {html:root.StudyNotes.shell(title,context.meta||'',body,context.mascot,lang),wrongCount:wrong.length};
 }
 root.ExamStudy={build};
})(typeof window==='undefined'?globalThis:window);
