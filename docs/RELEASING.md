# Windows releases

## Current release readiness

The update consent/status fixes are packaged as **3.4.262**. Continue the existing version sequence; resetting to 0.1.0 would be a downgrade for installed copies. See [Semantic Versioning precedence](https://semver.org/#spec-item-11).

The repository must remain **private until its owner explicitly approves public visibility**. Creating source commits does not grant permission to change visibility or publish a release. While private, GitHub Releases require repository read access; the existing anonymous update feed is not available to ordinary users. Never embed the owner's GitHub token in an application or installer. See [GitHub release access](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases) and [electron-updater private feeds](https://www.electron.build/v26/docs/features/auto-update/).

### Update behavior in 3.4.262

Installation always requires the explicit install/restart action. Deferring that action leaves the downloaded update available without installing it on normal application exit. This applies to signed and unsigned builds; signed builds retain their publisher verification requirements.

A failed check or download updates both the notification and the localized Settings status. The checking state can be retried normally.

Regression coverage uses the actual electron-updater 6.8.9 transport, a loopback feed and an intercepted installer handoff. Thirteen scenarios cover explicit/later installation, normal quit after deferral, newer/equal/lower versions, SHA-512 mismatch, missing assets, unavailable/unauthorized/malformed metadata, interrupted transfers and library-token cancellation. The renderer/preload/main flow is checked in English and Turkish across Light, Leaf and Dark themes. Test fixtures stay separate from personal profiles.

A private repository does not provide an anonymous release feed. A future release must still be tested with its actual installer and metadata before publication. Checksums do not establish a trusted publisher for unsigned installers. Do not ship a repository access token with the app.

The previous 3.4.261 deferral and stale checking-state findings are fixed by this version's application changes and retained as regression scenarios.

## Release checklist

1. Complete source/privacy checks and verify repository visibility remains private until explicitly approved otherwise.
2. Build the intended version and verify native EXE versions, signatures when configured, and file hashes at the standard `release/` paths.
3. Test the previous installer to the candidate version with a disposable profile containing databases, conversations, preferences and protected test credentials. Include accept, defer, restart, interrupted download and checksum failure cases.
4. Verify deferral, normal exit, explicit installation and error-state recovery with the candidate build.
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
