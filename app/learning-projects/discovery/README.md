# Modüler gerçek veri projesi — ürün modülü

## Güncel durum — 16 Ekim 2026

Bu modül 3.4.242 ile ürüne alındı; kurulum ve gerçek uygulama açılışı doğrulandı. Canlı kaynak keşfi → görev → ayrı çalışma alanı → SQL/not teslimi → AI iş yorumu zinciri bir DeepSeek devamında tamamlandı. XP/profil ve paket kabulü de tamamlandı. 3.4.243 yalnız renderer kopyasının Node bağımlılık yollarını düzeltir; tarayıcı akışı ve model talimatları değişmez. Aşağıdaki 14–15 Ekim bölümleri tarihsel gelişim kaydıdır; o bölümlerdeki “henüz yapılmadı” ifadeleri bugünkü durumu tanımlamaz.

Güncel model araçları `search_project_datasets`, `describe_project_dataset`, `inspect_project_dataset`, `propose_project`, `read_project_evidence` ve `submit_project_review`. Gerçek TR/EN persona ve mevcut sağlayıcı taşıyıcıları kullanılır; eski `discovery-session.messages()` güncel çağrının personası değildir. Normal sohbet Markdown, native araç parametreleri JSON'dır. Proje görüşmesi, özgün öğrenci isteği, kaydedilmiş SQL/not ve önceki geri bildirim korunur; ortak sağlayıcı kapasitesi/%80 sıkıştırma yönetimi kullanılır.

`project-completion.cjs` bütün sayısal raporları doğru, bütün ödevleri kaynağa uygun değerlendirilmiş ve **her** iş yorumu en az 14/20 olan teslimi tamamlar. Puan 80 sayısal + ortalama AI puanıdır. `project-awards.js` proje başına 300 XP/3 yıldızı tek kez yazar; miktarı model belirlemez. Atomik tamamlanma kaydı ve profil ödül işareti yeniden açılışta eşitlenir. Sonraki düzenlemeler önceki başarılı SQL/not/değerlendirmesini değiştirmez. AI puanı kalibre öğretmen puanı değildir.

Kaynak her değerlendirmede özgün CSV'den yeniden hazırlanır. Çalışma alanının bütün bayt kimliği yeni kanonik veritabanıyla aynıysa ikinci satır taraması yapılmaz; farklıysa mevcut tür/bütünlük/tam satır çoklu-kümesi denetimi korunur. Her raporun bağımsız CSV hesabı devam eder. Raporlar arasında çözülmüş kayıtları bellekte tutma adayı yüksek bellek maliyeti nedeniyle alınmadı; kalıcı sonuç önbelleği eklenmedi.

Güncel kanıtlar:

- `artifacts/project-tool-errors-acceptance-241-closure.json`: 541.909 kayıt üzerinde iki rapor ve canlı değerlendirme. Sayısal çıktı bağımsız doğrulandı; AI puan gerekçesindeki ölçülmemiş yoğunlaşma çıkarımı sınırı açık. Bu aşamada SQL'i bağımsız gözlemci yazdı; modele SQL üretim puanı değildir.
- `artifacts/project-completion-241-closure.json`: 80 yerel kontrol grubu; gerçek Electron arayüzü, üç tema, tek ödül, yeniden açılış, yarım kayıt kurtarma ve geçmiş teslimin korunması.
- `artifacts/project-performance-241-final.json`: son adayda 52 yerel kontrol grubu. İki raporun yerel denetimi özgün çalışma alanında 16,01 → 11,33 sn; ek görünümde 16,13 → 15,95 sn. Bunlar tek örnekler; sağlayıcı süresi veya kararlı hız yüzdesi değildir.
- `artifacts/current-evidence-index.json`: önceki bağlam, protokol, iptal ve hata taşıma kanıtları. Eski testler güncel tam tur gibi toplanmaz.

Yerel tamamlanma, performans ve 242 ürün/paket kabulü yeni model çağrısı yapmadı. Ana SQL/öğretim akışı ve model ayarları korundu. Genel proje başarısı bütün modellerin kusursuzluğu anlamına gelmez; ayrı model anlatım kusurları açık. 242 kabul kanıtı: `artifacts/release-242-acceptance.json`.

## Tarihsel başlangıç notları — 14 Ekim

