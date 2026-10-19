# PractiSQL nasıl çalışır?

PractiSQL, cihazda çalışan bir SQLite çalışma alanını isteğe bağlı bir AI öğretmenle birleştirir. AI harness; istek bağlamını, model araçlarını, SQL yürütmesini, işlem kanıtlarını ve öğrenme akışlarını koordine eder. Öğrenci sorusunu doğal dille anlatır; model SQL yöntemini seçer. Uygulama doğru bağlamı taşır, uygun SQL’i çalıştırır ve gerçekleşen sonucu konuşmaya geri bağlar.

[Etkileşimli mimari sunumu](../architecture/index.html?lang=tr) · [English architecture](../en/architecture.md) · [Akış görseli](../architecture/ai-harness.tr.svg)

![PractiSQL AI harness: bağlam, model araçları, SQL kontrolleri ve öğrenme akışları](../architecture/ai-harness.tr.svg)

Şema üç ana katmanı birlikte gösterir: kaynak kimliğiyle saklanan bağlam ve bellek, model ve araç çağrılarının yönetimi, yerel SQLite yürütmesi ve gerçekleşen işlem kayıtları. Alt sıradaki öğrenme yolları bu temeli kendi veri ve değerlendirme kurallarıyla kullanır. Yeşil oklar istek/yürütme yolunu, kesikli çizgiler kaynak getirmeyi ve geri beslemeyi, kehribar çizgiler tek ve koşullu düzeltmeyi gösterir.

![Güncel SQL çalışma alanı, yerel sonuçlar ve öğretici açıklama](../screenshots/leaf/01-workspace.png)

Bu demoda sentetik perakende verileri kullanılır. SQL editörü ve sonuç tablosu yerel yürütmeyi gösterir; hazırlanmış öğretim mesajı konuşmanın bu sonuçları nasıl açıklayabileceğini örnekler. [Ekran görüntüsü galerisi](screenshots.md), 30 bölümü üç temada gösterir.

## Bir sorunun izlediği yol

