# AiWriterAssist — early beta status (2026-10-22)

The source project has advanced from the original scaffold to a CI-built **v0.2.0 desktop beta**. Previous generated-project status notes saying there were no Windows/macOS builds are superseded by this summary.

## Confirmed through the project's development/testing process

- Native installer artifacts have been produced by GitHub Actions for Windows and macOS.
- Windows manual testing has demonstrated selected-text capture, provider testing and activation, direct rewriting, on-demand AI Custom Suggestions, and the compact floating popup.
- The source has editable Prompt Library actions and an editable Custom Suggestions analysis prompt.
- The build pipeline creates a lexical database and runs frontend/Rust checks; successful validation runs have been reported for both platforms.

## Still to verify before a wider release

- **Latest guarded Windows Replace:** real editor-by-editor interactive testing, including focus changes and partial keyboard injection.
- **macOS:** installation and Accessibility behavior on a real MacBook; available CI artifacts are not real-device proof.
- **Release integrity:** installer checksums, signing/notarization status, bundled resources and complete third-party notices.
- **Model coverage:** test AI analysis, token limits, streaming and proxy behavior across supported provider protocols.

This is a **beta with known limitations**, not a statement that every acceptance criterion is complete. See [release checklist](docs/RELEASE_CHECKLIST.md), [known limitations](docs/KNOWN_LIMITATIONS.md) and [testing](docs/TESTING.md).
