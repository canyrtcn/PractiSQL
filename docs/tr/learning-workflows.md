# Öğrenme akışları

README, öğrencinin kullandığı akışları anlatır. Bu eşleme, ekran görüntülerini model başarısı ölçümü saymadan, özellikleri gerçek uygulama kaynaklarına bağlar.

| Özellik | Kaynak kod |
|---|---|
| AI olmadan SQL çalışma alanı | [app.js](../../app/renderer/app.js), [database-store.cjs](../../app/database-store.cjs), [database-transfer.cjs](../../app/database-transfer.cjs) |
| AI’a soru sorma ve açıklama isteme | [ai-request-envelope.js](../../app/renderer/ai-request-envelope.js), [ai-teacher-contract.js](../../app/renderer/ai-teacher-contract.js), [ai-answer-envelope.js](../../app/renderer/ai-answer-envelope.js) |
| Yerel SQL tamamlama | [app.js](../../app/renderer/app.js) |
| Hazır ve ayrıntılı dersler | [learn.js](../../app/renderer/learn.js), [learn-detail.js](../../app/renderer/learn-detail.js), [lesson-pdf.js](../../app/renderer/lesson-pdf.js) |
| SQL ifadesi alıştırmaları | [sql-exercises.js](../../app/renderer/sql-exercises.js) |
| SQL challenge’ları | [challenges.js](../../app/renderer/challenges.js), [challenge-schema.js](../../app/renderer/challenge-schema.js) |
| Sınavlar | [exam-sql.js](../../app/renderer/exam-sql.js), [exam-study.js](../../app/renderer/exam-study.js), [exam-presentation.js](../../app/renderer/exam-presentation.js) |
| PDF çalışma defterleri | [study-notes.js](../../app/renderer/study-notes.js), [pdf-print.js](../../app/pdf-print.js) |
| Veri projeleri | [learning-projects](../../app/learning-projects), [project-discovery-ui.js](../../app/renderer/project-discovery-ui.js), [project-review.js](../../app/renderer/project-review.js) |
| Şema ve sorgu inceleme | [schema-view.js](../../app/renderer/schema-view.js), [app.js](../../app/renderer/app.js) |
| XP, yıldız, seviye ve aksesuarlar | [rewards.js](../../app/renderer/rewards.js), [mascot-wardrobe.js](../../app/renderer/mascot-wardrobe.js), [app.js](../../app/renderer/app.js) |

[İstek akışı](request-flow.md) · [Mimari](architecture.md)
