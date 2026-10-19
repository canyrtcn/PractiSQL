<p align="right"><a href="README.tr.md"><img src="docs/assets/read-in-turkish.svg" height="32" alt="Türkçe oku"></a></p>

<h1><img src="docs/assets/repository-wordmark.svg" width="280" alt="PractiSQL"></h1>

### Learn SQL. Run it. See the result.

A desktop SQL learning workspace that brings local SQLite, an AI tutor, visual schemas and hands-on practice together through a coordinated **AI harness**.

[Workspace](#a-workspace-you-can-make-your-own) · [AI harness](#the-ai-harness-behind-the-conversation) · [Lessons](#learn-a-concept-then-try-it) · [AI setup](#connect-the-ai-provider-you-prefer) · [Development](#development-and-repository-layout)

<a href="https://github.com/canyrtcn/PractiSQL/releases"><img src="docs/assets/download-windows.en.svg" width="328" height="64" alt="Download PractiSQL for Windows"></a>

**Windows x64 · v3.4.262** · **macOS is in preparation.**

The button opens Releases. While this repository is private, downloads require repository access. A macOS package is not available yet.

![PractiSQL workspace with an SQL query, local results and an AI explanation](docs/showcase/cards/product-overview.en.png)

**Your query, actual results and explanation stay together.** The left pane organizes workspaces and conversations, the centre keeps SQL and result tables in reach, and the right pane brings together the tutor, schema, data tools and lessons. You can start with a built-in example or work with a local database of your own.

SQL runs on your device. An AI connection is optional: the editor, visual schema and built-in learning material remain available without one.

## A workspace you can make your own

![Light, Leaf and Dark versions of the SQL workspace](docs/showcase/cards/themes-workspace.en.png)

**Choose Light, Leaf or Dark without changing how you work.** SQL highlighting, Markdown, result tables and learning controls follow the selected theme. English and Turkish interfaces, adjustable pane widths, interface fonts and 75–150% scaling let you adapt the same three-pane workspace to your screen.

The mascot, XP, badges and learning profile add a sense of progress. They sit alongside the work: the centre remains focused on writing queries and reading tables.

## Your first session

1. **Open an example or import a database.** Built-in learning workspaces give you tables and records to explore immediately.
2. **Run a query and inspect the rows.** Keep the editor, results and visual schema together as you change the SQL.
3. **Add a tutor when you want one.** Connect a ChatGPT account or an API provider, ask about the result and compare the explanation with the actual table.

## The AI harness behind the conversation

![PractiSQL AI harness: scoped requests, context memory, model tools, execution checks, result archives and learning workflows](docs/architecture/ai-harness.en.svg)

**The harness coordinates the path from a question to an observed result.** A request carries its workspace, conversation, database identity, revision and explicit UI action. Teacher instructions, actual schema, relevant history and selected text are assembled separately from the student's latest question.

The model can retrieve an earlier source through `read_context` or examine a captured database through the read-only `inspect_database` tool. Context capacity and output reserves are managed for the chosen model. When older content needs compaction, its original messages, SQL and result sources remain available for retrieval.

| Layer | What PractiSQL coordinates |
|---|---|
| **Request lifecycle** | Scope, cancellation, deadlines and protection against applying a late answer to another workspace or database revision. |
| **Model and tools** | Provider protocols, account transport, tool-call identities, read-only observations and continuations of the same request. |
| **SQL execution** | Separation of runnable SQL from teaching examples; read workers, normal automatic write savepoints, SQLite constraints and applicable preservation checks. |
| **Evidence and memory** | Actual result tables, complete SQL, errors, changes and source identities, including full-result archives for later questions. |
| **Learning workflows** | Lessons, challenges, exams, schema-free exercises and data projects with their own execution and assessment rules. |

Eligible failures can use one shared, conditional repair attempt with the original request and actual error or evidence. Reads, automatic writes and manual transactions have distinct execution contracts. Local checks verify their defined scope; teaching explanations and business interpretations still involve model judgment.

[Explore the architecture and source map](docs/en/architecture.md) · [48 components across eight architecture views](docs/architecture/index.html?lang=en) — open the HTML explorer locally after downloading the source.

## Write SQL and inspect what it does

![A complete retail query and the result table it produces](docs/showcase/cards/query-results.en.png)

**Follow the query all the way to its rows.** This example joins products, order items and orders, groups completed sales and calculates quantity and revenue. The table below comes from actual SQLite execution in the application.

Use the editor for your own SQL, inspect a query plan, revisit query history or transfer a code block from the conversation into the editor. Copy and transfer preserve the SQL text. The model's explanation stays beside the work so you can compare its claims with the visible result.

## Understand the tables before the JOIN

![The complete five-table retail relationship diagram](docs/showcase/cards/table-view.en.png)

**See the complete relationship diagram.** The schema viewer shows tables, actual column names, primary and foreign keys, declared relationships and row counts. Zoom, pan and table selection help you follow a connection before writing a JOIN. The illustration above keeps all five demonstration tables inside the frame.

![A table preview with all four columns and eight product records](docs/showcase/cards/table-data.en.png)

**Open a table and inspect its records.** Here the synthetic product catalogue is displayed as a real query result, with all four columns and eight rows visible. You can compare the actual values with the schema and the SQL that reads them.

Local SQLite databases and file imports can become learning workspaces. Supported server imports create a local learning copy; they are separate from ordinary query execution against that copy.

## Learn a concept, then try it

![A SELECT lesson with explanations and SQL examples](docs/showcase/cards/guided-learning.en.png)

**Built-in lessons give each SQL concept a place to start.** Follow the learning path, read an explanation, inspect examples and open practice in a separate lesson workspace. The path includes selection, filtering, sorting, joins, grouping and more advanced SQL topics.

Challenges turn those concepts into focused tasks with a schema and sample records. Answers are checked on three practice-data variants. PDF study notes bring lesson material and SQL observations into a document you can keep, with the PractiSQL wordmark and mascot.

## Practise the structure of SQL

![Schema-free SQL expression practice](docs/showcase/cards/sql-exercises.en.png)

**Read the query and supply the missing expression.** Choose 10, 15 or 20 questions and a difficulty. Your selected AI provider prepares synthetic queries; the interface creates a blank for an SQL expression, validates query grammar and reviews the keyword answer locally.

This exercise is about recognizing where a clause or function belongs. It does not send your personal schema or table records to the question generator. Answers and explanations are available when you finish the round.

## Test your understanding and review it

![An SQL exam question with highlighted SQL and an optional full-query answer](docs/showcase/cards/sql-exams.en.png)

**Exams combine questions, SQL evidence and review.** The schema viewer uses the exam's frozen database snapshot. Read the prompt, complete missing SQL or answer the selected question type, then review the result and feedback. Student SQL is checked on a database copy, and AI judgment is part of grading.

For a fill-in question, a correct optional complete-query answer earns an additional 25 XP. Saved exam history and study workbooks help you return to earlier work; reward tracking prevents repeated rewards for the same question set.

## Turn real data into a useful report

![A data project with SQL, report results and feedback](docs/showcase/cards/data-projects.en.png)

**Work from a documented source to a business question.** The project workflow can explore the official UCI catalogue, inspect a source and clarify a measurable assignment. The source is imported into a separate workspace, where you submit SQL and your interpretation.

Expected numeric results are calculated independently from the original CSV records and measurement specification. AI feedback then considers the business interpretation with the available evidence. Project context, submissions, checks and feedback remain linked, so later discussion can refer to what was actually evaluated.

## Connect the AI provider you prefer

**ChatGPT account:** Settings → Provider → ChatGPT Account → Sign in with ChatGPT. Follow the account sign-in flow; this route does not require pasting a separate API key. Model availability, plan eligibility and usage limits depend on your account.

**API providers:** OpenAI, Anthropic Claude, Google AI Studio, DeepSeek, OpenCode Zen & Go, xAI, Moonshot, Zhipu, Cohere, Mistral, Groq, OpenRouter, Together AI, Alibaba Qwen and Perplexity.

Compatible custom HTTP/HTTPS endpoints are also supported. You choose the provider and model; no shared paid key is shipped. AI can receive your question, relevant conversation, schema and necessary observations or result rows. First-run setup explains this before you connect. [Privacy details](docs/PRIVACY.md).

### Recommended models

These are the models currently recommended in PractiSQL. Choose an available entry in your provider's model list.

| Model | Provider |
|---|---|
| **GPT-6 Luna** | <img src="docs/assets/providers/openai-badge.svg" width="96" height="48" alt="OpenAI"> OpenAI |
| **Muse Spark 1.3** | <img src="docs/assets/providers/muse-badge.svg" width="96" height="48" alt="Muse by Meta"> Meta |
| **DeepSeek V4.1 Flash** | <img src="docs/assets/providers/deepseek-badge.svg" width="96" height="48" alt="DeepSeek"> DeepSeek |

Model names and access can differ between providers and accounts. [Logo sources and attribution](docs/assets/providers/README.md).

## More screens and documentation

[Browse 84 application screens](docs/en/screenshots.md) · [English and Turkish presentation visuals](docs/assets/README.md) · [Architecture](docs/en/architecture.md)

The creator's name and photo appear with permission. Demonstration workspaces, conversations, retail records and learning statistics are synthetic. Screens come from the actual application; teaching and exam copy is prepared demonstration content. SQL results and local checks were executed in the app.

## Development and repository layout

Use Node.js 22 or newer and npm.

```sh
npm ci
npm start
```

```sh
npm run test:db
npm run test:security
npm run test:security:integration
npm run test:ui
npm run test:layout
npm run test:docs
```

```text
app/       Electron application, renderer, SQLite workers and learning modules
config/    Signed-release build configuration
docs/      Bilingual architecture, screenshots and presentation assets
scripts/   Portable verification and asset-generation tools
.github/   CI, contribution/security guidance and issue templates
```

Source modules are grouped under `app/`. Packaging maps them back to the established runtime paths. `npm ci` prepares the local SQLite worker assets automatically. Build an unsigned Windows installer with `npm run dist:win:unsigned`; signed builds additionally require a valid signing identity. Current output stays in `release/win-unpacked/`, with installers and update metadata directly in `release/`.

[Contributing](.github/CONTRIBUTING.md) · [Security and known limitations](.github/SECURITY.md) · [Releases and updates](docs/RELEASING.md)

## Windows security notice

The current installer is unsigned. Commercial code-signing costs exceed this free project's present budget, so a publisher certificate has not yet been obtained. Windows may display SmartScreen because the application is not recognized or has no verified publisher identity.

Download from this repository's Releases, compare the published SHA-256 and scan the installer if you wish. If you have verified the official download and choose to proceed, Windows may offer **More info → Run anyway**. You do not need to disable your antivirus. An unrecognized-app notice alone is not a malware detection; source and release files are available for inspection and scanning. [Microsoft SmartScreen](https://learn.microsoft.com/en-us/windows/security/operating-system-security/virus-and-threat-protection/microsoft-defender-smartscreen/).

## License

PractiSQL-authored source is licensed under [MIT](LICENSE). Third-party components retain their own licenses. The bundled Sign in with ChatGPT DevKit has separate noncommercial terms; the whole bundle should not be treated as exclusively MIT. [SDK license](app/vendor/CHATGPT-SDK-LICENSE.txt) · [Notices](app/vendor/CHATGPT-SDK-NOTICES.md) · [Local adaptations](app/vendor/PRACTISQL-SDK-CHANGES.md).
