# Windows releases

## Current release readiness

Keep **3.4.261** for the first source publication. A first GitHub release does not require a reset to 0.1.0; existing installations would treat that as a downgrade. Use a higher version, such as 3.4.262, for the next changed application build. See [Semantic Versioning precedence](https://semver.org/#spec-item-11).

The repository must remain **private until its owner explicitly approves public visibility**. Creating source commits does not grant permission to change visibility or publish a release. While private, GitHub Releases require repository read access; the existing anonymous update feed is not available to ordinary users. Never embed the owner's GitHub token in an application or installer. See [GitHub release access](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases) and [electron-updater private feeds](https://www.electron.build/v26/docs/features/auto-update/).

### Update limitations observed in 3.4.261

Local checks used the actual electron-updater 6.8.9 transport with a loopback feed, a non-executable payload fixture and an intercepted installer handoff. Thirteen scenarios covered newer/equal/lower versions, explicit installation, deferral followed by normal quit, SHA-512 mismatch, a missing installer, unavailable/missing/unauthorized/malformed metadata, interrupted transfers and cancellation before or during the response body. The renderer/preload/main event path was also checked in English and Turkish across all three themes (48 assertions). These tests did not install a future GitHub release.

- Successful downloads identify the version and request an immediate install/restart decision.
- **Deferring that prompt does not disable installation on a later normal quit.** The underlying updater retains `autoInstallOnAppQuit=true`. This needs an application change before promising that deferral is respected.
- An error reaches the notification system, but the Settings status can remain “Checking”. This also needs an application change.
- The unsigned build does not establish a verified publisher. Delivery checksums are not a substitute for publisher authentication.
- A same-machine installer upgrade preserved the existing profile and database bytes. That observation does not prove every future upgrade, interrupted transaction or recovery case is safe.

These findings are documented rather than silently fixed during documentation work. Do not describe the unattended update path as production-accepted until the affected behavior is changed and tested.

## Release checklist

1. Complete source/privacy checks and verify repository visibility remains private until explicitly approved otherwise.
2. Build the intended version and verify native EXE versions, signatures when configured, and file hashes at the standard `release/` paths.
3. Test the previous installer to the candidate version with a disposable profile containing databases, conversations, preferences and protected test credentials. Include accept, defer, restart, interrupted download and checksum failure cases.
4. Resolve update deferral/status findings before releasing an update advertised as fully controlled by the user.
5. Create a version tag and release only when the owner authorizes that publication. Attach the matching **setup EXE**, **EXE blockmap** and **latest.yml** together. Do not mix assets from different builds. Publish the installer SHA-256 with the release notes.
6. Verify the release is non-draft and correctly marked as the intended stable release. Confirm its download and metadata URLs using an account with the intended access level.
7. Verify update discovery, download progress, integrity failure, consent, install/restart and retained profile data against those actual assets. A private feed is not an anonymous public update channel.

## Versions and history

Continue the existing 3.4.x sequence; `package.json` records the current version. Resetting to 0.1.0 puts it behind existing installations for normal update comparisons. First publication does not require a version reset or publishing local checkpoint commits.

Use one coherent initial snapshot, then focused commits with descriptive subjects. Tag only the tested release actually published. Do not invent historical commits. Use a GitHub no-reply email if a personal email should stay private.

## Source checks

Run the documented tests and `node scripts/scan-source.cjs`. Inspect the staged tree and commit metadata. Exclude profiles, builds, diagnostics, environment files, and signing private material. Keep vendor licenses: the ChatGPT DevKit has separate noncommercial terms; do not describe the entire bundle as exclusively MIT.

## Installers

`npm run dist:win:unsigned` creates a local test installer. It must not be represented as a verified-publisher release.

Preserve the standard output layout: unpacked application in `release/win-unpacked/`, installer/blockmap/`latest.yml` directly in `release/`. Verify the version and hashes at those paths before delivery. Keep isolated test copies and old build archives outside `release/`.

For `npm run dist:win`, provide `PRACTISQL_PUBLISHER_NAME` and a valid certificate through the Windows certificate store or electron-builder's `CSC_LINK`/`CSC_KEY_PASSWORD` environment configuration. Optional certificate selection uses `PRACTISQL_CERTIFICATE_SUBJECT` or `PRACTISQL_CERTIFICATE_SHA1`. Store all private signing material outside the repository.

The signed release configuration sets `forceCodeSigning` and a signed-release marker. Missing identity or signing failure must fail the build. Verify application/installer Authenticode signatures, expected publisher in `app-update.yml`, and accepted/rejected updates before publishing installer and metadata together. An unsigned installation needs a considered transition to a trusted signing identity.

## Certificate cost

No paid service is provisioned by these scripts. Local development and private testing do not require a paid certificate. [Free OSS signing programmes](https://signpath.org/terms) have eligibility requirements: SignPath requires OSI-approved components, so eligibility with the bundled noncommercial SDK must not be assumed.

Windows Store MSIX distribution is another packaging route, not a drop-in certificate for this NSIS installer. Self-signing does not establish a trusted public publisher. See [Microsoft's signing options](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/code-signing-options).
