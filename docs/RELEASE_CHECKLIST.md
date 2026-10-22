# Release checklist — v0.2.0 beta

**CI green is necessary, not sufficient, for a trustworthy download.** The first public release should be marked **Pre-release** until the following reviews are completed.

## Build provenance

- [ ] Confirm the latest GitHub Actions validation is green on **Windows** and **macOS** for the intended release commit.
- [ ] Record the exact commit SHA and successful Actions run ID.
- [ ] Download installers from that run, inspect filenames and architectures, and ensure the packages start on their respective OSes.
- [ ] Validate that real `lexical.sqlite` and required notices are bundled, not just an empty placeholder.
- [ ] Independently verify/pin SHA-256 hashes and redistribution notices for Open English WordNet and Moby sources; review Harper and Princeton WordNet attributions.
- [ ] Generate and keep a `SHA256SUMS.txt` for the **actual installer assets** attached to the release.
- [ ] Check whether Windows installers are signed and macOS assets signed/notarized; disclose unsigned status when applicable.

## Functional smoke testing

- [ ] Windows: install, open Settings, tray, global shortcuts and `Esc` close.
- [ ] Windows: provider setup → **Test** → **Use** → consent → direct action.
- [ ] Windows: open popup without automatic AI analysis; click Custom Suggestions to trigger it.
- [ ] Windows: edit a Prompt Library action and verify it takes effect.
- [ ] Windows: local grammar and meaning-grouped Synonyms results.
- [ ] Windows: test **Copy** and guarded **Replace** in disposable Notepad text; verify rejection in unsupported contexts.
- [ ] macOS real device: install/launch, Accessibility permission, text capture, popup dragging, shortcuts, grammar, synonyms and AI actions.
- [ ] macOS: confirm **Copy** fallback; do not claim native replacement.

## Publication

- [ ] Update `README.md`, Getting Started, Known Limitations and third-party notices.
- [ ] Create a **draft Pre-release** tagged `v0.2.0-beta.1`; review the prepared release notes.
- [ ] Attach the **real installers**, not the parent Actions artifact ZIP, and attach checksum file.
- [ ] Verify filenames, package architectures and checksums from the release draft.
- [ ] Publish only after reviewing the above; if a blocker remains, keep it as draft/internal testing.
- [ ] Share the macOS download with a tester who owns a compatible MacBook and request feedback without private text or credentials.

Suggested release version: `v0.2.0-beta.1` (app's internal version remains `0.2.0`).
