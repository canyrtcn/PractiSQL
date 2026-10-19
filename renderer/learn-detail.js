// Detayli ders icerikleri: LEARN_DETAIL[dersId] = { tr, en }.
// Markdown + ```sql bloklari (renderRich ile gosterilir).
// Ornekler LEARN_FIXTURE tablolarina birebir uyar (musteriler/siparisler/hesap).
var LEARN_DETAIL = {
select: {
tr: `**Nedir?** SELECT, tablodan hangi sütunları göreceğini söyler. \`*\` bütün sütunları getirir; yalnız gerekenleri seçmek sonucu sadeleştirir ve taşınan veri miktarını azaltabilir.

**Neden önemli?** SELECT ile sütun seçmek, filtreli ve gruplandırılmış sonuçları okumayı kolaylaştırır. WITH ve VALUES ile başlayan okumalar da vardır.

**Örnek 1 — Sütun seçmek**
\`\`\`sql
SELECT ad, sehir FROM musteriler;
\`\`\`
Sadece ad ve şehir gelir; id sütunu gelmez. Daha az sütun, bu örnekte daha az veri taşır; hız farkı sorgu planına ve veriye bağlıdır.

**Örnek 2 — Takma ad (AS)**
\`\`\`sql
SELECT ad AS musteri, sehir AS il FROM musteriler;
\`\`\`
AS, başlıkları rapor diline çevirir. Tabloyu belgeye dönüştürmenin ilk adımıdır.

**Sık hata:** Metin değerleri tek tırnakla yazılır; \`WHERE sehir = Istanbul\` hatalıdır, \`'Istanbul'\` doğrudur.

**Kendin dene:** Sadece Ankaralıların adlarını getiren sorguyu yaz.`,
en: `**What is it?** SELECT says which columns you want to see. \`*\` returns every column; selecting only what you need makes results clearer and can reduce data transfer.

**Why it matters:** Selecting columns with SELECT helps you read filtered and grouped results. Read queries can also begin with WITH or VALUES.

**Example 1 — Picking columns**
\`\`\`sql
SELECT name, city FROM customers;
\`\`\`
Only name and city come back; id stays out. Fewer columns transfer less data here; the speed difference depends on the plan and data.

**Example 2 — Aliases (AS)**
\`\`\`sql
SELECT name AS customer, city AS town FROM customers;
\`\`\`
AS translates headers into report language. It is the first step of turning a table into a document.

**Common mistake:** Text values need single quotes; \`WHERE city = Ankara\` fails, \`'Ankara'\` works.

**Try it yourself:** Write a query that fetches only the names of customers in Ankara.` },
where: {
tr: `**Nedir?** WHERE satırları eler; koşula uymayan satır gelmez. Metinlerde \`=\` ve \`LIKE\`, sayılarda \`>\`, \`<\`, \`BETWEEN\` kullanılır.

**Neden önemli?** WHERE, rapora hangi kayıtların katılacağını belirler. Bütün kayıtların gerektiği bir raporda filtre kullanmayabilirsin.

**Örnek 1 — Eşitlik ve LIKE**
\`\`\`sql
SELECT ad FROM musteriler WHERE sehir = 'Istanbul';
\`\`\`
2 satır döner: Ayşe Yılmaz ve Ali Veli. Desen aramak için \`WHERE ad LIKE 'A%'\` yazılır (A ile başlayanlar).

**Örnek 2 — Aralık ve mantık**
\`\`\`sql
SELECT * FROM siparisler WHERE tutar BETWEEN 100 AND 500;
\`\`\`
BETWEEN iki ucu da dahil eder (100 ve 500 dahildir). Birden çok koşul \`AND\` / \`OR\` ile bağlanır; \`OR\` kullanıyorsan paranteze dikkat et.

**Sık hata:** \`NULL = NULL\` sonucu NULL (bilinmeyen) olur; WHERE bu sonucu sağlayan satırı geçirmez. NULL kontrolü için \`IS NULL\` kullan. Boş metin (\`''\`) NULL ile aynı değildir.

**Kendin dene:** Tutarı 1000'den büyük siparişleri getiren sorguyu yaz.`,
en: `**What is it?** WHERE filters rows; rows failing the condition never come back. Use \`=\` and \`LIKE\` for text, \`>\`, \`<\`, \`BETWEEN\` for numbers.

**Why it matters:** WHERE determines which records participate in a report. A report that needs every record may omit the filter.

**Example 1 — Equality and LIKE**
\`\`\`sql
SELECT name FROM customers WHERE city = 'Istanbul';
\`\`\`
Returns 2 rows: Ayse Yilmaz and Ali Veli. For patterns write \`WHERE name LIKE 'A%'\` (starts with A).

**Example 2 — Ranges and logic**
\`\`\`sql
SELECT * FROM orders WHERE amount BETWEEN 100 AND 500;
\`\`\`
BETWEEN includes both ends (100 and 500 count). Combine conditions with \`AND\` / \`OR\`; mind the parentheses with \`OR\`.

**Common mistake:** \`NULL = NULL\` evaluates to NULL (unknown), which does not pass a WHERE filter. Use \`IS NULL\` to test for NULL. Empty text (\`''\`) is different from NULL.

**Try it yourself:** Write a query fetching orders above 1000.` },
order: {
tr: `**Nedir?** ORDER BY sonucu sıralar: \`DESC\` büyükten küçüğe, \`ASC\` (varsayılan) küçükten büyüğe. LIMIT ile sıralanmış sonucun başından belirli sayıda satır alabilirsin.

**Neden önemli?** Örneğin, en yüksek tutarlı beş siparişi göstermek için sıralama ve satır sınırını birlikte kullanabilirsin.

**Örnek 1 — En büyük 5 sipariş**
\`\`\`sql
SELECT ad, tutar FROM siparisler ORDER BY tutar DESC LIMIT 5;
\`\`\`
En üstte 2500 ile Mehmet Demir görünür. LIMIT 5 en fazla beş satır getirir; en yüksek beş farklı tutarın bütün kayıtlarını getirmekle aynı şey değildir. Eşit tutarlı siparişler arasında belirli bir sıra istiyorsan sıralamaya benzersiz id sütununu da ekle: ORDER BY tutar DESC, id ASC.

**Örnek 2 — Çoklu sıralama**
\`\`\`sql
SELECT ad, sehir FROM musteriler ORDER BY sehir ASC, ad ASC;
\`\`\`
Önce şehre, şehir eşitse ada göre sıralar. Alfabetik listeler böyle yapılır.

**Sık hata:** ORDER BY takma adı (AS) kullanabilir. SQLite, WHERE içinde de bazı takma adları kabul eder; taşınabilir sorgular için hesaplamayı alt sorguda tanımlayıp dış sorguda filtrele.

**Kendin dene:** En küçük 3 siparişi tutara göre artan sırala.`,
en: `**What is it?** ORDER BY sorts results: \`DESC\` largest first, \`ASC\` (default) smallest first. LIMIT lets you take a specified number of rows from the beginning of the sorted result.

**Why it matters:** For example, you can combine sorting and a row limit to show the five highest-value orders.

**Example 1 — Top 5 orders**
\`\`\`sql
SELECT name, amount FROM orders ORDER BY amount DESC LIMIT 5;
\`\`\`
Mehmet Demir sits on top with 2500. LIMIT 5 returns at most five rows; this is different from returning every record with one of the five highest distinct amounts. For a defined order between tied amounts, add the unique id column: ORDER BY amount DESC, id ASC.

**Example 2 — Multi-column sort**
\`\`\`sql
SELECT name, city FROM customers ORDER BY city ASC, name ASC;
\`\`\`
Sorts by city first, then by name within equal cities. That is how alphabetical lists are built.

**Common mistake:** ORDER BY can use an AS alias. SQLite accepts some aliases in WHERE too; for portable SQL, define the calculation in a subquery and filter it outside.

**Try it yourself:** Sort the smallest 3 orders by ascending amount.` },
aggr: {
tr: `**Nedir?** Toplama fonksiyonları (\`COUNT\`, \`SUM\`, \`AVG\`, \`MIN\`, \`MAX\`) çok satırı tek değere indirir. GROUP BY yoksa tek bir özet oluşur; HAVING koşulu bu özeti eleyebilir.

**Neden önemli?** "Kaç müşteri var, ciro ne, ortalama sepet kaç?" sorularının tamamı bu beş fonksiyonla cevaplanır.

**Örnek 1 — Mağaza özeti**
\`\`\`sql
SELECT COUNT(*) AS adet, SUM(tutar) AS ciro, AVG(tutar) AS ort FROM siparisler;
\`\`\`
6 sipariş, toplam 4680 ciro, ortalama 780 sepet. Üç kritik sayı tek sorguda.

**Örnek 2 — NULL tuzağı**
\`\`\`sql
SELECT COUNT(*) AS satir, COUNT(sehir) AS sehir_dolu FROM musteriler;
\`\`\`
COUNT(*) satır sayar, COUNT(sütun) NULL olanları atlar. Şehri boş müşteri varsa sayılar farklı çıkar — bu bir hata değil, özelliktir.

**Sık hata:** SQLite, SUM içindeki sayısal metinleri sayıya dönüştürebilir; sayısal olmayan metinler 0 sayılabilir. Veri türünü ve içeriğini doğrula.

**Kendin dene:** En yüksek ve en düşük sipariş tutarını MIN ve MAX ile bul.`,
en: `**What is it?** Aggregate functions (\`COUNT\`, \`SUM\`, \`AVG\`, \`MIN\`, \`MAX\`) collapse many rows into one value. Without GROUP BY there is one summary group; HAVING can filter it out.

**Why it matters:** "How many customers, what revenue, average basket?" — all answered by these five functions.

**Example 1 — Store summary**
\`\`\`sql
SELECT COUNT(*) AS cnt, SUM(amount) AS revenue, AVG(amount) AS avg FROM orders;
\`\`\`
6 orders, 4680 total revenue, 780 average basket. Three critical numbers in one query.

**Example 2 — The NULL trap**
\`\`\`sql
SELECT COUNT(*) AS rows, COUNT(city) AS city_filled FROM customers;
\`\`\`
COUNT(*) counts rows, COUNT(column) skips NULLs. If a customer lacks a city, the numbers differ — that is a feature, not a bug.

**Common mistake:** SQLite can convert numeric text in SUM to numbers; nonnumeric text can count as zero. Verify both the type and the stored values.

**Try it yourself:** Find the highest and lowest order amounts with MIN and MAX.` },
group: {
tr: `**Nedir?** GROUP BY satırları gruplara böler, her grup tek satır özet olur. Gruba filtre HAVING ile yapılır: WHERE gruplamadan önce, HAVING sonra çalışır.

**Neden önemli?** "Her şehirde kaç müşteri, her ay kaç satış?" soruları gruplamadır; raporlamanın kalbidir.

**Örnek 1 — Şehre göre müşteri**
\`\`\`sql
SELECT sehir, COUNT(*) AS adet FROM musteriler GROUP BY sehir;
\`\`\`
Istanbul 2, Ankara 2, Izmir 1. Üç grup, üç satır.

**Örnek 2 — HAVING ile eleme**
\`\`\`sql
SELECT sehir, SUM(tutar) AS ciro FROM siparisler GROUP BY sehir HAVING ciro > 1000;
\`\`\`
Önce şehir cirosu hesaplanır (Ankara 2800, Istanbul 1800, Izmir 80), sonra 1000 üstü kalır: Ankara ve Istanbul. WHERE buraya yazılamaz çünkü ciro satırda değil gruptadır.

**Sık hata:** Açık ve taşınabilir SQL için SELECT'te grupladığın sütunları ve toplama sonuçlarını kullan. SQLite gruplama dışında çıplak sütunlara izin verir; hangi satırın değeri geleceği genel olarak belirsizdir. Tek MIN/MAX için özel davranışı vardır; eşit değerlerde yine tek bir satır garanti edilmez.

**Kendin dene:** Her şehrin ortalama sipariş tutarını bul, ortalaması 500 üstü şehirleri HAVING ile tut.`,
en: `**What is it?** GROUP BY splits rows into groups; each group becomes one summary row. Groups are filtered with HAVING: WHERE runs before grouping, HAVING after.

**Why it matters:** "Customers per city, sales per month?" — that is grouping, the heart of reporting.

**Example 1 — Customers per city**
\`\`\`sql
SELECT city, COUNT(*) AS cnt FROM customers GROUP BY city;
\`\`\`
Istanbul 2, Ankara 2, Izmir 1. Three groups, three rows.

**Example 2 — Filtering with HAVING**
\`\`\`sql
SELECT city, SUM(amount) AS revenue FROM orders GROUP BY city HAVING revenue > 1000;
\`\`\`
City revenue is computed first (Ankara 2800, Istanbul 1800, Izmir 80), then only above-1000 survive: Ankara and Istanbul. WHERE cannot go here because revenue lives in the group, not the row.

**Common mistake:** For clear, portable SQL, select grouped columns and aggregate results. SQLite permits bare columns outside GROUP BY; their source row is generally unspecified. A single MIN/MAX has special behavior, but ties still do not guarantee one particular row.

**Try it yourself:** Find each city's average order amount, keep cities above 500 with HAVING.` },
join: {
tr: `**Nedir?** JOIN iki tablodan satırları birleştirir; bu örnekte eşleşmeyi ON koşulu belirler. Sütun adlarının aynı olması gerekmez. \`INNER\` eşleşenleri, \`LEFT\` soldakilerin tamamını getirir (eşleşmeyen tarafta NULL olur).

**Neden önemli?** Gerçek veri parçalıdır: müşteri bir tabloda, sipariş başka tabloda. Rapor, parçaları birleştirince doğar.

**Örnek 1 — Sipariş + müşteri adı**
\`\`\`sql
SELECT m.ad, s.tutar FROM musteriler m JOIN siparisler s ON s.mid = m.id;
\`\`\`
6 satır gelir; her siparişin yanında sahibi yazar. \`m\` ve \`s\` takma adları sorguyu kısaltır.

**Örnek 2 — Hiç siparişi olmayanlar**
\`\`\`sql
SELECT m.ad FROM musteriler m LEFT JOIN siparisler s ON s.mid = m.id WHERE s.id IS NULL;
\`\`\`
Elif Şahin'in siparişi yoktur; LEFT JOIN onu NULL tarafıyla getirir, IS NULL yakalar. Bu kalıp "hiç almamışlar" sorusunun cevabıdır.

**Sık hata:** Bu örnekte ON koşulunu kaldırıp başka eşleştirme koşulu yazmazsan 5 müşteri × 6 sipariş = 30 satır oluşur. INNER JOIN eşleştirmesi WHERE içinde de yazılabilir. LEFT JOIN için koşulu ON ile WHERE arasında taşımak ise eşleşmeyen satırları kaybettirebilir.

**Kendin dene:** Her müşterinin sipariş sayısını LEFT JOIN + GROUP BY ile bul (0 olanlar da görünsün).`,
en: `**What is it?** JOIN combines rows from two tables; ON defines the match in this example. The column names need not be identical. \`INNER\` returns matches, \`LEFT\` returns all left rows (NULL on the unmatched side).

**Why it matters:** Real data is fragmented: customers in one table, orders in another. Reports are born when fragments unite.

**Example 1 — Order + customer name**
\`\`\`sql
SELECT m.name, s.amount FROM customers m JOIN orders s ON s.customer_id = m.id;
\`\`\`
6 rows come back; every order carries its owner. The \`m\` and \`s\` aliases keep the query short.

**Example 2 — Customers with no orders**
\`\`\`sql
SELECT m.name FROM customers m LEFT JOIN orders s ON s.customer_id = m.id WHERE s.id IS NULL;
\`\`\`
Elif Sahin has no orders; LEFT JOIN brings her with a NULL side, IS NULL catches her. This pattern answers every "never bought" question.

**Common mistake:** Removing ON from this example without adding another matching condition produces 5 customers × 6 orders = 30 rows. An INNER JOIN match may also be expressed in WHERE. For LEFT JOIN, moving a condition between ON and WHERE can instead discard unmatched rows.

**Try it yourself:** Find each customer's order count with LEFT JOIN + GROUP BY (zeros included).` },
cte: {
tr: `**Nedir?** WITH, tek bir SQL ifadesi boyunca kullanılabilen adlandırılmış bir sorgu sonucu (CTE) tanımlar. Ayrı bir kalıcı tablo oluşturmaz; alt sorgulara isim vererek okumayı kolaylaştırır.

**Neden önemli?** İç içe 3 katman alt sorgu okunmaz; CTE sorguyu yukarıdan aşağıya okunur hikâyeye çevirir.

**Örnek 1 — Cirosu yüksek müşteriler**
\`\`\`sql
WITH zengin AS (SELECT mid FROM siparisler GROUP BY mid HAVING SUM(tutar) > 1000)
SELECT ad FROM musteriler WHERE id IN zengin;
\`\`\`
Önce toplamı 1000'i aşanlar bulunur (Ayşe 1650, Mehmet 2800), sonra adları alınır. Ara adımı isimlendirmek hata ayıklamayı kolaylaştırır.

**Örnek 2 — CTE + filtreleme**
\`\`\`sql
WITH sehir_ciro AS (SELECT sehir, SUM(tutar) AS c FROM siparisler GROUP BY sehir)
SELECT * FROM sehir_ciro WHERE c > 500 ORDER BY c DESC;
\`\`\`
CTE normal tablo gibi sorgulanır: filtre, sıralama, hatta JOIN serbesttir.

**Sık hata:** WITH tek başına tamamlanmış bir ifade değildir; ardından SELECT, INSERT, UPDATE veya DELETE gelir. Tanımlanan her CTE'nin kullanılması zorunlu değildir.

**Kendin dene:** Sipariş adedi 2 ve üstü olan müşterilerin adlarını CTE ile bul.`,
en: `**What is it?** WITH defines a named query result (CTE) available within one SQL statement. It does not create a separate persistent table; naming subqueries can make them easier to read.

**Why it matters:** Three levels of nested subqueries are unreadable; a CTE turns the query into a top-to-bottom story.

**Example 1 — High-revenue customers**
\`\`\`sql
WITH big_spenders AS (SELECT customer_id FROM orders GROUP BY customer_id HAVING SUM(amount) > 1000)
SELECT name FROM customers WHERE id IN big_spenders;
\`\`\`
First those above 1000 total are found (Ayse 1650, Mehmet 2800), then their names are fetched. Naming the interim step eases debugging.

**Example 2 — CTE + filtering**
\`\`\`sql
WITH city_rev AS (SELECT city, SUM(amount) AS c FROM orders GROUP BY city)
SELECT * FROM city_rev WHERE c > 500 ORDER BY c DESC;
\`\`\`
A CTE queries like a normal table: filtering, sorting, even JOINs are free.

**Common mistake:** WITH alone is not a complete statement; SELECT, INSERT, UPDATE or DELETE follows it. Not every declared CTE has to be referenced.

**Try it yourself:** Find names of customers with 2+ orders using a CTE.` },
dml: {
tr: `**Nedir?** DML veriyi değiştirir: \`INSERT\` ekler, \`UPDATE\` günceller, \`DELETE\` siler. UPDATE ve DELETE için belirli kayıtları WHERE ile seç; INSERT ... VALUES satırında WHERE kullanılmaz.

**Neden önemli?** Okumak kadar yazmak da lazım; ama yazma işlemleri geri alınamaz hatalara açıktır (iş disiplini burada belli olur).

**Örnek 1 — Ekleme ve güncelleme**
\`\`\`sql
INSERT INTO musteriler (ad, sehir) VALUES ('Zeynep', 'Ankara');
UPDATE musteriler SET sehir = 'Izmir' WHERE id = 3;
\`\`\`
Belirli kayıtları hedefleyen UPDATE için WHERE kullan; WHERE'siz UPDATE tüm tabloyu değiştirir. Önce aynı koşulla SELECT çalıştır, kaç satır etkilenecek gör.

**Örnek 2 — Güvenli silme**
\`\`\`sql
SELECT COUNT(*) FROM siparisler WHERE tutar < 100;
DELETE FROM siparisler WHERE tutar < 100;
\`\`\`
Silmeden önce say: 80 liralık 1 satır gidecek, belli. Bağlı kayıt varsa FK'nin silme kuralına bak: örneğin CASCADE bağımlıları silebilir, NO ACTION silmeyi engelleyebilir. Kayıtları koruma amacını ve bütün bağımlılıkları birlikte değerlendir.

**Sık hata:** Bu uygulamanın SQLite derlemesinde DELETE/UPDATE için doğrudan ORDER BY/LIMIT desteği yoktur; sıralı silme için \`WHERE id IN (SELECT id ... ORDER BY ... LIMIT ...)\` kullanılır.

**Kendin dene:** Kendini müşteri olarak ekle, sonra şehrini güncelle — iki adımda.`,
en: `**What is it?** DML changes data: \`INSERT\` adds, \`UPDATE\` modifies, \`DELETE\` removes. Use WHERE to target specific rows in UPDATE and DELETE; INSERT ... VALUES does not use WHERE.

**Why it matters:** Writing matters as much as reading; but writes are open to irreversible mistakes (work discipline shows here).

**Example 1 — Insert and update**
\`\`\`sql
INSERT INTO customers (name, city) VALUES ('Zeynep', 'Ankara');
UPDATE customers SET city = 'Izmir' WHERE id = 3;
\`\`\`
Use WHERE to target specific records in UPDATE; without it the whole table changes. Run a SELECT with the same condition first and see how many rows are affected.

**Example 2 — Safe delete**
\`\`\`sql
SELECT COUNT(*) FROM orders WHERE amount < 100;
DELETE FROM orders WHERE amount < 100;
\`\`\`
Count before you delete: 1 row of 80 goes away, no surprise. If related rows exist, inspect the FK deletion rule: CASCADE can delete children, while NO ACTION can prevent deletion. Consider all dependencies and which records must be preserved.

**Common mistake:** This app's SQLite build does not support direct ORDER BY/LIMIT in DELETE/UPDATE; for ordered deletes use \`WHERE id IN (SELECT id ... ORDER BY ... LIMIT ...)\`.

**Try it yourself:** Add yourself as a customer, then update your city — in two steps.` },
window: {
tr: `**Nedir?** Pencere fonksiyonları satırları ezmeden hesap yapar: \`ROW_NUMBER\` numara verir, \`SUM() OVER\` toplamı her satıra yazar. GROUP BY gibi satır silmez.

**Neden önemli?** "Her satırda o müşterinin toplam cirosu" için pencere fonksiyonu okunaklı bir çözümdür. Aynı sonuç gruplanmış bir alt sorguyla JOIN veya ilişkili alt sorguyla da hesaplanabilir.

**Örnek 1 — Müşteri cirosu her satırda**
\`\`\`sql
SELECT mid, tutar, SUM(tutar) OVER (PARTITION BY mid) AS musteri_ciro FROM siparisler;
\`\`\`
Ayşe'nin iki satırında da 1650 yazar; satırlar durur, bilgi eklenir. PARTITION BY "kime göre" sorusunu cevaplar.

**Örnek 2 — Koşan toplam**
\`\`\`sql
SELECT tutar, SUM(tutar) OVER (ORDER BY id) AS kosan FROM siparisler;
\`\`\`
450, 1650, 1950... diye birikir; kasa gün sonu raporu budur. \`LAG(tutar) OVER (ORDER BY id)\` ise bir önceki satırı verir (aylık değişim hesabı).

**Sık hata:** OVER, WHERE/GROUP BY/HAVING içinde YASAKTIR; önce alt sorgu/CTE ile hesapla, dışarıda filtrele.

**Kendin dene:** Her siparişe tutar sırasına göre ROW_NUMBER ver.`,
en: `**What is it?** Window functions compute without crushing rows: \`ROW_NUMBER\` numbers them, \`SUM() OVER\` writes the total onto every row. Unlike GROUP BY, no rows disappear.

**Why it matters:** A window function clearly expresses "each row carrying its customer's total". A grouped subquery joined back to the rows or a correlated subquery can also compute that result.

**Example 1 — Customer total on every row**
\`\`\`sql
SELECT customer_id, amount, SUM(amount) OVER (PARTITION BY customer_id) AS customer_revenue FROM orders;
\`\`\`
Both of Ayse's rows show 1650; rows stay, knowledge is added. PARTITION BY answers "per whom".

**Example 2 — Running total**
\`\`\`sql
SELECT amount, SUM(amount) OVER (ORDER BY id) AS running FROM orders;
\`\`\`
It accumulates 450, 1650, 1950... — the end-of-day cash report. \`LAG(amount) OVER (ORDER BY id)\` gives the previous row (month-change math).

**Common mistake:** OVER is FORBIDDEN inside WHERE/GROUP BY/HAVING; compute in a subquery/CTE first, filter outside.

**Try it yourself:** Give every order a ROW_NUMBER by amount order.` },
ddl: {
tr: `**Nedir?** DDL yapıyı kurar: \`CREATE TABLE\` tablo açar, \`ALTER TABLE\` sütun ekler, \`DROP\` siler. Tip seçimi (INTEGER/REAL/TEXT) ve kısıtlar (NOT NULL, PRIMARY KEY) burada belirlenir.

**Neden önemli?** Kötü şema her sorguyu zehirler; doğru tip + doğru kısıt, veri kalitesinin temelidir.

**Örnek 1 — Sağlam tablo**
\`\`\`sql
CREATE TABLE IF NOT EXISTS ornek_musteriler (
  id INTEGER PRIMARY KEY,
  ad TEXT NOT NULL,
  sehir TEXT
);
\`\`\`
Ad NULL olamaz; boş metni önlemek için ayrıca CHECK gerekir. Şehir isteğe bağlıdır. Bu örnekte INTEGER PRIMARY KEY, rowid ile bağlantılıdır; id verilmezse SQLite bir tamsayı seçer. Genel PRIMARY KEY türleri otomatik artmaz; AUTOINCREMENT ayrı bir davranıştır.

**Örnek 2 — Sonradan sütun**
\`\`\`sql
ALTER TABLE musteriler ADD COLUMN telefon TEXT;
\`\`\`
Tabloyu silmeden sütun eklenir; eski satırlarda yeni sütun NULL olur. SQLite, ALTER TABLE ... DROP COLUMN destekler; anahtar, indeks veya başka şema tanımlarının kullandığı sütunlar doğrudan silinemez.

**Sık hata:** Telefonu INTEGER yapmak: baştaki 0 gider, toplaması da anlamsızdır. Telefon numarası gibi baştaki sıfırları ve biçimi korunacak tanımlayıcılar için TEXT uygundur; toplanmayan her alanın TEXT olması gerekmez.

**Kendin dene:** siparisler'e \`aciklama TEXT\` sütunu ekle, bir siparişe açıklama yaz.`,
en: `**What is it?** DDL builds structure: \`CREATE TABLE\` opens tables, \`ALTER TABLE\` adds columns, \`DROP\` deletes. Type choice (INTEGER/REAL/TEXT) and constraints (NOT NULL, PRIMARY KEY) are decided here.

**Why it matters:** A bad schema poisons every query; right types plus right constraints are the foundation of data quality.

**Example 1 — A solid table**
\`\`\`sql
CREATE TABLE IF NOT EXISTS example_customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT
);
\`\`\`
Name cannot be NULL; rejecting empty text requires a CHECK too. City is optional. Here INTEGER PRIMARY KEY aliases rowid; SQLite chooses an integer when no id is supplied. Other PRIMARY KEY types do not auto-increment; AUTOINCREMENT is a separate behavior.

**Example 2 — A later column**
\`\`\`sql
ALTER TABLE customers ADD COLUMN phone TEXT;
\`\`\`
Columns are added without dropping the table; old rows get NULL there. SQLite supports ALTER TABLE ... DROP COLUMN; columns used by keys, indexes or other schema definitions cannot be dropped directly.

**Common mistake:** Making phone INTEGER: the leading 0 vanishes and summing it is meaningless. TEXT suits identifiers such as phone numbers whose leading zeros and formatting matter; not every field that is never summed must use TEXT.

**Try it yourself:** Add a \`note TEXT\` column to orders and write a note on one order.` },
case: {
tr: `**Nedir?** CASE satır satır karar verir: koşula göre farklı değer üretir. Raporlarda "segment", "durum" veya "etiket" üretmek için kullanılabilir.

**Neden önemli?** Veriyi okurken sınıflandırmak gerekir (VIP mi, standart mı?); CASE bunu tabloyu değiştirmeden, sorguda yapar.

**Örnek 1 — Segment**
\`\`\`sql
SELECT ad, CASE WHEN tutar > 500 THEN 'VIP' WHEN tutar > 100 THEN 'Standart' ELSE 'Kucuk' END AS segment FROM siparisler;
\`\`\`
2500 ve 1200 VIP, 450/300/150 Standart, 80 Küçük. İlk uyan WHEN kazanır; ELSE güvenlik ağıdır.

**Örnek 2 — Mini pivot**
\`\`\`sql
SELECT SUM(CASE WHEN sehir = 'Istanbul' THEN tutar ELSE 0 END) AS ist_ciro FROM siparisler;
\`\`\`
Tek satırda Istanbul cirosu: 1800. Satırları sütuna çevirmenin en kısa yoludur.

**Sık hata:** THEN/ELSE farklı türler döndürebilir. SQLite sayı ve metni kendi tür sırasıyla karşılaştırır; sayısal sıralama bekliyorsan bütün dallarda uygun sayısal tür kullan.

**Kendin dene:** 1000 üstü siparişlere 'Yuksek', kalanlara 'Normal' yazan sorguyu kur.`,
en: `**What is it?** CASE decides row by row: it produces different values per condition. It can produce "segment", "status" or "label" values in reports.

**Why it matters:** Data must be classified while reading (VIP or standard?); CASE does it in the query, without touching the table.

**Example 1 — Segments**
\`\`\`sql
SELECT name, CASE WHEN amount > 500 THEN 'VIP' WHEN amount > 100 THEN 'Standard' ELSE 'Small' END AS segment FROM orders;
\`\`\`
2500 and 1200 are VIP, 450/300/150 Standard, 80 Small. The first matching WHEN wins; ELSE is the safety net.

**Example 2 — Mini pivot**
\`\`\`sql
SELECT SUM(CASE WHEN city = 'Istanbul' THEN amount ELSE 0 END) AS ist_revenue FROM orders;
\`\`\`
Istanbul revenue in one row: 1800. The shortest path from rows to columns.

**Common mistake:** THEN/ELSE may return different types. SQLite orders numbers and text by its storage-class rules; if numeric ordering is intended, use an appropriate numeric type in every branch.

**Try it yourself:** Label orders above 1000 'High', the rest 'Normal'.` },
distinct: {
tr: `**Nedir?** DISTINCT tekrarı siler, tekilleştirir. UNION iki sorguyu üst üste koyar (tekrarı siler); UNION ALL hepsini tutar.

**Neden önemli?** "Hangi şehirler var?" sorusunun cevabı listedir, döküm değil. Toplam tutmuyorsa sebebi genelde UNION/UNION ALL karışmasıdır.

**Örnek 1 — Şehir listesi**
\`\`\`sql
SELECT DISTINCT sehir FROM musteriler;
\`\`\`
3 satır: Istanbul, Ankara, Izmir. 5 müşteriye rağmen 3 şehir — tekrar gitti.

**Örnek 2 — İki liste tek listede**
\`\`\`sql
SELECT ad FROM musteriler WHERE sehir = 'Ankara' UNION SELECT ad FROM musteriler WHERE sehir = 'Izmir';
\`\`\`
Ankara + Izmir müşterileri tek listede. UNION aynı çıktı satırlarını tekilleştirir; UNION ALL tekrarları korur. Hangi davranışın doğru olduğu raporun amacına bağlıdır.

**Sık hata:** UNION'ın iki tarafında sütun sayısı aynı olmalıdır; farklı sayıda sütun motor hatası verir. Sütunlar adlarına değil konumlarına göre eşleşir. Anlamlarını yanlış sırada verirsen sorgu çalışabilir ama yanıltıcı veri üretir.

**Kendin dene:** Sipariş tutarlarının tekrarsız listesini DISTINCT ile al.`,
en: `**What is it?** DISTINCT removes duplicates. UNION stacks two queries (dropping duplicates); UNION ALL keeps everything.

**Why it matters:** "Which cities exist?" deserves a list, not a dump. When totals mismatch, UNION/UNION ALL confusion is the usual suspect.

**Example 1 — City list**
\`\`\`sql
SELECT DISTINCT city FROM customers;
\`\`\`
3 rows: Istanbul, Ankara, Izmir. 5 customers but 3 cities — duplicates gone.

**Example 2 — Two lists in one**
\`\`\`sql
SELECT name FROM customers WHERE city = 'Ankara' UNION SELECT name FROM customers WHERE city = 'Izmir';
\`\`\`
Ankara + Izmir customers in a single list. UNION removes duplicate output rows; UNION ALL preserves them. Choose according to what the report should count.

**Common mistake:** Both sides of UNION must have the same number of columns; different counts cause an error. Columns align by position, not name. Putting meanings in the wrong positions can run successfully but produce misleading data.

**Try it yourself:** Get the deduplicated list of order amounts with DISTINCT.` },
exists: {
tr: `**Nedir?** EXISTS varlık sorar: "siparişi olan müşteri var mı?" IN bir kümede üyeliği, EXISTS satır varlığını sınar. EXISTS için tek eşleşme yeterlidir; hangisinin hızlı olduğu veri ve sorgu planına bağlıdır.

**Neden önemli?** "Hiç almamışlar" gibi sorular LEFT JOIN + IS NULL ile de olur ama NOT EXISTS daha kısadır ve niyeti belli eder.

**Örnek 1 — En az bir siparişi olanlar**
\`\`\`sql
SELECT ad FROM musteriler m WHERE EXISTS (SELECT 1 FROM siparisler s WHERE s.mid = m.id);
\`\`\`
Elif hariç 4 müşteri döner. Alt sorgu dışarıdaki satıra bakarak çalışır (ilişkili alt sorgu).

**Örnek 2 — Hiç siparişi olmayanlar**
\`\`\`sql
SELECT ad FROM musteriler m WHERE NOT EXISTS (SELECT 1 FROM siparisler s WHERE s.mid = m.id);
\`\`\`
Sadece Elif Şahin. NOT IN ile yazılsa NULL'lu listelerde sürpriz boş sonuç verebilirdi; NOT EXISTS bu tuzağa düşmez.

**Sık hata:** İlişkisiz alt sorguda dış tabloya bağlanmayı unutmak (WHERE s.mid = m.id yoksa) her satırda aynı cevabı verir.

**Kendin dene:** Tutarı 2000 üstü siparişi olan müşterileri EXISTS ile bul.`,
en: `**What is it?** EXISTS asks about presence: "does this customer have an order?" IN tests set membership; EXISTS tests whether a row exists. One match is enough for EXISTS; relative speed depends on the data and query plan.

**Why it matters:** "Never bought" questions work with LEFT JOIN + IS NULL too, but NOT EXISTS is shorter and states the intent.

**Example 1 — Customers with at least one order**
\`\`\`sql
SELECT name FROM customers m WHERE EXISTS (SELECT 1 FROM orders s WHERE s.customer_id = m.id);
\`\`\`
Returns 4 customers, everyone but Elif. The subquery runs per outer row (correlated subquery).

**Example 2 — Customers with no orders**
\`\`\`sql
SELECT name FROM customers m WHERE NOT EXISTS (SELECT 1 FROM orders s WHERE s.customer_id = m.id);
\`\`\`
Only Elif Sahin. Written with NOT IN, NULL-laden lists could surprise with empty results; NOT EXISTS never falls into that trap.

**Common mistake:** Forgetting to link the outer table in a correlated subquery (no WHERE s.customer_id = m.id) returns the same answer for every row.

**Try it yourself:** Find customers having an order above 2000 with EXISTS.` },
index: {
tr: `**Nedir?** INDEX, filtreleme, JOIN veya sıralamada yararlı olabilen bir yapıdır; kazanç veri, seçicilik ve sorgu planına bağlıdır. EXPLAIN QUERY PLAN motorun planını gösterir: SCAN bütün satırları, SEARCH bir alt kümeyi okur. SCAN da indeks üzerinden yapılabilir.

**Neden önemli?** Büyük tabloda uygun indeks, JOIN ve filtre maliyetini azaltabilir. Hızlanmayı varsayma; sorgu planını ve süreyi ölç.

**Örnek 1 — İndeks kurmak**
\`\`\`sql
CREATE INDEX idx_siparis_mid ON siparisler(mid);
\`\`\`
Müşteri eşleşmesi için kullanılabilecek bir indeks eklenir. Motor kullanıp kullanmayacağına karar verir; WHERE/JOIN koşullarını ve ölçülen planı birlikte değerlendir.

**Örnek 2 — Planı okumak**
\`\`\`sql
EXPLAIN QUERY PLAN SELECT * FROM siparisler WHERE mid = 5;
\`\`\`
SEARCH alt küme araması, SCAN tam taramadır; USING INDEX / COVERING INDEX ifadeleri kullanılan indeksi gösterir. Önce plan, sonra indeks.

**Sık hata:** Her sütuna indeks: yazmayı yavaşlatır, dosyayı şişirir. İndeks baharat gibidir, kararı yeter.

**Kendin dene:** tutar sütununa indeks kur, tutar > 500 filtresiyle planı oku; SCAN/SEARCH ve kullanılan indeksi karşılaştır.`,
en: `**What is it?** INDEX can help filtering, JOINs or sorting; gains depend on data, selectivity and the query plan. EXPLAIN QUERY PLAN shows the engine's plan: SCAN visits all rows, SEARCH a subset. A SCAN can also use an index.

**Why it matters:** A suitable index can reduce JOIN and filtering costs on a large table. Check the plan and measured time instead of assuming a speedup.

**Example 1 — Building an index**
\`\`\`sql
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
\`\`\`
A customer-matching index becomes available. The engine decides whether to use it; evaluate WHERE/JOIN conditions alongside the measured plan.

**Example 2 — Reading the plan**
\`\`\`sql
EXPLAIN QUERY PLAN SELECT * FROM orders WHERE customer_id = 5;
\`\`\`
SEARCH reads a subset, SCAN all rows; USING INDEX / COVERING INDEX identifies an index in use. Plan first, index second.

**Common mistake:** Indexing every column slows writes and bloats the file. Indexes are like spices — enough is enough.

**Try it yourself:** Index the amount column, read the plan with an amount > 500 filter, and compare SCAN/SEARCH and the index used.` },
txn: {
tr: `**Nedir?** TRANSACTION birden çok işlemi gruplar: BEGIN başlatır, COMMIT kaydeder. ROLLBACK, henüz kaydedilmemiş değişiklikleri geri alır; her SQL hatası tüm grubu kendiliğinden geri almaz. FOREIGN KEY denetimi açıksa eksik parent referansı reddedilir; nullable FK sütununda NULL bulunabilir.

**Neden önemli?** Birlikte tamamlanması gereken değişiklikleri tek işlemde kaydetmeni veya işlem açıkken birlikte geri almanı sağlar. İş kurallarını ayrıca doğrulamak gerekir.

**Örnek 1 — İki hesap arasındaki değişiklikleri birlikte kaydetme**
\`\`\`sql
BEGIN; UPDATE hesap SET bakiye = bakiye - 100 WHERE id = 1; UPDATE hesap SET bakiye = bakiye + 100 WHERE id = 2; COMMIT;
\`\`\`
Bu basitleştirilmiş örnekte iki hesap da vardır ve bakiye yeterlidir: 1. hesap 900'e iner, 2. hesap 600'e çıkar. Gerçek bir havalede hesapları, tutarı, bakiyeyi ve etkilenen satırları COMMIT öncesinde doğrulamak gerekir. UPDATE hiçbir satır bulamazsa bu tek başına SQL hatası değildir; ikinci hesap yoksa bu örnek yalnız birinci hesaptan para düşürüp kaydedebilir. Koşullar sağlanmıyorsa işlem henüz açıkken ROLLBACK ile değişiklikleri geri al; tamamlanmış COMMIT sonrasında ROLLBACK bunları geri getirmez.

**Örnek 2 — Sahte id yasağı**
\`\`\`sql
CREATE TABLE IF NOT EXISTS ornek_siparisler (
  id INTEGER PRIMARY KEY,
  mid INTEGER NOT NULL REFERENCES musteriler(id)
);
\`\`\`
Olmayan müşteriye sipariş girilemez; motor kapıda bekçidir (PRAGMA foreign_keys = ON ile çalışır).

**Sık hata:** COMMIT'i unutmak kilit bırakır; BEGIN açtıysan COMMIT ya da ROLLBACK ile kapat.

**Kendin dene:** 2. hesaptan 1. hesaba 50 aktar; sonra bakiyeleri SELECT ile kontrol et.`,
en: `**What is it?** TRANSACTION groups operations: BEGIN starts, COMMIT saves. ROLLBACK undoes uncommitted changes; not every SQL error automatically rolls back the entire group. With FK enforcement enabled, a missing parent reference is rejected; a nullable FK column can contain NULL.

**Why it matters:** A transaction lets you commit related changes together or roll them back together while it is still open. Business rules need their own validation.

**Example 1 — Commit changes to two accounts together**
\`\`\`sql
BEGIN; UPDATE accounts SET balance = balance - 100 WHERE id = 1; UPDATE accounts SET balance = balance + 100 WHERE id = 2; COMMIT;
\`\`\`
This simplified example assumes both accounts exist and the balance is sufficient: account 1 drops to 900 and account 2 rises to 600. A real transfer must validate the accounts, amount, balance and affected rows before COMMIT. An UPDATE matching no rows is not itself an SQL error; if account 2 is missing, this example can commit a debit to account 1 alone. If the conditions fail, use ROLLBACK while the transaction is still open; ROLLBACK cannot undo a completed COMMIT.

**Example 2 — Banning fake ids**
\`\`\`sql
CREATE TABLE IF NOT EXISTS example_orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id)
);
\`\`\`
No order for a nonexistent customer; the engine guards the door (works with PRAGMA foreign_keys = ON).

**Common mistake:** Forgetting COMMIT leaves locks; if you opened BEGIN, close it with COMMIT or ROLLBACK.

**Try it yourself:** Move 50 from account 2 to account 1; then verify balances with SELECT.` }
};
