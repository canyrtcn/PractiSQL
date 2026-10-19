// Demo veritabanları: tamamı SQLite seed SQL'i. Gerçek DB yok, hepsi sql.js belleğinde.
window.DEMOS = {
  satis: {
    label: 'E-Ticaret (satış)',
    desc: 'Müşteri • ürün • sipariş. JOIN ve GROUP BY öğrenmek için birebir.',
    sql: `
CREATE TABLE musteriler(id INTEGER PRIMARY KEY, ad TEXT, sehir TEXT, segment TEXT);
INSERT INTO musteriler VALUES
(1,'Elif Demir','İstanbul','bireysel'),(2,'Mert Kaya','Ankara','kurumsal'),
(3,'Zeynep Arslan','İzmir','bireysel'),(4,'Emre Yıldız','İstanbul','kurumsal'),
(5,'Selin Koç','Bursa','bireysel'),(6,'Burak Şahin','Ankara','bireysel'),
(7,'Deniz Çelik','İzmir','kurumsal'),(8,'Aslı Kurt','İstanbul','bireysel');

CREATE TABLE urunler(id INTEGER PRIMARY KEY, ad TEXT, kategori TEXT, fiyat REAL);
INSERT INTO urunler VALUES
(1,'Laptop Pro 14','elektronik',32999),(2,'Kablosuz Mouse','elektronik',899),
(3,'Kahve Makinesi','ev',5499),(4,'Koşu Ayakkabısı','spor',2799),
(5,'Kitap Seti','kitap',649),(6,'Bluetooth Kulaklık','elektronik',2499),
(7,'Yoga Matı','spor',799),(8,'Airfryer','ev',6999);

CREATE TABLE siparisler(id INTEGER PRIMARY KEY, musteri_id INTEGER, tarih TEXT, durum TEXT);
INSERT INTO siparisler VALUES
(101,1,'2026-01-12','teslim'),(102,2,'2026-01-15','teslim'),(103,3,'2026-02-03','teslim'),
(104,1,'2026-02-20','iade'),(105,4,'2026-03-05','teslim'),(106,5,'2026-03-18','kargo'),
(107,6,'2026-04-02','teslim'),(108,2,'2026-04-11','teslim'),(109,7,'2026-05-06','teslim'),
(110,8,'2026-05-19','teslim'),(111,3,'2026-06-01','kargo'),(112,4,'2026-06-14','teslim');

CREATE TABLE siparis_detay(id INTEGER PRIMARY KEY, siparis_id INTEGER, urun_id INTEGER, adet INTEGER, birim_fiyat REAL);
INSERT INTO siparis_detay VALUES
(1,101,2,2,899),(2,101,6,1,2499),(3,102,1,1,32999),(4,103,4,1,2799),
(5,103,7,2,799),(6,104,3,1,5499),(7,105,8,1,6999),(8,105,2,1,899),
(9,106,5,3,649),(10,107,6,2,2499),(11,108,2,5,899),(12,108,7,1,799),
(13,109,1,1,32999),(14,110,4,2,2799),(15,111,3,1,5499),(16,112,5,2,649),(17,112,2,1,899);
`
  },
  hr: {
    label: 'İnsan Kaynakları',
    desc: 'Departman • çalışan • yönetici. Self-JOIN ve pencere fonksiyonları için.',
    sql: `
CREATE TABLE departmanlar(id INTEGER PRIMARY KEY, ad TEXT, lokasyon TEXT);
INSERT INTO departmanlar VALUES
(1,'Mühendislik','İstanbul'),(2,'Veri Analitiği','İstanbul'),
(3,'Satış','Ankara'),(4,'Finans','İzmir');

CREATE TABLE calisanlar(id INTEGER PRIMARY KEY, ad TEXT, departman_id INTEGER, unvan TEXT, maas REAL, ise_giris TEXT, yonetici_id INTEGER);
INSERT INTO calisanlar VALUES
(1,'Aras Yıldırım',2,'Veri Analisti',85000,'2023-06-01',NULL),
(2,'Elif Demir',2,'Kıdemli Analist',110000,'2021-03-15',1),
(3,'Mert Kaya',1,'Backend Dev',95000,'2022-01-10',5),
(4,'Zeynep Arslan',1,'Frontend Dev',88000,'2022-09-01',5),
(5,'Emre Yıldız',1,'Takım Lideri',135000,'2020-05-20',NULL),
(6,'Selin Koç',3,'Satış Temsilcisi',62000,'2023-02-01',8),
(7,'Burak Şahin',3,'Satış Temsilcisi',58000,'2024-04-12',8),
(8,'Deniz Çelik',3,'Satış Müdürü',120000,'2019-11-03',NULL),
(9,'Aslı Kurt',4,'Finans Uzmanı',78000,'2022-07-19',10),
(10,'Kaan Aydın',4,'Finans Müdürü',125000,'2018-08-25',NULL),
(11,'Ece Yılmaz',2,'Junior Analist',60000,'2024-09-02',1),
(12,'Ozan Ateş',1,'DevOps',102000,'2021-12-06',5);
`
  },
  finans: {
    label: 'Banka / Kredi Riski',
    desc: 'Müşteri • kredi • ödeme. CASE, CTE ve risk analizi için.',
    sql: `
CREATE TABLE kredi_musteriler(id INTEGER PRIMARY KEY, ad TEXT, risk_skoru INTEGER, segment TEXT);
INSERT INTO kredi_musteriler VALUES
(1,'Elif Demir',720,'bireysel'),(2,'Mert Kaya',580,'bireysel'),
(3,'Zeynep Arslan',810,'kobi'),(4,'Emre Yıldız',450,'bireysel'),
(5,'Selin Koç',690,'kobi'),(6,'Burak Şahin',530,'bireysel');

CREATE TABLE krediler(id INTEGER PRIMARY KEY, musteri_id INTEGER, tutar REAL, faiz REAL, vade_ay INTEGER, baslangic TEXT, durum TEXT);
INSERT INTO krediler VALUES
(1,1,500000,3.49,36,'2024-02-01','aktif'),
(2,2,250000,4.10,24,'2024-05-10','takip'),
(3,3,1200000,2.99,48,'2023-11-15','aktif'),
(4,4,100000,5.25,12,'2025-01-20','aktif'),
(5,5,750000,3.75,36,'2024-08-01','kapali'),
(6,6,300000,4.60,24,'2025-03-05','aktif'),
(7,2,150000,4.80,12,'2025-06-01','aktif');

CREATE TABLE odemeler(id INTEGER PRIMARY KEY, kredi_id INTEGER, tarih TEXT, tutar REAL, gecikme_gun INTEGER);
INSERT INTO odemeler VALUES
(1,1,'2025-01-05',15200,0),(2,1,'2025-02-05',15200,0),(3,1,'2025-03-07',15200,2),
(4,2,'2025-01-12',11800,5),(5,2,'2025-02-20',11800,15),(6,2,'2025-03-25',6000,40),
(7,3,'2025-01-15',28500,0),(8,3,'2025-02-15',28500,0),(9,3,'2025-03-15',28500,0),
(10,4,'2025-02-20',9100,0),(11,4,'2025-03-20',9100,3),
(12,5,'2024-09-01',22800,0),(13,5,'2024-10-01',22800,0),
(14,6,'2025-04-05',13800,0),(15,6,'2025-05-10',13800,7),
(16,7,'2025-07-01',13200,0);
`
  }
};
