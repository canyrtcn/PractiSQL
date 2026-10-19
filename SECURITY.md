# Security

Report vulnerabilities privately through GitHub Security reporting facilities when available. Do not post credentials, profiles, personal databases, or unredacted network traces publicly. Include version, OS, and synthetic reproduction steps; remove identifying paths and account details.

## Boundaries

- SQL exercises execute locally and intentionally support changes to exercise data.
- Remote import creates local snapshots; use source accounts with only the needed read permissions.
- Key protection changes storage, not the model prompt, SQL semantics, or evaluation rules.
- CSP restricts script execution and resource types. Custom HTTP/HTTPS endpoints remain supported; it is not a complete network sandbox.
- Signed release builds require publisher configuration and strict update verification. Unsigned local builds retain their development behavior and must not be presented as signed releases.

## Known limitations

Electron 33.4.11 is outside upstream support. A supported runtime upgrade is separate work and is not silently bundled into this change. These controls are not a complete penetration test or security certification.

The locked dependency audit on 19 October 2026 reported 21 affected package entries: 6 moderate, 14 high and 1 critical. The critical entry is `tar` in the build toolchain. `npm audit --omit=dev` reported three moderate entries in the `mssql` → `tedious` → `sprintf-js` chain. Omitting development dependencies also omits Electron from that command, even though Electron is the runtime shipped to users; its advisories still require review. These are dependency advisories, not a confirmed exploitation report. Updating the runtime and build dependencies requires a separately tested application change.

There is currently no trusted Windows publisher certificate. Signed public installer acceptance remains pending until a suitable signing identity is available. Preserve third-party licensing notices when distributing the application.

The 3.4.261 unsigned update path retains installation on normal application quit after a downloaded update, even when the immediate restart prompt is declined. Its Settings status can also remain “Checking” after an error. These are recorded release-readiness findings; see [the release guide](docs/RELEASING.md). The private GitHub repository does not provide an anonymous update feed. Never distribute a repository access token inside the application.