Bu klasör uygulamanın yüklediği veya paketlediği bir modül değildir. Normal SQL sohbeti, persona, model ayarları, mevcut proje puanlaması ve kullanıcı veritabanları değişmedi. Genel proje özelliğinin tamamlandığını göstermez.

Akış:

1. Öğrencinin doğal isteği aynen modele verilir. İlk denemedeki `find_project_dataset/search` aracı daha sonra `search_project_datasets` olarak ayrıldı. Model kaynakta işe yarayacak arama terimini seçer. UCI'nin standart dosyası bulunan katalog adları bir kez alınır; tam sözcük örtüşmeleri sıralanır ve kısmi eşleşmeler açıkça belirtilir. Bu ad aramasıdır; iş açısından uygunluk veya doğal dilden SQL tekniği çıkarımı değildir.
2. `inspect`, resmî UCI metadata kaydı ve o kaydın bildirdiği standart CSV dosyasını okur. Şema, gerçek satır sayısı, kaynak açıklamaları ve dosya kimliği birlikte döner. Gerçek boş/yalnız boşluk hücre sayıları, sayısal aralık ve sütun başına üç sınırlı özgün örnek sunulur. `missingCount` metadata uyarınca SQL NULL'a çevrilenleri sayar; boş TEXT ile aynı değildir. Tarih biçimi tahmin edilmez; kesilen örnekler işaretlenir. Kaynak metni ve hücreler talimat sayılmaz.
3. CSV bir iş parçacığında bütünüyle incelenir ve yeni, bağımsız SQLite kopyası hazırlanır. PK, FK veya NOT NULL uydurulmaz. ID yazımı, eksik değer ayrımı ve sayısal hassasiyet korunur; kayıplı tür dönüşümü yerine metin kullanılır. SQLite REAL dönüşümünün kayan nokta niteliği açıkça kaydedilir.
4. `project-planner.cjs` içindeki `propose_project`, yalnız incelenmiş kaynağı ve mevcut sütunları kullanan bir **taslak** kabul eder. Ölçüm belirtimleri arka planda bütün özgün kayıtlarda hesaplanır; modele cevap hücreleri verilmez. İş anlamını veya öğretim doğruluğunu onaylamaz. Modelden gelen `gradingEnabled`, `rewardsEnabled`, puan veya gizli SQL alanları bu sınırı aşamaz. Eski `discovery-session.proposal()` yalnız ilk oturum deneyinin basit taslağıdır; yeni model araç akışı onu kullanmaz.
5. Öğrencinin seçtiği dosya, kaynakla bütün kayıtları üzerinden bir iş parçacığında karşılaştırılır. Yalnız BOM/satır sonu gibi CSV kodlaması farkları kabul edilir; hücre değişikliği, kayıt eksiltme, sıralama değişikliği veya başka dosya kabul edilmez. Başarılı sonuç bağımsız bir SQLite kopyasıdır. Ayrı uygulama kopyasındaki yeni IPC/arayüz adaptörü bunu yeni çalışma alanına aktarır; kurulu ürün bu adaptörü henüz yüklemez.
6. Oturum kapandığında indirme ve hazırlık iptal olur. Geç sonuçlar yeni projeye taşınmaz. Aynı kaynağın eşzamanlı incelenmesi tek indirmeyi paylaşır; dışarı verilen kanıtlar iç kayıtları değiştiremez.

Dosyalar: `uci-catalogue.cjs` kaynak adaptörü; `verified-csv.cjs` içerik/tür denetimi; `discovery-session.cjs` istek ömrü; `prepare-runner.cjs` / `prepare-worker.cjs` arka plan hazırlığı; `project-planner.cjs` ölçülebilir taslak; `project-request.js` mevcut sağlayıcı/araç döngüsüne yalnız bu istek için adaptör.

Kaynak korumaları: HTTP yönlendirmesi izlenmez; URL resmî kökene ve veri kümesi kimliğine bağlıdır. Ağ metadata okuması 2 MiB, dosya 64 MiB; CSV en fazla 1 milyon kayıt / 2.000 sütun kabul eder. Sınır aşımı kısmi veri üretmez. İş parçacığının V8 heap sınırı 512 MiB, bekleme sınırı 10 dakikadır; bu toplam süreç belleği garantisi değildir. Bunlar yerel dosya kaynak sınırlarıdır, model context/yanıt token sınırı değildir.

