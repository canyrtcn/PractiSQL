# Contributing

Use Node.js 22 or later, install locked dependencies with `npm ci`, and run the documented checks.

Keep changes focused. Preserve SQL semantics, atomic transactions, foreign keys, request context, cancellation, and workspace ownership. Do not add test-specific product branches or weaken assertions to hide failures.

Use synthetic fixtures. Never commit profiles, tokens, API/signing keys, personal databases, private conversations, machine-specific paths, or diagnostic dumps. Live AI checks require explicit access and bounded requests; CI uses offline fixtures.

Describe each problem, resulting behavior, validation, and remaining limits in a pull request. Use descriptive commit subjects. Internal checkpoints and generated diagnostic artifacts do not belong in published history.
