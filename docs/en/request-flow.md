# Request flow

[English](../en/request-flow.md) · [Türkçe](../tr/request-flow.md)

Read from top to bottom. The model/tool loop, the execution branches and the single conditional repair are shown explicitly.

```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant App as PractiSQL harness
    participant Sources as Context and archives
    participant Model as Selected model
    participant SQL as Local SQLite

    Student->>App: Question, selected SQL or quotation
    App->>App: Capture workspace, conversation,<br/>database identity, revision and action limits
    App->>Sources: Retrieve relevant history, schema,<br/>observations and original source identities
    Sources-->>App: Assemble the exact current request<br/>with teacher rules and relevant context
    opt Context pressure exceeds the model budget
        App->>Sources: Compact older material conditionally<br/>Reserve output capacity, retain original archives
        Sources-->>App: Bounded context with retrievable source IDs
    end
    App->>Model: Send through the selected account or API<br/>Chat Completions, Messages or Responses
    loop Model/tool continuation within request budgets
        Model-->>App: Native read_context or inspect_database call
        App->>App: Check ownership, cancellation,<br/>deadline and read-only tool limits
        alt read_context
            App->>Sources: Read the requested page of original sources
            Sources-->>App: Messages, SQL, operations or full-result archives
        else inspect_database
            App->>SQL: Read-only observations from the captured database
            SQL-->>App: Actual observations with scope and limits
        end
        App->>Model: Return the tool result to the same request
    end
    Model-->>App: Final response
    App->>App: Separate explanation, teaching examples<br/>and one complete executable SQL batch
    opt Eligible format failure and shared repair budget unused
        App->>Model: One conditional repair using the original request<br/>and the actual format error
        Model-->>App: Complete corrected answer
        App->>App: Validate the full answer contract again
    end
    alt Request cancelled, stale or action not permitted
        App-->>Student: Explain why the action stopped<br/>Do not apply delayed SQL
    else Request is current and action is permitted
        alt Explanation only
            App->>App: Keep teaching examples non-runnable
        else Read-only query
            App->>SQL: Read worker with snapshot or connection<br/>Deadline and result limits
            SQL-->>App: Actual result tables or execution error
        else AI write batch
            App->>SQL: Open SAVEPOINT and execute the complete batch
            SQL->>SQL: Check constraints, triggers and<br/>applicable scoped preservation guarantees
            alt Checks pass
                SQL-->>App: RELEASE with actual results and changes
            else Execution or guarantee failure
                SQL-->>App: ROLLBACK this batch and return the actual error
            end
        end
        App->>Sources: Persist conversation and actual SQL outcomes<br/>Keep complete SQL, tables, errors, changes and source IDs
        opt Eligible SQL or narrow teaching failure and shared repair budget unused
            App->>Model: One conditional repair with the original request<br/>and actual error or evidence
            Model-->>App: Complete corrected answer or SQL batch
            App->>App: Recheck the contract, current scope and limits
            opt Corrected runnable SQL is required
                App->>SQL: Use the applicable read or write contract
                SQL-->>App: Actual corrected result or error
            end
            App->>Sources: Record what the corrected attempt actually did
        end
        App-->>Student: Show the explanation beside actual outcomes<br/>Make errors and changes visible
    end
    Note over App,Model: The two eligible repair points share ONE budget.<br/>There is no unconditional second model review.
    opt Student writes SQL manually in the editor
        Student->>App: Run manual SQL or an explicit transaction
        App->>SQL: Use the separate manual execution contract
        SQL-->>App: Actual results, partial outcome or transaction state
        App->>Sources: Store the actual operation and its provenance
        App-->>Student: Show the observed manual outcome
    end
    Student->>App: Follow-up question about the work
    App->>Sources: Retrieve the relevant original context<br/>and complete result archives for the next request
```

Scope and cancellation checks apply throughout asynchronous model/tool work. An AI write batch releases its savepoint only after the applicable checks; failures roll back that batch. Explicit transactions and manual commands have their own outcome/partial-state rules. A request does not receive a second model review by default; repair is conditional and shares one budget.

[Detailed architecture and source map](architecture.md)