Metadata ağ beklemesi 20 saniye, dosya indirme beklemesi ayrı olarak 10 dakikadır. Kullanıcı iptali ve ağ zaman aşımı farklı hata kodlarıyla bildirilir. CSV okuma kaynak metin dilimlerini kullanır; içerik kimliği bütün dosyayı tekrar JSON metnine kopyalamadan hesaplanır. Özgün hücreler, eski içerik hash sözleşmesi ve bellek sınırı korunur.

UCI API yanıtında lisans yoksa `null` kalır. Test edilen iki kaynağın resmî web sayfalarında CC BY 4.0 doğrulandı; bu ayrı insan incelemesi, bütün UCI kaynaklarının lisansının doğrulandığı anlamına gelmez.

Ürüne geçiş için kalanlar:

- Modüler IPC/arayüz bağlantısının ürün kabulü. Prototipte `project-request.messages()` gerçek TR/EN `teacherPersona` metnini aynen kullanıyor; normal SQL yürütme sözleşmesi yerine proje görevini ekliyor. `project-request.run()` mevcut `chat` taşıyıcısına yakalanmış sağlayıcı rotası, context ve iptal kontrolüyle bağlanıyor. Chat/Messages/Responses taşıyıcıları ve ayrı uygulama kopyasındaki gerçek IPC akışı sahte ağla doğrulandı. Eski `discovery-session.messages()` güncel model deneyi için kullanılmıyor. Ürünün genel SQL araç kaydı değişmedi.
- Dosyanın temsil ettiği gözlem birimi, tarihler, birimler ve yönetimin istediği rapor arasındaki tutarlılığın değerlendirilmesi. Kaynak sütun adlarının doğru olması bunu tek başına kanıtlamaz.
- AI'ın kendi yazdığı referans SQL'e karşı kendi ödevini doğrulamasını kesin puan gibi sunmayan değerlendirme. Mevcut doğrulanmış UCI günlük projesindeki bağımsız sayısal ölçütler korunacak; yeni kaynaklar için bu dayanak kurulmadan otomatik XP açılmayacak.
- Deneme kopyasında tamamlanan kaynak/indirme/taslak/çalışma alanı/rapor/kalıcılık akışının canlı genel proje kabulü. Ardından paket kontrolü, yedek ve kurulum.

Doğrulama kanıtları repo kökündeki `artifacts/project-discovery-241-closure.json` dosyasındadır. Eski başarısız ağ denemesi silinmedi; yanlış metadata satır varsayımı ayrıca açıklandı.

## Bağımsız rapor ölçümleri ve teslim deneyi

`report-measures.cjs` doğrulanmış CSV kayıtlarından beklenen ölçümleri doğrudan hesaplar; cevap anahtarı SQL'i üretmez veya çalıştırmaz. `report-brief.cjs` aynı belirtimden TR/EN kayıt kapsamı, gözlem birimi, ölçümler, eksik değer davranışı ve çıktı düzenini sunar. JOIN/CTE gibi bir çözüm tekniği dayatmaz. Modelin serbest iş açıklaması bu ölçütleri sessizce değiştiremez.

Desteklenen kapsam: tek kaynak tablo, en fazla dört ardışık gruplama/ölçüm aşaması, açık türde filtreler, ISO tarih parçaları, sayı/toplam/ortalama/minimum/maksimum, fark/oran/yüzde değişimi. Eksik takvim dönemleri veya iş birimleri uydurulmaz. Desteklenmeyen bir sözleşme, kaynak uyuşmazlığı ve güvenli sayısal aralık aşımı değerlendirmeyi durdurur. Gruplama anahtarları ve INTEGER sonuçları tam karşılaştırılır; REAL için yalnız kayan nokta yuvarlama toleransı vardır (`max(1e-9, abs(expected) * Number.EPSILON * 8)`). Bu para için tam ondalık aritmetik değildir; yuvarlanmış sunum veya keyfi hassasiyet politikası henüz yoktur.

`report-assessment.cjs` / `report-worker.cjs`, özgün dosyadan ayrı bir SQLite kopyası hazırlar ve öğrencinin tek SELECT/WITH raporunu iş parçacığında çalıştırır. Çoklu komutlar, yazma ve PRAGMA rapor değildir. Kısmi/kesilmiş çıktı doğru sayılmaz. Hazırlama varsayılanı 10 dakika, yerel rapor SQL'i 10 saniyedir; bu modelin veritabanı oluşturma bekleme sınırı değildir. İptal worker'ın kapanmasını bekler ve geç sonucu teslim etmez. Hata/zaman aşımı yanlış cevap puanı üretmez.

