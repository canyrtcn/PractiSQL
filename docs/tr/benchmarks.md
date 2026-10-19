# Kaydedilmiş model kontrolleri

Bu sonuçlar tarihsel yerel test gözlemleridir; 3.4.261’in yeni veya bağımsız bir model benchmarkı değildir. Aynı temel yedi sorgu SELECT, WHERE, GROUP BY, ORDER BY, HAVING, JOIN ve CTE kapsamını kontrol etti. Süreler sağlayıcı, tarih ve uygulama akışına bağlıdır; bugünkü gecikme tahmini değildir.

| Model | Son SQL sonucu | Ort. sorgu süresi |
|---|---:|---:|
| gpt-6-luna | 7 / 7 | 5.28 s |
| deepseek-v4.1-flash | 7 / 7 | 15.79 s |
| muse-spark-1.3-contributor | 7 / 7 | 9.97 s |
| qwen3.8-flash | 7 / 7 | 8.23 s |
| glm-5.3-flash | 7 / 7 | 30.57 s |
| mimo-v2.6-flash | 7 / 7 | 24.13 s |

Gemini 3.5 Flash Lite ayrıca iki koşuda 2/2 ve 5/5 ile kapsamı tamamladı; kalan bölümde bir soru mevcut SQL düzeltmesiyle geçti. Bu farklı koşular tek bir hız puanına dönüştürülmedi. Bu küçük sette tam sonuç almak daha geniş görevlerde kusursuzluk anlamına gelmez: eski geniş Qwen kapsamı tamamlanmadı, Gemini’de önemli SQL kusuru ve farklı modellerde öğretim kusurları gözlendi.

## Ortak doğal dil değerlendirmesi

3.4.241’de aynı Türkçe/İngilizce zincirde model başına altı güncel SQL görevi ve sekiz yanıt incelendi. GPT-6 Luna: SQL 6/6, önemli öğretim kusuru saptanmayan yanıt 8/8. Muse Spark 1.3 Contributor: 6/6 ve 8/8. DeepSeek v4.1 Flash: 6/6 ve 6/8; sıfır/NULL ayrımındaki yanlış açıklama tam not verilmesini engelliyor. Muse’un değişmiş veride ek yerel kontrolü 35/36 idi; bu, kendisine verilen güncel verideki 6/6 sonucundan ayrı tutulur.

SQL değerlendirmesi gerçek veri, tam sonuçlar, kısıtlar ve istenmeyen değişiklik kontrolüne dayanır. Anlatım değerlendirmesi yanıtların gerçek SQL/veriyle insan gözetiminde karşılaştırılmasıdır; bağımsız standartlaştırılmış hakem puanı değildir. Küçük örneklem, farklı tarih/sürüm, açık kusurlar ve eksik kapsam saklanmaz. Model adları kayıtlı sağlayıcı adlarıdır; ürünün resmî model erişim garantisi değildir. Bu belge için yeni ücretli model çağrısı yapılmadı.

[CSV](../benchmarks/observations.csv) · [README](../../README.tr.md)
