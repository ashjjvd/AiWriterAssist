<div align="center">

# AiWriterAssist

**Select text. Choose an action. Keep writing.**

A compact desktop writing assistant for Windows and macOS, built to help you improve writing without leaving the application you are working in.

[**Download a beta build**](https://github.com/ashjjvd/AiWriterAssist/releases) · [**Getting started**](docs/GETTING_STARTED.md) · [**Known limitations**](docs/KNOWN_LIMITATIONS.md) · [**Report an issue**](https://github.com/ashjjvd/AiWriterAssist/issues)

</div>

> **Early-access beta:** The project produces CI builds for Windows and macOS. Real-world compatibility varies by editor and platform. Windows features are being tested; hands-on macOS testing, signing and notarization are still pending. Please use disposable text for initial testing.

## A writing assistant that stays out of your way

Highlight text, press a shortcut and use a small floating popup to choose what happens next. You get **one-click actions**, **on-demand AI suggestions**, and a **custom instruction** field—without automatically sending every selected passage to an AI model.

### Features

| | What it does |
| --- | --- |
| **One-click writing actions** | Translate, Shorten, Expand, Polish, Fix Grammar and Refine Prompt. More actions are available from the popup. |
| **Custom Suggestions** | When you explicitly click it, AI analyzes the selected text's language, purpose, topic and tone, then proposes concise contextual actions. |
| **Editable Prompt Library** | Add, edit, enable, disable, favorite, remove and reorder writing actions and their instructions in Settings. |
| **Custom instructions** | Type your own request and generate a rewrite of the selected text. |
| **Offline grammar** | Check English grammar locally using Harper without a cloud AI key. |
| **Dedicated Synonyms popup** | Browse word meanings and related terms using a bundled lexical database built from Open English WordNet and Moby Thesaurus II. |
| **Copy and guarded Replace** | Copy generated results anywhere. Windows replacement is attempted only when a supported editor and original selection can be revalidated; other cases remain copy-only. |
| **Your AI provider** | Configure a compatible provider, model, API key and optional proxy. The app does not provide a hosted AI account. |

## Get started in five steps

1. **Install** a matching Windows or macOS package from [Releases](https://github.com/ashjjvd/AiWriterAssist/releases). These are beta builds; verify that you trust the source and note that installers may be unsigned.
2. **Configure AI:** Open **Settings → AI providers**, add a provider and its API key, test the connection, then click **Use** to make it **Active**. A successful **Test** alone does not activate a provider.
3. **Grant consent:** In **Settings → Privacy**, enable cloud AI consent if you want cloud rewriting. Local grammar and dictionary lookups do not require cloud AI.
4. **Select text** in a supported application and press the writing shortcut.
5. **Choose an action** for an immediate rewrite; click **Custom Suggestions** for an AI-generated action list; or enter a **Custom instruction**. Review the result and use **Copy**, or **Replace** where safely supported.

### Shortcuts

| Action | Windows | macOS |
| --- | --- | --- |
| Improve Writing | `Ctrl + Shift + Space` | `⌘ + Shift + Space` |
| Synonyms | `Ctrl + Shift + D` | `⌘ + Shift + D` |
| Close a popup | `Esc` | `Esc` |

Shortcuts can be changed in **Settings → General**. Global shortcuts may conflict with shortcuts already registered by other applications.

## Fixed actions vs. Custom Suggestions

**Fixed action:** Click **Shorten** → the app sends your selected text and the saved *Shorten* instruction to your active AI provider → a shorter version appears. No AI analysis request is needed to display the buttons.

**Custom Suggestions:** Click **Custom Suggestions** → the app sends your selected text and the configurable analysis prompt to your active AI provider → short context-aware action chips appear → click one to generate a rewrite. Suggestions are not simply the saved Prompt Library buttons.

**Custom instruction:** Expand the instruction field, describe the transformation and click **Generate**.

You can customize fixed actions in **Settings → Prompt Library** and the analysis prompt in **Settings → AI Prompts**.

## Installation and platform notes

**Windows:** Choose either the x64 NSIS `.exe` setup or `.msi` installer. You only need one. The installer may display an unknown-publisher warning because this beta is not verified as code-signed. Do not bypass security warnings unless you have independently verified the download and trust the project.

**macOS:** Download a `.dmg` or other macOS installer **only if that asset is attached to the release**, and check that it matches your Mac's architecture. macOS may require **System Settings → Privacy & Security → Accessibility** permission to read selected text. Signing and notarization are not yet verified; macOS is awaiting hands-on testing.

**Developers:** The source uses **Tauri 2, Rust, React and TypeScript**. See [architecture](docs/ARCHITECTURE.md) and [testing](docs/TESTING.md). End users do **not** need developer tools to install an installer.

## Privacy and safety

- **Selected text is not automatically sent to AI simply because the popup opens.** Cloud calls occur when you explicitly request a rewrite or click Custom Suggestions, subject to your cloud consent setting. A provider connection test also sends a test request.
- Cloud text is processed by your **configured provider** under its terms and privacy policy; usage may incur charges.
- API keys are intended to be stored using the operating system's secure credential storage. Selected writing is handled as an active session, not a searchable writing-history feature.
- Offline English grammar and lexical lookups run locally. The app does **not** include an offline generative language model.
- Secure/password fields and inaccessible editor selections are not supported. Replacement may not work in browsers, rich editors or elevated windows; **Copy** is the fallback.

See [Known limitations](docs/KNOWN_LIMITATIONS.md) for platform-specific restrictions.

## Help test AiWriterAssist

This is an early beta. Feedback from Windows users and **MacBook owners** is especially helpful. When opening an [issue](https://github.com/ashjjvd/AiWriterAssist/issues), include your OS, app version, target editor, the action you tried, and the result. **Never post API keys or private selected text.**

Please verify native selection, global shortcuts, window focus, `Esc` dismissal, dictionary lookup and the Windows Replace behavior using a throwaway document first.

## License and attribution

AiWriterAssist source code is available under the [MIT License](LICENSE). The bundled language resources and libraries have their own terms. See [third-party licenses](docs/THIRD_PARTY_LICENSES.md), including **Harper**, **Open English WordNet** (CC BY 4.0) and **Moby Thesaurus II**. Redistribution of compiled dictionary assets requires preservation of applicable notices.

---

<sub>Made for writers, students, researchers, prompt engineers and anyone who wants quick, intentional writing assistance.</sub>