```mermaid
sequenceDiagram
    autonumber
    actor Student as Öğrenci
    participant App as PractiSQL harness
    participant Sources as Bağlam ve arşivler
    participant Model as Seçilen model
    participant SQL as Yerel SQLite

    Student->>App: Soru, seçilen SQL veya alıntı
    App->>App: Çalışma alanını, sohbeti, veritabanı kimliğini,<br/>revizyonu ve işlem sınırlarını kaydet
    App->>Sources: İlgili geçmişi, şemayı, gözlemleri<br/>ve özgün kaynak kimliklerini getir
    Sources-->>App: Özgün soruyu öğretmen kuralları<br/>ve ilgili bağlamla birleştir
    opt Bağlam modelin bütçesini aşıyorsa
        App->>Sources: Eski içeriği yalnız gerektiğinde özetle<br/>Yanıt payını ayır, özgün arşivleri koru
        Sources-->>App: Kaynaklarına geri dönülebilen sınırlı bağlam
    end
    App->>Model: Seçilen hesap veya API bağlantısıyla gönder<br/>Chat Completions, Messages veya Responses
    loop İstek bütçesi içindeki model ve araç devamı
        Model-->>App: Yerel protokolde read_context veya inspect_database çağrısı
        App->>App: İstek kapsamını, iptali, süreyi<br/>ve salt okuma araç sınırlarını kontrol et
        alt read_context
            App->>Sources: İstenen özgün kaynak sayfasını oku
            Sources-->>App: Mesajlar, SQL, işlemler veya tam sonuç arşivi
        else inspect_database
            App->>SQL: İlgili veritabanından salt okunur gözlem al
            SQL-->>App: Kapsam ve sınırları belli gerçek gözlemler
        end
        App->>Model: Araç sonucunu aynı isteğe geri gönder
    end
    Model-->>App: Nihai yanıt
    App->>App: Açıklamayı, öğretim örneklerini<br/>ve çalıştırılabilir tam SQL bütününü ayır
    opt Biçim hatası uygunsa ve ortak düzeltme hakkı kullanılmadıysa
        App->>Model: Özgün soru ve gerçek biçim hatasıyla<br/>bir kez koşullu düzeltme iste
        Model-->>App: Düzeltilmiş yanıtın bütünü
        App->>App: Yanıtın tüm kurallarını yeniden denetle
    end
    alt İstek iptal edilmiş, eskimiş veya işlem izinsizse
        App-->>Student: İşlemin neden durduğunu göster<br/>Gecikmiş SQL’i uygulama
    else İstek güncel ve işleme izin varsa
        alt Yalnız açıklama
            App->>App: Öğretim örneklerini çalıştırma
        else Salt okunur sorgu
            App->>SQL: Kopya veya bağlantı üzerinden okuma worker’ı<br/>Süre ve sonuç sınırlarını uygula
            SQL-->>App: Gerçek sonuç tabloları veya yürütme hatası
        else AI yazma işlemi
            App->>SQL: SAVEPOINT aç ve SQL bütününü çalıştır
            SQL->>SQL: Kısıtları, tetikleyicileri ve ilgili<br/>kapsamlı veri koruma koşullarını denetle
            alt Denetimler geçerse
                SQL-->>App: RELEASE ile gerçek sonuçları ve değişiklikleri döndür
            else Yürütme veya koruma denetimi başarısızsa
                SQL-->>App: Bu işlemi ROLLBACK ile geri al, gerçek hatayı döndür
            end
        end
        App->>Sources: Sohbeti ve gerçek SQL sonuçlarını sakla<br/>Tam SQL, tablolar, hatalar, değişiklikler ve kaynak kimlikleri
        opt SQL veya belirli anlatım hatası uygunsa ve ortak düzeltme hakkı kullanılmadıysa
            App->>Model: Özgün soru ve gerçek hata ya da gözlemle<br/>bir kez koşullu düzeltme iste
            Model-->>App: Düzeltilmiş yanıt veya SQL bütününü döndür
            App->>App: Kuralları, güncel kapsamı ve sınırları tekrar denetle
            opt Düzeltilmiş çalıştırılabilir SQL gerekiyorsa
                App->>SQL: Uygun okuma veya yazma kurallarını uygula
                SQL-->>App: Düzeltilmiş gerçek sonuç veya hata
            end
            App->>Sources: Düzeltilen denemede gerçekten olanı kaydet
        end
        App-->>Student: Açıklamayı gerçek sonuçlarla birlikte göster<br/>Hata ve değişiklikleri görünür kıl
    end
    Note over App,Model: İki uygun düzeltme noktası TEK ortak hakkı paylaşır.<br/>Her yanıt varsayılan olarak ikinci model incelemesine gitmez.
    opt Öğrenci editörde kendisi SQL yazarsa
        Student->>App: Elle SQL veya açık transaction çalıştır
        App->>SQL: Ayrı manuel yürütme kurallarını uygula
        SQL-->>App: Gerçek sonuç, kısmi işlem veya transaction durumu
        App->>Sources: Gerçek işlemi kaynak bilgisiyle kaydet
        App-->>Student: Elle çalıştırılan işlemin gözlenen sonucunu göster
    end
    Student->>App: Yapılan işle ilgili takip sorusu
    App->>Sources: Sonraki istek için ilgili özgün bağlamı<br/>ve eksiksiz sonuç arşivini geri getir
```