Çalışma alanı verilmezse deney özgün kanonik kaynakta değerlendirme yapar. Verilirse öğrencinin bağımsız veritabanı kopyasındaki bütün özgün `source_data` kayıtları doğrulanır; ilave tablo ve görünümler raporda kullanılabilir. Kaynak metadata ve ölçüm belirtimi öğrenci tesliminden değil, uygulamanın doğrulanmış proje kaydından gelir. Çıktıda `assignmentReviewed:false`, `businessMeaningVerified:false`, `awardsAllowed:false` kalır: ölçüm doğruluğu iş ödevinin uygunluğunu veya açıklamanın doğruluğunu kanıtlamaz. Genel AI keşfine puan/XP açılmamıştır.

İlk ölçüm kontrolleri: `artifacts/project-report-measures-241-final.json` (14 grup, içinde 11 SQLite karşılaştırması) ve `artifacts/project-report-assessment-241-final.json` (10 teslim/iptal grubu). Güncel kaynak, oturum, worker, taslak ve ölçüm kanıtlarının tam listesi `artifacts/project-planner-241-closure.json` dosyasındadır; ara çalıştırmalar yeni sürüm kanıtı gibi toplanmaz. 541.909 satırlı Online Retail dosyasının tüm 4.335.272 hücresi ayrıca Python CSV/SQLite ile karşılaştırıldı; ülke raporları bağımsız sayım/tamsayı toplamı ve `math.fsum` ile kontrol edildi. Bunlar normal sohbet modelinin yeni başarı puanı değildir.

14 Ekim'deki tek sınırlı DeepSeek keşif denemesi 4 sağlayıcı isteğinde durdu; taslak tamamlanmadı. Uzun ad aramalarının boş dönmesi, 20 saniyelik dosya beklemesi ve sonradan saptanan CSV bellek maliyeti toplu düzeltildi. Eski deneme ve kaynak kopyası korunuyor; yeni davranış için ücretli tekrar yapılmadı. Otomatik puan/XP ve genel proje özelliği kabul edilmedi.

## Sürüm 2 ölçüm belirtimi — 15 Ekim

`row-measures.cjs` özgün kayıt başına sayısal çarpım ve açık biçimli yerel takvim günü çıkarır. `version:2` belirtimindeki `rowTransforms`, gruplama aşamalarından önce yeni ölçüm sütunları tanımlar; kaynak sütunları/veritabanını değiştirmez. `count-distinct` yalnız NULL olmayan farklı saklanan değerleri sayar. Eski `version:1` belirtimleri ve taslakları aynı biçimde okunur; yeni araç tanımı sürüm 2 üretir. Bu iç araç belirtimidir; normal sohbet çıktısı hâlâ Markdown'dır.

Tarih biçimleri: `iso-date`, `iso-local-minute`, `iso-local-second`, `mdy-local-minute`, `dmy-local-minute`. Kaynağın Date sütunları için bütün NULL olmayan kayıtlarla uyumlu biçimler ve her biçimin takvim aralığı keşif kanıtına eklenir. Birden fazla uyumlu biçim belirsiz kalır; otomatik gün/ay seçimi veya saat dilimi dönüşümü yapılmaz. Geçersiz tarih, desteklenmeyen biçim, kayıplı tamsayı çarpımı ve sayısal taşma değerlendirmeyi durdurur; yanlış cevap puanı verilmez. Takvim biçimi doğrulaması iş anlamını kanıtlamaz.

Miktar × birim fiyat, iadeler/negatif değerler dahil bir satır tutarıdır; kendiliğinden muhasebe cirosu sayılmaz. Boş müşteri kodu NULL değilse farklı bir değer olarak sayılır; dışlama gerekiyorsa ölçüm kapsamı bunu açıkça belirtir. Satır sayısı, farklı kimlik sayısı ve iş varlığı sayısı ayrı kavramlardır. TR/EN ölçülebilir talepler bu ayrımları ve tarih biçimini aynı belirtimden gösterir; SQL çözüm tekniği dayatmaz.

