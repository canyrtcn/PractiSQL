# Request flow

[English](../en/request-flow.md) · [Türkçe](../tr/request-flow.md)

Read from top to bottom. The model/tool loop, the execution branches and the single conditional repair are shown explicitly.

```mermaid
flowchart TB
    INPUT["Student question, selected SQL or quotation"]
    SCOPE["Capture workspace, conversation, database identity and revision"]
    CONTEXT["Assemble teacher rules, schema, relevant history and exact current request"]
    CAPACITY{"Context fits the model window?"}
    COMPACT["Summarize older material; retain original source IDs and full archives"]
    MODEL["Selected model through Chat Completions, Messages or Responses"]
    TOOL{"Read-only tool requested?"}
    READTOOL["read_context: archived sources<br/>inspect_database: captured database observations"]
    ANSWER["Separate explanation, teaching examples and one complete runnable SQL batch"]
    GUARD{"Scope still current and action permitted?"}
    STOP["Cancel or reject stale work; do not apply delayed SQL"]
    ROUTE{"Execution required?"}
    TEXT["Display the explanation and non-runnable teaching examples"]
    READ["Read-only worker<br/>Snapshot or connection, deadline and result limits"]
    WRITE["AI write batch<br/>SAVEPOINT, constraints, triggers and applicable preservation checks"]
    EDITOR["Manual SQL editor"]
    MANUAL["Manual editor or explicit transaction<br/>Separate execution contract and actual partial/transaction state"]
    RESULT["Record actual tables, SQL, errors and changes with their source identities"]
    REPAIR{"Eligible failure and shared repair budget unused?"}
    CORRECT["One conditional repair using the original request and actual error/evidence"]
    SHOW["Show actual outcomes beside the explanation"]
    MEMORY["Persist conversation, operation records and full-result archives for follow-up questions"]
    INPUT --> SCOPE --> CONTEXT --> CAPACITY
    CAPACITY -- Yes --> MODEL
    CAPACITY -- Pressure --> COMPACT --> MODEL
    MODEL --> TOOL
    TOOL -- Yes --> READTOOL --> MODEL
    TOOL -- No --> ANSWER --> GUARD
    GUARD -- No --> STOP
    GUARD -- Yes --> ROUTE
    ROUTE -- Explanation only --> TEXT --> SHOW
    ROUTE -- Read --> READ --> RESULT
    ROUTE -- AI write --> WRITE --> RESULT
    EDITOR --> MANUAL --> RESULT
    ANSWER -. Format failure .-> REPAIR
    RESULT -. Eligible execution or teaching failure .-> REPAIR
    REPAIR -- Yes --> CORRECT --> ANSWER
    REPAIR -- No --> SHOW
    RESULT --> SHOW --> MEMORY
    MEMORY -. Next question retrieves its sources .-> CONTEXT
    classDef scope fill:#e8f0df,stroke:#6a8c4f,color:#1f351d;
    classDef model fill:#263e21,stroke:#6a8c4f,color:#ffffff;
    classDef boundary fill:#f4ead8,stroke:#a37b43,color:#604923;
    class SCOPE,CONTEXT,COMPACT,RESULT,MEMORY scope;
    class MODEL,READTOOL model;
    class GUARD,STOP,REPAIR,CORRECT boundary;
```

Scope and cancellation checks apply throughout asynchronous model/tool work. An AI write batch releases its savepoint only after the applicable checks; failures roll back that batch. Explicit transactions and manual commands have their own outcome/partial-state rules. A request does not receive a second model review by default; repair is conditional and shares one budget.

[Detailed architecture and source map](architecture.md)
