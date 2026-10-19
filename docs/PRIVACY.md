# Privacy

Workspaces, SQLite databases, conversations, learning progress, and profile preferences are stored locally. Databases and conversations are not encrypted by default.

AI features can send the question, relevant conversation history, database schema, and observations or sample/result rows to the selected provider. Review real data before connecting it; use synthetic data for sensitive examples.

The first-run provider step explains this sharing before a connection is chosen. AI can be skipped and connected later; the local SQL workspace and built-in lessons remain available.

Credentials are sent as authentication to the selected provider. Saved API keys use OS-protected storage. ChatGPT authentication runs in the main process through the bundled SDK; account/device registration and plan usage follow the provider's integration terms. No shared API key is bundled.

Enabled update checks contact the configured GitHub release repository. Requested project discovery retrieves UCI catalogue information and files. Remote database import connects to the source chosen by the user to create a local snapshot.

OS protection does not stop another malicious process running as the same user. Backups can contain databases, conversations, preferences, and older credentials. Keep them private; never attach a complete profile to a public issue.

Removing a key or disconnecting an account does not revoke it at the provider. Use the provider's own controls for revocation.