Yeni kanıtlar `artifacts/project-measures-v2-241-closure.json` altında toplanır. İlk ara koşular final koşularla toplanmaz. 541.909 özgün satırdan üretilen 314 ülke–ay sonucu ayrı Python CSV/datetime/set/math.fsum ve Decimal hesaplarıyla karşılaştırılmıştır. İmzalı tutar hesaplarında SQLite REAL kullanımı tam ondalık para hesabına dönüştürülmüş değildir.

Kalan kapsam: genel iş ödevinin ve SQL'den bağımsız iş yorumunun değerlendirilmesi, XP/profil kabulü ve paketleme. Öğrencinin yeni tabloları, görünümleri ve JOIN sorguları, kalıcı kayıt ve genel arayüz artık ayrı deneme kopyasında kontrol edildi. Normal sohbet/persona/sağlayıcı ayarları değişmedi; bu prototip henüz uygulamaya paketlenmedi. Genel kaynaklardan ödev seçiminin canlı model kabulü ayrıca açık; yerel ölçüm doğruluğu bunun yerine geçmez.

## Kalıcı çalışma alanı ve arayüz — 15 Ekim

`project-store.cjs` kaynak dosyası, kanonik veritabanı, kaynak metadata, görev belirtimi, öğrenci SQL'i ve yorumunu yerel proje kimliğine bağlı saklar. Atomik kayıt ve sürüm denetimi geç gelen işlemin yeni taslağın üstüne yazmasını engeller. Dosya bozulması, yanlış çalışma alanı veya iptal yanlış cevap puanı üretmez. Kaynaklar yeniden indirilmeden kayıt açılabilir. Kapatılmış oturumların araç tutamaçları yeniden kullanılamaz.

`workspace-source.cjs` öğrencinin çalışma alanında özgün kaynak tablonun türlerini ve bütün kayıtlarını, yinelenen kayıt adetleriyle birlikte denetler. Aynı kayıtların yeniden sıralanması geçerlidir; veri silme/ekleme/değiştirme veya tabloyu görünümle değiştirme geçerli değildir. Öğrenci türetilmiş tablo ve görünümler oluşturabilir; bunların doğruluğu gerçek rapor çıktısı üzerinden ölçülür. Bu yöntem bütün çalışma alanını kanonik dosyaya eşitlemez ve doğru sonucu üretmenin tek yolu hakkında iddia içermez.

`project-ipc.cjs`, `project-discovery-ui.js` ve `.css` yalnız aday kopyaya bağlanır. Gerçek Electron akışında dosya seçme, ayrı çalışma alanına aktarım, raporlar arasında geçiş, iptal ve yeniden açma doğrulandı. “Atölyeye aktar” önce kaydın tam çalışma alanı kimliğine geçer. Düzenleme eski başarı görünümünü kaldırır; çift tıklama paralel denetim başlatmaz. Tema parametreli ilk açılış kabul edilir; farklı dosya/ağ kökeni ve alt çerçeve IPC erişimi reddedilir.

Son kanıt: `artifacts/project-workspace-241-closure.json`. 87 yerel kontrol grubu; bunun 28'i gerçek arayüz/görsel/kalıcılık denetimi. Kaynak ve model ağ cevapları arayüz testinde kontrollü örnektir; veritabanı, SQL worker, IPC ve kayıt işlemleri gerçektir. 541.909 satırlık ayrı dosyada kaynak koruması ve öğrencinin JOIN/görünüm raporu da kontrol edildi. Önceki ara başarısız UI koşuları saklanır; bir 30 saniyelik gözlem zaman aşımının kesin nedeni doğrulanmamıştır. Yeni model çağrısı ve ürün sürümü yoktur.

## Genel iş yorumu — 15 Ekim

`business-review.cjs` bağımsız sayısal denetimi geçen bir teslimin kaynak, görev, SQL, öğrenci notu, gerçek sonuç ve çalışma alanı özet değerlerini tek kimliğe bağlar. Model önce ödevin kaynak ve hesaplanan ölçümle uyumunu değerlendirir; ödev sorunu öğrencinin düşük puanı sayılmaz. Ardından kanıt, yorum, iş sorusuna katkı ve maddi veri sınırlarını 0–5 ölçeğinde inceler. Bu AI değerlendirmesi anlamın deterministik doğrulaması değildir; XP yetkisi vermez.

