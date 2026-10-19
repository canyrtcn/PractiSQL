# Recorded model checks

These are historical local observations, not a new or independent model benchmark of 3.4.261. The shared seven-query set covered SELECT, WHERE, GROUP BY, ORDER BY, HAVING, JOIN and CTE. Timings depend on the provider, date and application flow; they are not estimates of current latency.

| Model | Final SQL result | Mean query time |
|---|---:|---:|
| gpt-6-luna | 7 / 7 | 5.28 s |
| deepseek-v4.1-flash | 7 / 7 | 15.79 s |
| muse-spark-1.3-contributor | 7 / 7 | 9.97 s |
| qwen3.8-flash | 7 / 7 | 8.23 s |
| glm-5.3-flash | 7 / 7 | 30.57 s |
| mimo-v2.6-flash | 7 / 7 | 24.13 s |

Gemini 3.5 Flash Lite completed coverage in two runs, 2/2 and 5/5; one question in the latter used the existing SQL correction path. Those separate runs are not combined into one timing score. A perfect result on this small set is not evidence of perfection on broader tasks: historical broad Qwen coverage was incomplete, and material SQL or teaching errors were observed in other checks.

## Shared natural-language evaluation

On 3.4.241, the same Turkish/English chain included six SQL tasks and eight reviewed responses per model. GPT-6 Luna: SQL 6/6, responses without a material teaching issue 8/8. Muse Spark 1.3 Contributor: 6/6 and 8/8. DeepSeek v4.1 Flash: 6/6 and 6/8; an incorrect explanation of zero versus NULL prevents a perfect teaching result. An additional local changed-data check for Muse was 35/36, separate from its 6/6 tasks on the data actually supplied.

SQL checks used real fixture data, complete results, constraints and unintended-change checks. Teaching review compared the full responses with the actual SQL/data under human supervision; it is not an independent standardized judge score. The small sample, different dates/releases, known errors and incomplete coverage remain explicit. Names are the recorded provider model identifiers, not a guarantee of current access. No new paid model calls were made for this document.

[CSV](../benchmarks/observations.csv) · [README](../../README.md)
