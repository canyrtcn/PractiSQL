# Illustration provenance / İllüstrasyon kaynağı

The decorative learning companion was generated with the built-in image-generation tool, using the application's `renderer/assets/mascot.png` as its reference. The saved illustration is [learning-companion.png](learning-companion.png). Layouts, typography, the exact wordmark and real application screenshots are composed separately in HTML; the screenshot pixels are never regenerated.

Dekoratif öğrenme maskotu, uygulamanın `renderer/assets/mascot.png` görseli referans alınarak yerleşik görsel üretim aracıyla üretildi. Kaydedilen illüstrasyon [learning-companion.png](learning-companion.png) dosyasındadır. Yerleşim, yazılar, gerçek logo yazısı ve uygulama ekranları ayrı HTML şablonlarında birleştirilir; ekran pikselleri yeniden üretilmez.

## Generation prompt / Üretim komutu

Use case: ads-marketing. Create a polished brand illustration for PractiSQL, a friendly local SQL learning desktop app. The supplied image is the exact mascot reference: bright fresh green cylindrical database character, dark olive top rim, large friendly dark eyes, tiny white eye highlights, pink cheeks, curved smile and two short oval feet. Keep this character recognizable, with NO arms, NO hands and no extra face parts. Render the mascot as a premium soft 3D clay object standing firmly on a low sage platform, alongside a few tasteful tiny database table tiles connected with olive green lines. Landscape composition with mascot and SQL-learning objects in the RIGHT HALF and quiet pale warm-white negative space across the LEFT HALF for a real product screenshot and typography to be added later. Palette fresh green #80c438, olive #518f00, soft sage #e8f0df, warm off-white #faf9f7. Soft studio lighting, restrained dimensional shadows, delightful professional educational app identity. No text, no letters, no logos, no invented app UI, no watermark. Wide 3:2 image suitable for a README presentation backdrop.

## Composition / Yerleşim

Run `npm run docs:showcase` and `npm run docs:showcase:render`. The latter renders the bilingual templates to PNG and copies the overview and SQL-result visuals into the four stable README image paths. The gallery manifest records the hashes of the original screenshots.

`npm run docs:showcase` ve `npm run docs:showcase:render` komutlarını çalıştır. İkinci komut iki dildeki şablonları PNG’ye dönüştürür; tanıtım ve SQL-sonuç görsellerini dört sabit README görsel yoluna kopyalar. Galeri manifesti, özgün ekran görüntülerinin hash değerlerini içerir.
