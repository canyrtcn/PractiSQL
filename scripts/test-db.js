// Gerçek doğrulama: seed SQL'leri node'da sql.js ile koşturur, örnek sorguları sayar.
const fs = require('fs');
const path = require('path');

(async () => {
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs({ locateFile: (f) => path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', f) });

  global.window = {};
  eval(fs.readFileSync(path.join(__dirname, '..', 'renderer', 'demos.js'), 'utf8'));
  const DEMOS = global.window.DEMOS;

  const checks = {
    satis: [
      'SELECT COUNT(*) FROM musteriler',
      'SELECT u.kategori, SUM(d.adet*d.birim_fiyat) c FROM siparis_detay d JOIN urunler u ON u.id=d.urun_id GROUP BY 1 ORDER BY 2 DESC',
      'SELECT * FROM siparisler ORDER BY tarih DESC LIMIT 5'
    ],
    hr: [
      'SELECT COUNT(*) FROM calisanlar',
      'SELECT ad, maas FROM calisanlar WHERE maas > (SELECT AVG(maas) FROM calisanlar)',
      'SELECT ad, ROW_NUMBER() OVER (PARTITION BY departman_id ORDER BY maas DESC) s FROM calisanlar'
    ],
    finans: [
      'SELECT COUNT(*) FROM krediler',
      'WITH t AS (SELECT kredi_id, SUM(tutar) o FROM odemeler GROUP BY 1) SELECT k.id, k.tutar - t.o kalan FROM krediler k JOIN t ON t.kredi_id=k.id',
      'SELECT substr(tarih,1,7) ay, SUM(tutar) FROM odemeler GROUP BY 1 ORDER BY 1'
    ]
  };
  let fail = 0;
  for (const [key, queries] of Object.entries(checks)) {
    const db = new SQL.Database();
    try {
      db.exec(DEMOS[key].sql);
      const tables = db.exec("SELECT COUNT(*) FROM sqlite_master WHERE type='table'")[0].values[0][0];
      console.log(`[OK] ${key}: seed kuruldu (${tables} tablo)`);
      queries.forEach((q, i) => {
        try {
          const r = db.exec(q);
          const n = r.length ? r[0].values.length : db.getRowsModified();
          console.log(`  [OK] sorgu${i + 1}: ${n} satır`);
        } catch (e) { fail++; console.log(`  [FAIL] sorgu${i + 1}: ${e.message}`); }
      });
      const bin = db.export();
      const db2 = new SQL.Database(bin);
      const n2 = db2.exec("SELECT COUNT(*) FROM sqlite_master WHERE type='table'")[0].values[0][0];
      console.log(`  [OK] export/import turu: ${bin.length} byte, ${n2} tablo`);
      db.close(); db2.close();
    } catch (e) { fail++; console.log(`[FAIL] ${key}: ${e.message}`); }
  }
  try {
    global.window = {};
    eval(fs.readFileSync(path.join(__dirname, '..', 'renderer', 'topics.js'), 'utf8'));
    const n = global.window.TOPICS.length;
    const ex = global.window.TOPICS.reduce((a, t) => a + t.examples.length, 0);
    console.log(`[OK] topics.js: ${n} konu, ${ex} örnek`);
  } catch (e) { fail++; console.log('[FAIL] topics.js: ' + e.message); }
  console.log(fail === 0 ? 'TUM TESTLER GECTI' : `${fail} HATA VAR`);
  process.exitCode = fail === 0 ? 0 : 1;
})().catch(error => { console.error(error.message); process.exitCode = 1; });
