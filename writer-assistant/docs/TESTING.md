# Testing

## Checks to run on a prepared Windows/macOS development machine

```sh
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm build
cd src-tauri
cargo fmt --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
cd ..
python3 scripts/dictionaries/verify.py
pnpm tauri build
```

## Execution environment notes (2026-10-21)

This repository was generated inside a Linux tool environment with no `cargo`,
`rustc`, `pnpm`, or npm registry access. The commands above could not run.
Only Python stdlib dictionary importer fixtures and TypeScript syntactic parsing
were executable. Neither verifies the binary app.

## Manual native smoke cases (not executed)

Windows 10/11 and macOS 13+: text selection in native text area, browsers and rich
editors; selection-free error; password exclusion; multi monitor popup; shortcut
conflicts; focus shift; Unicode emoji and Urdu; multiple selections; app exit;
clipboard restoration. Automatic replacement is unavailable and must never be
claimed passed. Test providers and proxy with real credentials and controlled
routes; do not record keys or selected writing in logs.
