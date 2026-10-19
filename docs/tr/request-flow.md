# İsteğin izlediği akış

[English](../en/request-flow.md) · [Türkçe](../tr/request-flow.md)

Akış yukarıdan aşağıya okunur. Modelin araçlarla devamı, farklı SQL yürütme yolları ve tek koşullu düzeltme açıkça gösterilir.

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

İstek kapsamı ve iptal durumu, model ve araçların asenkron işlemleri boyunca kontrol edilir. AI yazma partisi ilgili denetimler geçilince SAVEPOINT’i tamamlar; hata olursa o parti geri alınır. Açık transaction ve manuel komutların sonuç/kısmi durum kuralları ayrıdır. Her cevap varsayılan olarak ikinci bir model incelemesine gönderilmez; düzeltme koşulludur ve ortak bir deneme hakkı kullanır.

[Ayrıntılı mimari ve kaynak kod eşlemesi](architecture.md)
