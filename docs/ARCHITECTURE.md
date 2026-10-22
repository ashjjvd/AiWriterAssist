# Architecture overview — v0.2.0 beta

AiWriterAssist is a **Tauri 2 desktop application** with a Rust native backend and a React/TypeScript frontend. Native builds are produced by GitHub Actions for Windows and macOS.

## Desktop UI

- **Settings window:** General preferences, shortcuts, providers, proxies, Prompt Library, AI Prompts, privacy, dictionary and licensing information.
- **Improve Writing popup:** A compact floating window launched by a global shortcut. Shows fixed action buttons and an optional custom instruction; **Custom Suggestions** is invoked separately and on demand.
- **Synonyms popup:** A separate, meaning-focused view backed by the offline lexical database.
- **Popup behavior:** `Esc` closes the popup, headers can be dragged and contents resize/scroll for long selections and results.

## Native services

- **Text selection:** Windows uses UI Automation; macOS uses Accessibility APIs. Password/secure fields and inaccessible ranges must not be captured.
- **Replacement:** Windows has a guarded editor/selection verification path followed by Unicode keyboard injection; it can fail safely and must be tested per editor. macOS is copy-only in this beta.
- **Settings:** Structured settings and provider metadata persist locally. Provider credentials are stored using operating-system secure credential facilities rather than in plaintext settings.
- **AI:** Provider adapters and configurable network/proxy routes submit text only after an explicit user request and cloud consent. Fixed actions use saved instructions; Custom Suggestions uses a separate editable analysis prompt and structured AI response parsing.
- **Local language features:** Harper provides offline English grammar checks. A generated SQLite resource holds Open English WordNet and Moby lexical data for synonym lookups.

## Workflow

1. A user selects text in another editor and invokes a configured shortcut.
2. The native selection service captures the selection where supported and provides an in-memory session to the appropriate popup.
3. The popup displays fixed actions without a cloud request.
4. A fixed action sends selected text with that saved instruction; Custom Suggestions sends selected text for analysis only when clicked.
5. The generated result is shown for review and can be copied, or conditionally replaced on supported Windows controls.

## Security and development considerations

- Cloud consent is required. Provider connection tests are explicit network requests.
- The app does not offer an offline generative language model and should not imply that cloud rewrites remain on-device.
- Native text replacement, accessibility and shortcut handling depend on the destination editor and operating system.
- Automated builds do not replace manual end-user testing, source-provenance checks or distribution signing/notarization.

See [Known limitations](KNOWN_LIMITATIONS.md), [Testing](TESTING.md) and [Release checklist](RELEASE_CHECKLIST.md).
