# Learning workflows

The README presents the learner-facing workflows. This map connects them to the implementation without treating a screenshot as a model-quality evaluation.

| Workflow | Implementation |
|---|---|
| Offline workspace | [app.js](../../app/renderer/app.js), [database-store.cjs](../../app/database-store.cjs), [database-transfer.cjs](../../app/database-transfer.cjs) |
| AI questions and explanations | [ai-request-envelope.js](../../app/renderer/ai-request-envelope.js), [ai-teacher-contract.js](../../app/renderer/ai-teacher-contract.js), [ai-answer-envelope.js](../../app/renderer/ai-answer-envelope.js) |
| Local SQL completion | [app.js](../../app/renderer/app.js) |
| Guided lessons | [learn.js](../../app/renderer/learn.js), [learn-detail.js](../../app/renderer/learn-detail.js), [lesson-pdf.js](../../app/renderer/lesson-pdf.js) |
| Expression exercises | [sql-exercises.js](../../app/renderer/sql-exercises.js) |
| SQL challenges | [challenges.js](../../app/renderer/challenges.js), [challenge-schema.js](../../app/renderer/challenge-schema.js) |
| Exams | [exam-sql.js](../../app/renderer/exam-sql.js), [exam-study.js](../../app/renderer/exam-study.js), [exam-presentation.js](../../app/renderer/exam-presentation.js) |
| PDF study workbooks | [study-notes.js](../../app/renderer/study-notes.js), [pdf-print.js](../../app/pdf-print.js) |
| Data projects | [learning-projects](../../app/learning-projects), [project-discovery-ui.js](../../app/renderer/project-discovery-ui.js), [project-review.js](../../app/renderer/project-review.js) |
| Schema and query inspection | [schema-view.js](../../app/renderer/schema-view.js), [app.js](../../app/renderer/app.js) |
| XP, stars, levels and accessories | [rewards.js](../../app/renderer/rewards.js), [mascot-wardrobe.js](../../app/renderer/mascot-wardrobe.js), [app.js](../../app/renderer/app.js) |

[Request flow](request-flow.md) · [Architecture](architecture.md)
