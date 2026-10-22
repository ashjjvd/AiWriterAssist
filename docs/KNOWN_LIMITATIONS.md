# Known limitations — v0.2.0 beta

This list describes **current beta risks**, not guarantees of failure. Passing automated tests and generating native installers does not substitute for real-device compatibility testing.

1. **Cross-application selection depends on OS accessibility support.** Not all editors expose selected text; password fields and protected controls are unsupported. Some browser content and rich-text editors may not work.
2. **Windows Replace is conditional and experimental.** The app checks the target window, process, selection and editability before attempting a Unicode-keyboard replacement. A focus change or unsupported control causes it to refuse. In rare cases, an editor may accept only part of the injected input. Always test with throwaway text and use Undo if needed. Copy is the fallback.
3. **macOS Replace remains copy-only.** The macOS native capture path uses Accessibility APIs. Real MacBook tests of permissions, focus, shortcuts and selection across editors are still needed.
4. **Unsigned or unnotarized installers may trigger OS warnings.** Signing and notarization are not guaranteed for early CI builds. Verify source, architecture and authenticity before installing.
5. **Cloud AI requires a provider and consent.** A saved provider must be marked **Active** using **Use**. Provider **Test** alone is insufficient. Requests are subject to the provider's terms, outages, token limits and charges.
6. **Custom Suggestions depend on structured model output.** Some providers and models may still produce invalid responses despite resilient parsing/retry logic. Fixed actions can work even when suggestion analysis fails.
7. **Offline grammar is primarily English.** Roman Urdu, Urdu and code-mixed text rely on a compatible cloud model for rewriting. The local lexical database covers English, and broad Moby associations are not guaranteed interchangeable synonyms.
8. **Global shortcuts can conflict with other apps.** Some apps or operating systems reserve key combinations; change shortcuts in Settings if needed.
9. **Dictionary source hashes and third-party notices need release review.** The build pipeline has warned that upstream source hashes were not independently pinned. A public beta maintainer should confirm source provenance, correct license notices and the shipped lexical database before broad distribution.
10. **No general-purpose offline AI model or end-to-end writing-history service.** Offline features are grammar and lexical lookup; generative actions send text to the configured provider after user action and consent.

Report reproducible bugs via [GitHub Issues](https://github.com/ashjjvd/AiWriterAssist/issues). Never include API keys, private documents or sensitive prompts in public reports.
