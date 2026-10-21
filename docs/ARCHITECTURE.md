# Architecture

- Tauri 2 hosts two windows (settings and reusable assistant), a global shortcut,
  tray, secure storage, native selection, grammar, thesaurus, SQLite and AI traffic.
- React/TypeScript UI uses typed Tauri commands, event listeners and an explicit
  workflow phase (`src/store/assistant.ts`). Selected text lives in the Rust
  in-memory session registry and UI state, never in the user SQLite database.
- `storage` holds settings, credential *references*, provider and proxy records,
  personal spellings. `security` uses OS credential APIs through `keyring`.
- `network` creates HTTPS-validating reqwest clients with direct, system or one
  explicit proxy; Direct mode calls `no_proxy()`. SOCKS5H uses the SOCKS URL
  scheme for remote DNS resolution. Current client creation does not implement
  reuse/cache yet.
- `ai` has a protocol switch for Chat Completions, OpenAI Responses and Anthropic
  Messages, with SSE handling for the supported delta events. Provider registry
  routes eight configured families. Zen routing recognizes common model families,
  but a live provider catalog is required for complete routing metadata.
- `platform` uses Windows UIA TextPattern or macOS AXSelectedText. Without an
  accessible selection it returns an error rather than making up text.
- Automatic text replacement is conservatively `copy_only`, because robust
  selection re-identification across applications is not implemented. No blind
  clipboard insertion is attempted.
- `grammar` uses Harper curated parsing and real rule output; Unicode scalar
  offsets are converted to UTF-16 for JavaScript. Urdu script is skipped by the
  English-only offline grammar engine.
- `thesaurus` reads an immutable bundled SQLite database. It fails explicitly
  while the official source archive import is unavailable.

## Security notes

Native capture only follows a user shortcut. No continuous input monitoring or
clipboard history collection is implemented. Secure/password controls must not be
read; supported OS text-selection APIs typically hide their contents. The selection
service does not retain native handles across unsafe threads. Cloud requests require
explicit consent and selection. Never add privileged tools to AI model access.

## Known architectural debt

Reliable cross-application replacement, full clipboard fallback, resilient Unicode
SSE decoding, native behavior in target OSs, cache lifecycle, source-aware network
error normalization, complete Zen model metadata, complete license scan and actual
package builds remain outstanding. See KNOWN_LIMITATIONS.md.