`read_project_evidence` ilk 12 satır dışındaki gerçek sonuçları sayfalayarak okur; `submit_project_review` her görevi bir kez kaydeder. Hücreler bir tabanlı indekslerle, kaynak alanları JSON pointer ile gösterilir; değerleri model yerine uygulama ekler. Boş sonuç için gerçek satır/sütun boyutu kullanılabilir. Modelin görmediği hücreyi referans göstermesi kabul edilmez. Kaynak alanına doğru atıf, yorumun gerçekliğini otomatik kanıtlamaz. Kaynak/öğrenci metnindeki talimatların modelce mutlaka görmezden gelineceği iddia edilmez.

`project-review-request.js` gerçek yerelleştirilmiş personayı ve mevcut taşıyıcıları kullanır; araç argümanları yapılandırılmıştır, sohbetin tamamı JSON'a çevrilmez. Normal SQL sohbetine ikinci değerlendirme çağrısı eklenmez. İsteğe bağlı proje değerlendirme düğmesi bu çağrıyı başlatır; son serbest metinde SQL olsa da yürütülmez. Başarılı araç kaydı olmadan serbest metin tamamlanmış değerlendirme sayılmaz.

`assessReports` aynı veritabanı kopyasında bütün raporları yürütür. Kaynak hazırlanması ve bütün özgün kayıtların doğrulanması teslim başına bir kez yapılır; her SQL için ayrı yerel yürütme süresi koruması vardır. Kayıt değişikliği veya iptal geç gelen değerlendirmeyi geçersiz kılar; kaydedilmiş yorumlar yeniden açılır. Arayüz kaydın teslim anına ait olduğunu belirtir. Çalışma alanı sonradan değiştirilirse yeni değerlendirme yeni kopyayı tekrar doğrular.

Kanıt: `artifacts/project-business-review-241-closure.json`, 108 yerel kontrol grubu. Gerçek Electron taşıyıcı/IPC/kayıt/tema kontrollerinde sağlayıcı yanıtları kontrollü örneklerdir. Büyük dosyada 541.909 kayıt, 314 ülke–ay sonucu ve bütün kayıt sayısı birlikte denetlendi. Canlı semantik kalibrasyon, genel proje XP/profil kabulü ve ürün paketlemesi hâlâ açıktır. Ana ürünün 109 dosyası ve kurulu 3.4.241 değişmedi; yeni ücretli çağrı yoktur.

## Canlı kalibrasyon ve isteğin tamamlanması — 15 Ekim

`project-feedback-calibration-241-closure.json`: DeepSeek TR ve MiMo EN, gerçek 440 kayıtlı kaynak üzerinde beş yorum/ödev durumunu değerlendirdi. Temel doğru/yanlış/ödev kusuru ayrımları ikisinde de doğru; puanların tam kalibrasyonu ve tüm yan cümlelerin doğruluğu garanti edilmez. 7 gerçek sağlayıcı çağrısı yapıldı; ücretli toplam 244. MiMo kayıt aşamasını tamamladı fakat kullanılmayan son özet çağrısı önceden ilan edilen test maliyet sınırına takıldı; ham koşunun cost-censored durumu değiştirilmedi.

`project-review-completion.js` yalnız kendisinin oluşturduğu proje değerlendirme bağlamlarını izler. Gerçek kayıt aracı aynı teslim kimliğiyle başarı döndürdüğünde, uygulama içi nesne kimliğine bağlı tamamlanma sinyali üst isteğe taşınır. Arayüz zaten bu kaydı kullandığı için ilave serbest özet çağrısı yapılmaz. Normal sohbet/keşif araçları, gerekli veri okumaları, kayıt hataları, kullanıcı iptali ve kapsam değişikliği ayrı davranışlarını korur. Model metni veya hata mesajı başarılı kayıt gibi yorumlanmaz.

Kaynak referansları hem source-relative hem context-rooted JSON pointer biçimini aynı kesin kaynak alt ağacına çözebilir. Bu, doğal dil niyetini belirleyen bir filtre veya model cevabını uyduran onarım değildir. Bozuk rapor dizisi otomatik kabul edilmez. Kayıtlı gerçek cevapların yeni adayda tekrarında DeepSeek 3→2, MiMo 4→3 istekle aynı karar ve puanları kaydetti. 44.035 tokenlık eski çağrı atlandı; yeni canlı gecikme ölçümü değildir. Son adayın 89 yerel kontrolü geçti; genel kaynak keşfi, canlı uçtan uca kabul, XP/profil ve paketleme açık.
