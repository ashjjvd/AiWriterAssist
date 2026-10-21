# Known limitations (not a release)

1. No native macOS/Windows build or runtime test occurred. OS-specific APIs have
   source implementations but are unverified and may require build corrections.
2. Automatic replacement is intentionally disabled (`copy_only`); manual copy
   and paste is required. There is no fallback clipboard capture.
3. Official Moby II / OEWN files could not be fetched in this environment. The
   actual lexical database is absent. The importer is real and fixture tested;
   thesaurus commands report `DICTIONARY_UNAVAILABLE` until import succeeds.
4. No pnpm lockfile or Cargo.lock was produced, because package registries and
   toolchains are unavailable. Version ranges in manifests are NOT lockfiles.
5. There is no verified inference result from any of the eight provider families.
   HTTP adapters were authored, not live tested. Some streamed provider event
   variants and invalid UTF-8 boundary fragments are not fully handled.
6. The local grammar path uses Harper but native compilation and actual grammar
   output have not been tested. Mixed English+Urdu is skipped conservatively.
7. Provider model discovery is only handled for OpenAI-compatible `/models`.
   Anthropic Messages / Zen manual model IDs require human configuration.
8. The agent requested complete release-grade CI/native QA but those steps are
   not finished. GitHub Actions is scaffolded, and currently fails the dictionary
   release gate until real sources have been added.
9. Settings persist, but window geometry and some additional user preferences do
   not yet persist. There is no connection reuse cache.
10. Floating popup implementation and UI behavior have not been visually or
    interactively tested on an actual target platform.
