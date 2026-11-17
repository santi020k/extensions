# Zed Extensions

This is the central repository containing the extensions available for [Zed](https://zed.dev/).

## Getting started

See the [Developing Extensions](https://zed.dev/docs/extensions/developing-extensions) docs for how to develop and publish your extension

Looking for extension ideas? Check out:

- [Top theme requests](https://github.com/zed-industries/extensions/issues?q=is%3Aissue+is%3Aopen+label%3Atheme+sort%3Areactions-%2B1-desc)
- [Top language requests](https://github.com/zed-industries/extensions/issues?q=is%3Aissue+is%3Aopen+label%3Alanguage+sort%3Areactions-%2B1-desc)

If an issue requesting an extension is tagged with the `needs infrastructure` label, it indicates that the extension cannot currently be developed due to the absence of necessary system infrastructure.

## Personal fork validation with Quality v2

This unversioned registry fork uses Quality 2.0.0 and immutable shared setup
references. It does not publish an npm package or create application releases;
changes integrate into the fork's `main` through its normal review process.

The separate `Fork validation` workflow runs on standard GitHub runners without
publication credentials. Registry-only pull requests validate declarations,
submodule locations and canonical ordering without compiling the entire extension
catalog or rerunning unchanged tooling tests. Proven README-only changes skip both
workloads. Shared, unknown, release, push and missing-history inputs run both.
Independent tooling and registry jobs run in parallel; the final gate rejects
missing selectors and unsuccessful or skipped selected checks.

`quality-impact.json` records a conservative shadow graph and tests real CLI
selection. It does not execute commands or replace the registry's existing
selection policy. Upstream Zed packaging, license, no-LFS and publication gates
remain unchanged and restricted to `zed-industries`. Fork checks cannot establish
upstream binary compatibility, license review or publication readiness.

Run `pnpm run check:tooling`, `pnpm run check:registry` and
`node --test scripts/ci-scope.node-test.mjs` locally. With Quality 2 on PATH, run
`node --test scripts/quality-impact.node-test.mjs` too. Reverting the fork workflow
restores the previous behavior without changing registry entries or published
artifacts. No Turbo or new runtime dependency is required.

### Commit messages

The shared Git hook launcher reads this worktree's committed `quality.yml`. Its
`commit-msg` event forwards Git's message-file argument to the locally installed
`@santi020k/commitprompt` validator. Run `pnpm install --frozen-lockfile` before
committing; no global Commitprompt installation is needed. `pnpm commit` generates
messages using the same Conventional Commits policy. The pre-push hook runs
`pnpm check`. These commands preserve Git hooks; never bypass a rejected message.

Run `pnpm run test:commit-message` to check valid and invalid message handling.
