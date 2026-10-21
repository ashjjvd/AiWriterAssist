# Acceptance matrix (2026-10-21)

Statuses are deliberately strict: VERIFIED requires actual successful testing at
relevant level; IMPLEMENTED — NOT VERIFIED means source exists but runtime test
is missing; BLOCKED means an unavailable external requirement prevents the work;
NOT IMPLEMENTED indicates real missing functionality.

| Requirement | Status | Evidence / gap |
|---|---|---|
| React/TS/Vite/Tailwind application source | IMPLEMENTED — NOT VERIFIED | Frontend sources exist; dependencies absent |
| Two Tauri windows | IMPLEMENTED — NOT VERIFIED | tauri.conf.json / Rust setup |
| Tray menu and minimize-to-tray behavior | IMPLEMENTED — NOT VERIFIED | lib.rs, no Windows/macOS smoke test |
| System theme and override | IMPLEMENTED — NOT VERIFIED | settings persistence/UI |
| Popup sizing/positioning and reuse | IMPLEMENTED — NOT VERIFIED | monitor work area logic; no display tests |
| Global shortcut registration, debounce, pause | IMPLEMENTED — NOT VERIFIED | Tauri global shortcut plugin code |
| Shortcut change/conflict rollback | IMPLEMENTED — NOT VERIFIED | register-before-unregister, no real conflicts tested |
| Windows UIA native selection capture | IMPLEMENTED — NOT VERIFIED | Win32 UIAutomation code, no compilation |
| macOS Accessibility selected-text capture | IMPLEMENTED — NOT VERIFIED | Accessibility/CoreFoundation code, no compilation |
| Secure/password control rejection | IMPLEMENTED — NOT VERIFIED | explicit OS checks, OS behavior untested |
| Accessibility onboarding and recheck | IMPLEMENTED — NOT VERIFIED | privacy UI, OS settings action |
| Clipboard capture fallback with restoration | NOT IMPLEMENTED | Intentionally avoids unsafe clipboard modification |
| In-memory selected-text session and SHA-256 | IMPLEMENTED — NOT VERIFIED | selection::Sessions, timestamps |
| Safe refusal of non-verifiable replacement | IMPLEMENTED — NOT VERIFIED | copy_only policy and code |
| Verified automatic selection replacement | NOT IMPLEMENTED | Requires focus/control/range preservation and native QA |
| Harper offline grammar | IMPLEMENTED — NOT VERIFIED | harper-core API used, Cargo tests blocked |
| Unicode UTF-16 span conversion | IMPLEMENTED — NOT VERIFIED | explicit conversion and Rust unit tests authored |
| Overlap-safe grammar corrections | IMPLEMENTED — NOT VERIFIED | reverse-offset application, no Cargo tests |
| Personal dictionary persistence and suppression | IMPLEMENTED — NOT VERIFIED | DB table and Harper warning filter |
| Official dictionary importer fixture unit tests | VERIFIED | 2 Python stdlib tests passed |
| Complete official OEWN/Moby database import | BLOCKED | Archive bytes not available, DNS unavailable |
| Accurate Moby relation labeling in importer | IMPLEMENTED — NOT VERIFIED | importer identifies associations as related |
| Full published lexical SQLite bundle | BLOCKED | No genuine source archives available |
| Source manifest and SHA-256 enforcement | IMPLEMENTED — NOT VERIFIED | importer verifies caller-supplied trusted SHA-256 |
| Read-only lexical lookup and pagination | IMPLEMENTED — NOT VERIFIED | Rust lookup authored, DB absent |
| Full lexical sense grouping UI | NOT IMPLEMENTED | Flat entries with definitions, not navigable sense groups |
| Four universal improvement actions | IMPLEMENTED — NOT VERIFIED | static configured actions and UI |
| Adaptive, source-agnostic AI analysis | IMPLEMENTED — NOT VERIFIED | prompts/schema/React; no live inference |
| Custom instruction priority | IMPLEMENTED — NOT VERIFIED | merged instruction builder |
| English, Urdu, Roman Urdu, Hinglish via AI | IMPLEMENTED — NOT VERIFIED | language/script preservation prompt; no live QA |
| Urdu RTL rendering | IMPLEMENTED — NOT VERIFIED | direction-aware original/result containers |
| OpenAI-compatible Chat Completions | IMPLEMENTED — NOT VERIFIED | Rust protocol and mock tests authored |
| OpenAI Responses API | IMPLEMENTED — NOT VERIFIED | Rust protocol and mock tests authored |
| Anthropic Messages API | IMPLEMENTED — NOT VERIFIED | Rust protocol and mock tests authored |
| Groq/Cerebras/OpenCode Zen/OpenAI | IMPLEMENTED — NOT VERIFIED | registry/routing; no live test |
| Gemini/Claude/Inception Labs/Custom | IMPLEMENTED — NOT VERIFIED | registry/routing; no live test |
| Complete dynamic Zen protocol catalog | NOT IMPLEMENTED | Common model-family routing only; other protocol families remain |
| Live model listing for compatible providers | IMPLEMENTED — NOT VERIFIED | /models support; no live test |
| Manual model IDs and configuration CRUD | IMPLEMENTED — NOT VERIFIED | UI and storage |
| OS-backed provider API secret storage | IMPLEMENTED — NOT VERIFIED | keyring integration, no OS runtime |
| OS-backed proxy password storage | IMPLEMENTED — NOT VERIFIED | keyring integration, no OS runtime |
| Authenticated inference-based provider test | IMPLEMENTED — NOT VERIFIED | Actual API call code, no credentials available |
| SSE events and cancellation | IMPLEMENTED — NOT VERIFIED | three parsers and AbortHandles, runtime missing |
| Fully robust streaming across all providers | NOT IMPLEMENTED | Provider-specific edge cases and tests remain |
| Direct and system proxy modes | IMPLEMENTED — NOT VERIFIED | reqwest client factory |
| HTTP(S)/SOCKS5/SOCKS5H proxy profiles | IMPLEMENTED — NOT VERIFIED | client factory with selected proxy |
| Staged reachability and streaming proxy tests | NOT IMPLEMENTED | Inference-through-proxy check only |
| No hidden direct or paid-provider fallback | IMPLEMENTED — NOT VERIFIED | no fallback code; network routing needs QA |
| SQLite migrations / settings persistence | IMPLEMENTED — NOT VERIFIED | migrations and Rust tests authored |
| Cloud transmission consent UI | IMPLEMENTED — NOT VERIFIED | Radix confirmation dialog + Rust guard |
| No default writing history/telemetry | IMPLEMENTED — NOT VERIFIED | no history or telemetry subsystem added |
| UI component tests | IMPLEMENTED — NOT VERIFIED | Vitest/RTL suites authored; pnpm absent |
| Mock HTTP integration tests | IMPLEMENTED — NOT VERIFIED | wiremock fixtures authored; Cargo absent |
| CI validation workflow | IMPLEMENTED — NOT VERIFIED | macOS/Windows matrix; real source gate fails |
| Full third-party license distribution | NOT IMPLEMENTED | Attribution available; full upstream notices missing |
| pnpm and Cargo lockfiles | BLOCKED | Package registry DNS and Rust toolchain unavailable |
| Windows/macOS native installers | BLOCKED | Target OS, packages, compiler and lexical DB unavailable |
| Complete MVP acceptance / release readiness | NOT IMPLEMENTED | Multiple critical gaps remain |

## User-story scenarios

1. English writing: **IMPLEMENTED — NOT VERIFIED** (grammar and native capture unavailable to test).
2. Adaptive intelligence: **IMPLEMENTED — NOT VERIFIED** (no configured live provider).
3. Custom writing instruction: **IMPLEMENTED — NOT VERIFIED** (live inference untested).
4. Maximum synonyms: **BLOCKED** (genuine lexical bundle missing).
5. Urdu: **IMPLEMENTED — NOT VERIFIED** (RTL/prompt paths authored, runtime not tested).
6. Roman Urdu: **IMPLEMENTED — NOT VERIFIED** (prompt only, no live QA).
7. Provider switching: **IMPLEMENTED — NOT VERIFIED** (DB/selector authored).
8. Proxy routing: **IMPLEMENTED — NOT VERIFIED** (HTTP client code, no proxy test).
9. Unsafe replacement: **IMPLEMENTED — NOT VERIFIED** (always rejects automatic paste).
10. No internet: **BLOCKED** (grammar uncompiled, lexical bundle unavailable).