| Aşama | Uygulamanın yaptığı |
|---|---|
| İstek | Çalışma alanını, sohbeti, DB revizyonunu, seçili kodu veya alıntıyı yakalar. |
| Bağlam | Öğretmen sözleşmesini, gerçek SQLite şemasını ve ilgili geçmişi hazırlar. Son soruyu korur. |
| Model | Kullanıcının niyetini yorumlar, SQL yöntemini ve anlatımı seçer. Gerektiğinde kanıt ister. |
| Araçlar | `read_context` kaydedilmiş kaynağı, `inspect_database` güncel kayıtları okur. |
| Yürütme | Okumalar kopya bağlantıdaki worker’da; normal AI yazma partileri savepoint ve ilgili denetimlerle çalışır. |
| Sonuç | Gerçek tablolar, hatalar, kısmi durumlar ve kaynak bilgisi kaydedilir; geçmiş sonuç yeni veriden uydurulmaz. |

Başarılı her cevap ikinci bir modele gönderilmez. Araç devamı, özetleme ve uygun hatada sınırlı onarım koşulludur. Manuel editör, açık transaction/bağlantı komutları, sınav ve proje ayrı yürütme sözleşmelerine sahiptir.

## Bağlam, bellek ve iptal

Bağlam kapasitesi ve yanıt payı seçilen modele göre yönetilir. Gerekli olduğunda eski içerik sıkıştırılır; özgün mesajlar, SQL ve sonuç kaynakları kimlikleriyle saklanır. `read_context` bu kaynakları sayfalar halinde geri getirebilir. Güncel veritabanı gözlemleriyle geçmiş sonuçlar ayrı kaynaklardır; geçmiş bir soruyu yanıtlamak için sorgu güncel veride sessizce yeniden çalıştırılmaz.

Yanıtın çalışma alanı, sohbeti ve veritabanı revizyonu ilk istekle karşılaştırılır. İptal, bekleyen model ve araç işlerini durdurur; zaten uygulanmış bir işlem sonradan iptal edilmiş sayılmaz. Bu kurallar istek yaşam döngüsünün sınırlarını korur; modelin her açıklamasının doğruluğunu garanti etmez.

## Sorumluluklar ve kaynak kod

| Sorumluluk | Ana kaynak |
|---|---|
| İstek kapsamı ve orkestrasyon | [İstek zarfı](../../app/renderer/ai-request-envelope.js), [ana arayüz akışı](../../app/renderer/app.js) |
| Öğretmen ve yanıt sözleşmeleri | [Öğretmen sözleşmesi](../../app/renderer/ai-teacher-contract.js), [yanıt zarfı](../../app/renderer/ai-answer-envelope.js) |
| Bağlam kapasitesi ve kaynak belleği | [Bağlam yöneticisi](../../app/renderer/ai-context-manager.js), [kaynaklar](../../app/renderer/ai-context-sources.js) |
| Model araçları ve salt okuma | [Araç protokolü](../../app/renderer/ai-tool-protocol.js), [veritabanı inceleme](../../app/database-inspection) |
| SQL yürütmesi ve işlem kanıtı | [Okuma yürütücüsü](../../app/sql-read-runner.cjs), [yazma kanıtı](../../app/sql-write-evidence.cjs) |
| Kalıcı kayıtlar | [Veritabanı deposu](../../app/database-store.cjs), [sonuç arşivi](../../app/operation-result-store.cjs), [sohbet kayıtları](../../app/renderer/ai-conversation.js) |
| Hesap ve sağlayıcı bağlantısı | [Ana süreç](../../app/main.js), [ChatGPT köprüsü](../../app/chatgpt-account.js) |

## Öğretim ve değerlendirme

Modelin görevi yalnız SQL üretmek değildir: kavramı açıklamak, örneği adımlandırmak ve uygun karşılaştırmalarda tablo kullanmaktır. Başlık ve Markdown desteği anlatımı okunur kılar; yöntem ve açıklamanın kapsamı tek bir sabit şablona sıkıştırılmaz.

SQL’in çalışması, doğru görev sonucunu vermesi ve açıklamanın doğru olması ayrı konulardır. Yerel kontroller gerçek SQLite kısıtlarını ve açık veri sınırlarını denetler; her iş yorumunu veya öğretim hatasını otomatik olarak yakaladıkları iddia edilmez.

