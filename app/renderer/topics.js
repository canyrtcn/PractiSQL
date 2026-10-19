// Öğrenme konuları: seviye kilidi YOK, hepsi serbest. Örnekler tek tıkla editöre gelir.
window.TOPICS = [
  { id: 'select', title: 'SELECT & WHERE', db: 'satis',
    desc: 'Sütun seç, filtrele. SQL\'in alfabesi: hangi veriyi istediğini söyle.',
    examples: [
      { label: 'Tüm müşteriler', sql: 'SELECT * FROM musteriler;' },
      { label: 'İstanbul + bireysel', sql: "SELECT ad, sehir FROM musteriler\nWHERE sehir = 'İstanbul' AND segment = 'bireysel';" },
      { label: 'Fiyatı 2000₺ üstü ürünler', sql: 'SELECT ad, kategori, fiyat FROM urunler\nWHERE fiyat > 2000\nORDER BY fiyat DESC;' }
    ]},
  { id: 'orderby', title: 'ORDER BY & LIMIT', db: 'satis',
    desc: 'Sırala ve ilk N kaydı al. "En pahalı 3 ürün" gibi sorular.',
    examples: [
      { label: 'En pahalı 3 ürün', sql: 'SELECT ad, fiyat FROM urunler\nORDER BY fiyat DESC\nLIMIT 3;' },
      { label: 'Son 5 sipariş', sql: 'SELECT * FROM siparisler\nORDER BY tarih DESC\nLIMIT 5;' }
    ]},
  { id: 'join', title: "JOIN'ler", db: 'satis',
    desc: 'Tabloları birleştir. Sipariş + müşteri + ürün tek satırda buluşur.',
    examples: [
      { label: 'Sipariş + müşteri', sql: 'SELECT s.id, m.ad, m.sehir, s.tarih, s.durum\nFROM siparisler s\nJOIN musteriler m ON m.id = s.musteri_id\nLIMIT 10;' },
      { label: 'Detay + ürün adı (ciro kalemi)', sql: 'SELECT s.id AS siparis, u.ad AS urun, d.adet, d.birim_fiyat,\n  d.adet * d.birim_fiyat AS tutar\nFROM siparis_detay d\nJOIN siparisler s ON s.id = d.siparis_id\nJOIN urunler u ON u.id = d.urun_id\nORDER BY tutar DESC;' },
      { label: 'LEFT JOIN: siparişsiz müşteri var mı?', sql: 'SELECT m.ad\nFROM musteriler m\nLEFT JOIN siparisler s ON s.musteri_id = m.id\nWHERE s.id IS NULL;' }
    ]},
  { id: 'group', title: 'GROUP BY & HAVING', db: 'satis',
    desc: 'Grupla ve özetle: şehre göre ciro, kategoriye göre adet. WHERE satırı, HAVING grubu filtreler.',
    examples: [
      { label: 'Şehre göre müşteri sayısı', sql: 'SELECT sehir, COUNT(*) AS adet\nFROM musteriler\nGROUP BY sehir\nORDER BY adet DESC;' },
      { label: 'Kategori cirosu', sql: 'SELECT u.kategori,\n  SUM(d.adet * d.birim_fiyat) AS ciro,\n  COUNT(*) AS kalem\nFROM siparis_detay d\nJOIN urunler u ON u.id = d.urun_id\nGROUP BY u.kategori\nORDER BY ciro DESC;' },
      { label: 'Cirosu 10.000₺ üstü kategoriler', sql: 'SELECT u.kategori, SUM(d.adet * d.birim_fiyat) AS ciro\nFROM siparis_detay d\nJOIN urunler u ON u.id = d.urun_id\nGROUP BY u.kategori\nHAVING ciro > 10000;' }
    ]},
  { id: 'subquery', title: 'Alt Sorgular', db: 'hr',
    desc: 'Sorgu içinde sorgu: önce ortalamayı bul, sonra üstünü listele.',
    examples: [
      { label: 'Ortalama üstü maaş', sql: 'SELECT ad, maas FROM calisanlar\nWHERE maas > (SELECT AVG(maas) FROM calisanlar)\nORDER BY maas DESC;' },
      { label: 'IN ile: mühendislik ekibi', sql: "SELECT ad, unvan FROM calisanlar\nWHERE departman_id IN (SELECT id FROM departmanlar WHERE ad = 'Mühendislik');" }
    ]},
  { id: 'cte', title: 'CTE (WITH)', db: 'finans',
    desc: 'Sorguya isim ver, adım adım ilerle. Karmaşık raporların temiz yolu.',
    examples: [
      { label: 'Kredi bazında tahsilat', sql: 'WITH tahsilat AS (\n  SELECT kredi_id, SUM(tutar) AS odenen,\n    MAX(gecikme_gun) AS max_gecikme\n  FROM odemeler\n  GROUP BY kredi_id\n)\nSELECT k.id, m.ad, k.tutar, t.odenen,\n  k.tutar - t.odenen AS kalan\nFROM krediler k\nJOIN kredi_musteriler m ON m.id = k.musteri_id\nJOIN tahsilat t ON t.kredi_id = k.id;' },
      { label: 'Riskli müşteri raporu', sql: "WITH gecikme AS (\n  SELECT kredi_id, MAX(gecikme_gun) AS mg FROM odemeler GROUP BY kredi_id\n)\nSELECT m.ad, m.risk_skoru, k.tutar, g.mg AS max_gecikme,\n  CASE WHEN g.mg >= 30 THEN 'kritik'\n       WHEN g.mg >= 7 THEN 'izle'\n       ELSE 'sağlıklı' END AS durum\nFROM krediler k\nJOIN kredi_musteriler m ON m.id = k.musteri_id\nJOIN gecikme g ON g.kredi_id = k.id\nORDER BY g.mg DESC;" }
    ]},
  { id: 'window', title: 'Pencere Fonksiyonları', db: 'hr',
    desc: 'Satırı silmeden özet: departman içi maaş sıralaması, öncekiyle fark.',
    examples: [
      { label: 'Departman içi maaş sırası', sql: 'SELECT ad, departman_id, maas,\n  ROW_NUMBER() OVER (PARTITION BY departman_id ORDER BY maas DESC) AS sira,\n  RANK() OVER (ORDER BY maas DESC) AS genel_sira\nFROM calisanlar;' },
      { label: 'Yöneticisini bul (self-join)', sql: 'SELECT c.ad AS calisan, y.ad AS yonetici\nFROM calisanlar c\nLEFT JOIN calisanlar y ON y.id = c.yonetici_id;' }
    ]},
  { id: 'case', title: 'CASE & Tarih', db: 'finans',
    desc: 'Koşullu sütun üret, tarihleri parçala. Raporların mutfağı.',
    examples: [
      { label: 'Risk sınıfı', sql: "SELECT ad, risk_skoru,\n  CASE WHEN risk_skoru >= 750 THEN 'düşük risk'\n       WHEN risk_skoru >= 600 THEN 'orta risk'\n       ELSE 'yüksek risk' END AS sinif\nFROM kredi_musteriler\nORDER BY risk_skoru DESC;" },
      { label: 'Aylara göre tahsilat', sql: "SELECT substr(tarih, 1, 7) AS ay,\n  COUNT(*) AS odeme_adet, SUM(tutar) AS toplam\nFROM odemeler\nGROUP BY ay\nORDER BY ay;" }
    ]},
  { id: 'dml', title: 'INSERT / UPDATE / DELETE', db: 'satis',
    desc: 'Veriyi değiştir. Bozarsan tek tıkla "Sıfırla" — burası playground, korkma.',
    examples: [
      { label: 'Yeni ürün ekle', sql: "INSERT INTO urunler VALUES (9, 'Mekanik Klavye', 'elektronik', 3499);\nSELECT * FROM urunler WHERE id = 9;" },
      { label: 'Fiyat güncelle', sql: "UPDATE urunler SET fiyat = 999 WHERE id = 2;\nSELECT ad, fiyat FROM urunler WHERE id = 2;" },
      { label: 'Kaydı sil', sql: "DELETE FROM urunler WHERE id = 9;\nSELECT COUNT(*) AS urun_sayisi FROM urunler;" }
    ]},
  { id: 'view', title: 'VIEW & INDEX Mantığı', db: 'satis',
    desc: 'Tekrarlayan sorguyu VIEW yap, hızı INDEX ile anla.',
    examples: [
      { label: 'Ciro VIEW\'i kur', sql: 'CREATE VIEW v_ciro AS\nSELECT u.kategori, SUM(d.adet * d.birim_fiyat) AS ciro\nFROM siparis_detay d\nJOIN urunler u ON u.id = d.urun_id\nGROUP BY u.kategori;\nSELECT * FROM v_ciro ORDER BY ciro DESC;' },
      { label: 'INDEX + EXPLAIN', sql: 'CREATE INDEX idx_siparis_musteri ON siparisler(musteri_id);\nEXPLAIN QUERY PLAN\nSELECT * FROM siparisler WHERE musteri_id = 1;' }
    ]}
];
