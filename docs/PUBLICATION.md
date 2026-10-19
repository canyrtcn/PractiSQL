# Source publication policy

PractiSQL is developed as a free, noncommercial learning project. This document describes the source tree intended for public GitHub publication; it is separate from any private workspace or user profile.

## What belongs in the repository

| Include | Keep outside Git |
|---|---|
| Application source, assets and package lockfile | node_modules, installers and unpacked builds |
| Portable offline tests and CI | Private experiments, model traces and benchmark transcripts |
| Architecture, setup and contribution documentation; approved demo screenshots | Personal workspaces, databases, conversations and unapproved profile images |
| Project and third-party license notices | API keys, account tokens, environment files and signing private material |

Run `npm run scan:source` and inspect staged changes before publication. Pattern scanning is a useful check, not proof that every possible secret format has been excluded. Images and Git metadata also require review. Never upload an entire application profile as an issue attachment.

The author attribution explicitly requested for the Settings footer is public project information. The creator also explicitly authorised their name and avatar in the screenshots under `docs/screenshots/` and the presentation visuals derived from them. Learning statistics and progress in the current captures are synthetic demonstration values. These captures use isolated demonstration workspaces and exclude personal databases and conversations. This limited permission does not extend to profile files, private email addresses, credentials or workstation paths. See the [screenshot guide](en/screenshots.md) for the distinction between synthetic data, built-in fixtures and prepared teaching or exam content.

The public gallery and presentation templates can be rebuilt with `npm run docs:showcase` and `npm run docs:showcase:render`. Generated HTML templates and verification output stay under ignored `artifacts/`; only the final presentation PNGs, source manifest and useful gallery are committed. Rendering reads the committed screenshots and local assets; it does not access an application profile or call an AI provider.

## Versions

Continue the established 3.4.x version sequence. The current source version is recorded in `package.json`. First GitHub publication does not require resetting to 0.1.0; that would place the release behind existing installations in normal update ordering.

## Commits and release output

Use a coherent initial source import, followed by focused commits that describe the resulting change. Do not import private checkpoint history or manufacture old commits. Use a GitHub no-reply email when a personal address should remain private.

The current Windows unpacked build belongs in `release/win-unpacked/`. The installer, blockmap and `latest.yml` belong directly in `release/`. All build outputs remain outside the source repository. Create a release tag only for the tested version actually published.

## Licensing and distribution

PractiSQL-authored source uses MIT. Preserve the bundled components' own licenses and attribution, including the ChatGPT DevKit's separate noncommercial terms. The project's free, local use is the intended distribution model; do not label every bundled component as MIT.

Public code-signing identity is a separate matter. No signing certificate is bundled. Free signing services have their own eligibility rules; making a repository public does not automatically establish trusted Windows publisher status. See [release instructions](RELEASING.md).
