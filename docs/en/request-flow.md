# Request flow

[English](../en/request-flow.md) · [Türkçe](../tr/request-flow.md)

This is the same detailed flow used in the README. Read its numbered path from top to bottom; open the SVG to inspect it at full size.

![The complete numbered request flow, retaining context, tools, SQL paths, conditional repair and archives](../architecture/request-lifecycle.en.svg)

**Read the numbered path from top to bottom.** The side branches retain conditional context compaction, request-scoped read-only tools, stale-request rejection, separate read/AI-write/manual execution and the single shared repair budget. Actual result archives return as sources for later questions. The separate manual-editor entry does not pass through a model.

[Mermaid source](../architecture/request-lifecycle.en.mmd)

Scope and cancellation checks apply throughout asynchronous model/tool work. An AI write batch releases its savepoint only after the applicable checks; failures roll back that batch. Explicit transactions and manual commands have their own outcome/partial-state rules. A request does not receive a second model review by default; repair is conditional and shares one budget.

[Detailed architecture and source map](architecture.md)