## Ayrı öğrenme yolları

- **Dersler ve PDF:** Kendi öğretim verileri ve SQLite gözlemleri kullanılır. Üretilen ders SQL’i kişisel çalışma alanına kendiliğinden uygulanmaz.
- **Challenge:** Ayrı deneme DB’sinde, üç farklı deneme verisinde kontrol edilir. Şema alanları ve örnek kayıtlar öğrenciye tablo olarak sunulur.
- **Sınav:** Soruların üretimi, cevapların kopyada yürütülmesi, bağlantı ayarlarının yakalanması ve notlandırma ayrı akıştır.
- **SQL alıştırmaları:** AI, sentetik ve tam sorgular üretir. Arayüz seçilen SQL ifadesini boşluğa çevirir; sözdizimini boş ve geçici SQLite bağlantısında kontrol eder. Anahtar kelime cevapları yerelde karşılaştırılır. Kişisel şema veya kayıtlar alıştırma isteğine girmez.
- **Veri projesi:** UCI kaynağı doğrulanır, iş sorusu netleştirilir, bağımsız çalışma alanı kurulur. Sayısal sonuçlar özgün kayıtlardan bağımsız hesaplanır; AI iş yorumunu kanıtlara bakarak değerlendirir. Ödül kararı uygulama kodundadır.

Sınavın şema görünümü, sınavla aynı sabitlenmiş veritabanı kopyasını kullanır. Boşluk doldurma sorusuna isteğe bağlı olarak verilen her doğru tam sorgu cevabı ek 25 XP kazandırır; soru setine bağlı ödül kaydı tekrar ödülü engeller. Alıştırmalarda 10, 15 veya 20 soru seçilebilir; öğrencinin cevabı bir veritabanında yürütülmez.

![Güncel uygulamada şemasız SQL mantığı alıştırmaları](../screenshots/leaf/27-sql-exercises.png)

## Gizlilik ve güvenlik

SQL cihazda çalışır. AI özellikleri kullanıldığında soru, ilgili sohbet, şema ve gerektiğinde örnek/sonuç kayıtları seçilen sağlayıcıyla paylaşılabilir. Bu bilgi ilk kurulumun sağlayıcı adımında açıklanır; bağlantı ertelenebilir.

Kaydedilen API anahtarları OS korumalı kasada tutulur; Windows’ta DPAPI kullanılır. DB ve sohbet dosyaları varsayılan olarak şifrelenmez. CSP paketli kodu, WASM ve worker’ları desteklerken enjekte edilen JavaScript’i sınırlar; özel HTTP/HTTPS sağlayıcı adreslerini kapatmaz.

İmzalı yayın hattı hazırdır ancak gerçek yayıncı sertifikası henüz yoktur. Mevcut yerel kurucu imzasızdır. [Gizlilik açıklaması](../PRIVACY.md), [teknik sınırlar](../../.github/SECURITY.md) ve [yayın hazırlığı](../PUBLICATION.md) bu ayrımları açıklar.

## Sunumu kullanmak

`docs/architecture/index.html` dosyasını tarayıcıda aç. Türkçe/English seçimi, sekiz bölüm ve seçilebilir bileşenler çevrimdışı çalışır. Dil değişimi açık bölümü ve seçili bileşeni korur. GitHub’daki Markdown ve Mermaid şemaları doğrudan okunabilir; HTML için Pages yayını zorunlu değildir.

Yapılandırılmış kaynak `docs/architecture/architecture.json` içindedir. `npm run docs:build` sunumu ve iki dildeki SVG akışlarını yeniden üretir. `npm run test:docs` dil seçimini, ayrıntıları ve bağlantıları gizli bir Electron oturumunda doğrular.

Bu anlatım mevcut kodun sorumluluklarını belgeler. Diyagramlar tek başına doğruluk veya bütün modellerde başarı garantisi değildir.
