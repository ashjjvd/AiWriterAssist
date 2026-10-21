# Writer Assistant (unverified MVP source — NOT release-ready)

A privacy-conscious desktop writing assistant source project based on the attached
V2.0 specification. **The repository is an incomplete implementation, not a working
or verified installer.** Never claim cross-application behavior without native QA.

## Target platforms / stack

Windows 10/11 and macOS 13+; Rust + Tauri 2, React, strict TypeScript, Vite,
Tailwind styling, SQLite, Harper, reqwest, optional cloud AI and OS keyring.

## Prerequisites and development installation

- A supported Windows or macOS machine with native UI frameworks and a usable
  Tauri 2 toolchain (Rust >= 1.90, Cargo, OS build tools and webview prerequisites).
- Node 22 or newer with pnpm 10 (use `corepack enable`).
- Internet access for npm/crates dependency installation, or trusted offline
  dependency caches.
- Official Moby Thesaurus II and Open English WordNet 2025 archives; see below.

```sh
corepack enable
pnpm install
pnpm dev                 # React frontend only; native IPC unavailable in browser
pnpm tauri dev           # Start real desktop app (when dependencies are installed)
```

**This environment could not generate either lockfile.** On a connected machine,
run `pnpm install`, generate `Cargo.lock` with `cargo generate-lockfile` inside
`src-tauri`, commit both files, and use `pnpm install --frozen-lockfile` for releases.

## Offline dictionaries

Download the **official**, version-identified sources and obtain their verified
SHA-256 hashes via a trusted channel (do not guess or bypass checksum checks):

- OEWN 2025 `https://en-word.net/static/english-wordnet-2025.xml.gz`
- Moby II `https://www.gutenberg.org/cache/epub/3202/pg3202.txt`

```sh
python3 scripts/dictionaries/build.py \
  --wordnet /path/to/english-wordnet-2025.xml.gz \
  --moby /path/to/pg3202.txt \
  --wordnet-sha256 TRUSTED_64_HEX_SHA256 \
  --moby-sha256 TRUSTED_64_HEX_SHA256
python3 scripts/dictionaries/verify.py
```

This builds real `src-tauri/resources/dictionaries/lexical.sqlite` and a source
manifest; without these files, lexical lookup explicitly reports unavailable.
**Do not distribute an installer without the actual database and license notices.**

## Intended workflow (requires target OS validation)

1. Launch the Tauri app. Settings opens; tray and global shortcut are registered.
2. Configure your shortcut, API provider, model, credentials and optional proxy.
   Configure `Settings → Privacy` to consent to cloud transmission. Offline grammar
   does not require any cloud key.
3. Select non-sensitive text in another editor and press `Ctrl/Cmd + Shift + Space`.
4. The floating assistant reads a real accessibility selection if available;
   on failure it reports an explicit warning. It does **not** simulate clipboard
   capture when native APIs cannot safely access the text.
5. Choose Professional, Shorten, Friendly, Fix Grammar, a model-generated
   suggestion, or enter a custom instruction. Generation only occurs after user
   confirmation. The assistant streams result text when the provider supports it.
6. Use the local Grammar panel or WordNet/Moby thesaurus (once imported).
   Use Copy and paste manually; automatic replacement is disabled for safety.

## Providers and proxies

Providers: Groq, Cerebras, OpenCode Zen, OpenAI, Gemini, Claude, Inception Labs,
and Custom OpenAI-compatible. Add a provider configuration, supply a model ID,
select the supported protocol, then save the API key in native secure storage.
The Test button makes a real, potentially billable inference request; no success
is faked. Zen uses Responses, Anthropic Messages or Chat Completions depending on
model family; some additional Zen model protocols remain unsupported.

Proxy profiles allow HTTP, HTTPS, SOCKS5, SOCKS5H, and optional OS-secure proxy
credentials. Assign a profile per provider. Direct mode suppresses inherited
proxy configuration, and failed custom routing is not silently bypassed. System
mode delegates to the supported reqwest environment/system behavior.

## macOS Accessibility permissions

In Settings → Privacy choose Open system permissions, enable the app under Privacy
& Security → Accessibility, then Recheck. macOS versions and app signing can
change the permission prompt behavior. **Not tested on actual macOS here.**

## Windows editor limitations

Windows UI Automation TextPattern must expose one selected range. Different
browsers, Office editors, password fields and inaccessible controls may not
support it. The app refuses to fabricate the selection and refuses to auto-paste.
**Not tested on Windows here.**

## Security

Cloud AI is disabled until consent. API keys/passwords are stored in operating
system credential storage, never plaintext SQLite. User selections live only in
memory for the active session. No telemetry, user accounts or writing-history
capture are included. No local generative model is installed.

## Build and QA

```sh
pnpm typecheck && pnpm lint && pnpm test && pnpm build
cd src-tauri && cargo fmt --check && cargo clippy --workspace --all-targets && cargo test --workspace && cd ..
python3 scripts/dictionaries/verify.py
pnpm tauri build
```

See `PROGRESS.md`, `docs/TESTING.md`, `docs/KNOWN_LIMITATIONS.md`,
`docs/ARCHITECTURE.md`, `docs/THIRD_PARTY_LICENSES.md` for actual verification
and outstanding work. No native app artifacts were produced in this environment.
