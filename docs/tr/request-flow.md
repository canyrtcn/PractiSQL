# İsteğin izlediği akış

[English](../en/request-flow.md) · [Türkçe](../tr/request-flow.md)

Akış yukarıdan aşağıya okunur. Modelin araçlarla devamı, farklı SQL yürütme yolları ve tek koşullu düzeltme açıkça gösterilir.

```mermaid
flowchart TB
    INPUT["Öğrencinin sorusu, seçtiği SQL veya alıntı"]
    SCOPE["Çalışma alanı, sohbet, veritabanı kimliği ve revizyonunu kaydet"]
    CONTEXT["Öğretmen kurallarını, şemayı, ilgili geçmişi ve özgün soruyu birleştir"]
    CAPACITY{"Bağlam modelin kapasitesine sığıyor mu?"}
    COMPACT["Eski içeriği özetle; özgün kaynak kimliklerini ve tam arşivleri sakla"]
    MODEL["Seçilen model: Chat Completions, Messages veya Responses bağlantısı"]
    TOOL{"Model salt okuma aracı istedi mi?"}
    READTOOL["read_context: arşivlenmiş kaynaklar<br/>inspect_database: yakalanan veritabanından gözlemler"]
    ANSWER["Açıklamayı, öğretim örneklerini ve çalıştırılabilir tam SQL partisini ayır"]
    GUARD{"İstek kapsamı güncel ve işlem izinli mi?"}
    STOP["İptal et veya eski yanıtı reddet; gecikmiş SQL’i uygulama"]
    ROUTE{"SQL çalıştırılması gerekiyor mu?"}
    TEXT["Açıklamayı ve çalıştırılmayacak öğretim örneklerini göster"]
    READ["Salt okuma worker’ı<br/>Kopya veya bağlantı, süre ve sonuç sınırları"]
    WRITE["AI yazma partisi<br/>SAVEPOINT, kısıtlar, tetikleyiciler ve ilgili veri koruma denetimleri"]
    EDITOR["Elle SQL yazılan editör"]
    MANUAL["Manuel editör veya açık transaction<br/>Ayrı yürütme kuralları; gerçek kısmi durum ve transaction kaydı"]
    RESULT["Gerçek sonuçları, SQL’i, hataları ve değişiklikleri kaynak kimlikleriyle kaydet"]
    REPAIR{"Hata düzeltmeye uygun ve ortak deneme hakkı kullanılmamış mı?"}
    CORRECT["Özgün soru ve gerçek hata/kanıtla bir kez koşullu düzeltme yap"]
    SHOW["Gerçek işlem sonuçlarını açıklamanın yanında göster"]
    MEMORY["Takip soruları için sohbeti, işlem kayıtlarını ve tam sonuç arşivlerini sakla"]
    INPUT --> SCOPE --> CONTEXT --> CAPACITY
    CAPACITY -- Evet --> MODEL
    CAPACITY -- Yer gerekiyor --> COMPACT --> MODEL
    MODEL --> TOOL
    TOOL -- Evet --> READTOOL --> MODEL
    TOOL -- Hayır --> ANSWER --> GUARD
    GUARD -- Hayır --> STOP
    GUARD -- Evet --> ROUTE
    ROUTE -- Yalnız açıklama --> TEXT --> SHOW
    ROUTE -- Okuma --> READ --> RESULT
    ROUTE -- AI yazma --> WRITE --> RESULT
    EDITOR --> MANUAL --> RESULT
    ANSWER -. Biçim hatası .-> REPAIR
    RESULT -. Uygun yürütme veya anlatım hatası .-> REPAIR
    REPAIR -- Evet --> CORRECT --> ANSWER
    REPAIR -- Hayır --> SHOW
    RESULT --> SHOW --> MEMORY
    MEMORY -. Sonraki soruda kaynakları geri getir .-> CONTEXT
    classDef scope fill:#e8f0df,stroke:#6a8c4f,color:#1f351d;
    classDef model fill:#263e21,stroke:#6a8c4f,color:#ffffff;
    classDef boundary fill:#f4ead8,stroke:#a37b43,color:#604923;
    class SCOPE,CONTEXT,COMPACT,RESULT,MEMORY scope;
    class MODEL,READTOOL model;
    class GUARD,STOP,REPAIR,CORRECT boundary;
```

İstek kapsamı ve iptal durumu, model ve araçların asenkron işlemleri boyunca kontrol edilir. AI yazma partisi ilgili denetimler geçilince SAVEPOINT’i tamamlar; hata olursa o parti geri alınır. Açık transaction ve manuel komutların sonuç/kısmi durum kuralları ayrıdır. Her cevap varsayılan olarak ikinci bir model incelemesine gönderilmez; düzeltme koşulludur ve ortak bir deneme hakkı kullanır.

[Ayrıntılı mimari ve kaynak kod eşlemesi](architecture.md)
