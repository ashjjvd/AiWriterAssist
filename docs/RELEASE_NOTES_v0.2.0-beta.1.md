# AiWriterAssist v0.2.0 Beta 1

**Select text. Choose an action. Keep writing.**

This is an **early-access desktop beta** of AiWriterAssist, a compact writing assistant for Windows and macOS. It helps you rewrite selected text, discover context-aware writing improvements on demand, check English grammar offline and explore synonyms without switching to a separate chat window.

## Highlights

- **Instant writing popup:** Select text, use the global shortcut and see saved actions immediately—without sending an automatic analysis request.
- **One-click AI actions:** Translate, Shorten, Expand, Polish, Fix Grammar, Refine Prompt and additional actions under **More**.
- **On-demand Custom Suggestions:** Click **Custom Suggestions** to analyze the selected text and receive concise, context-specific actions based on its language, purpose, topic and tone.
- **Editable Prompt Library:** Create and customize your own one-click action buttons and their AI instructions.
- **Custom instruction field:** Ask for a particular rewrite when none of the saved actions fits.
- **Dedicated Synonyms popup:** Meaning-grouped synonyms and related terms sourced from bundled lexical data.
- **Local English grammar:** Harper-based checks without a cloud model.
- **Improved popup UX:** Compact layouts, draggable floating windows, `Esc` to dismiss and scrolling for long results.
- **Guarded Windows Replace:** Attempts to replace the original selection only when the editor and selected text can be revalidated. **Copy** remains available.

## First-time setup

1. Download the installer appropriate for your computer from the **Assets** section below.
2. Install and open **Writer Assistant**.
3. In **Settings → AI providers**, add your provider, save the API key, click **Test**, then click **Use** to activate it.
4. In **Settings → Privacy**, grant cloud AI consent if you want AI rewriting.
5. Select text in a supported editor and use the shortcut:

   | Action | Windows | macOS |
   | --- | --- | --- |
   | Improve Writing | `Ctrl + Shift + Space` | `⌘ + Shift + Space` |
   | Synonyms | `Ctrl + Shift + D` | `⌘ + Shift + D` |
   | Close popup | `Esc` | `Esc` |

For a complete walkthrough, read the [Getting Started guide](https://github.com/ashjjvd/AiWriterAssist/blob/main/docs/GETTING_STARTED.md).

## Downloads

- **Windows x64:** Install with the attached NSIS `.exe` **or** `.msi` file. Only one installer is needed.
- **macOS:** Use the attached macOS installer, **if provided**, for the correct architecture. A MacBook test is still pending.

**Please note:** Beta installers may not be signed or notarized. Verify downloaded files and do not bypass OS security warnings unless you trust their origin. No Rust, Node.js, Python or development environment is required to use the installers.

## Privacy and limitations

- Opening the popup does **not** automatically submit text to a cloud provider. Cloud requests happen when you choose an AI action, submit a custom instruction or click Custom Suggestions. A provider **Test** also sends a request.
- AI processing uses **your configured provider and API key**, subject to provider policies and possible charges. Offline English grammar and lexical lookup do not require that provider.
- **Windows Replace** depends on editor accessibility and selection safety checks; it is not supported in every application and still needs broad interactive testing.
- **macOS selection and popup behavior** require real-device testing. Automatic Replace is **copy-only** on macOS in this beta.
- Browser editors, protected fields, elevated applications, shortcut conflicts and unsupported model protocols can limit functionality.
- Third-party dictionary licenses and source provenance must be checked before wide public distribution.

## Help test this beta

We especially welcome feedback from Windows users and MacBook testers. Please report your **OS, processor architecture, app version, source editor, exact steps and expected/actual result** at [GitHub Issues](https://github.com/ashjjvd/AiWriterAssist/issues). **Do not include API keys or confidential selected text.** Use a throwaway document when testing Replace.

**Source:** [AiWriterAssist](https://github.com/ashjjvd/AiWriterAssist) · [Usage guide](https://github.com/ashjjvd/AiWriterAssist/blob/main/docs/GETTING_STARTED.md) · [Known limitations](https://github.com/ashjjvd/AiWriterAssist/blob/main/docs/KNOWN_LIMITATIONS.md)
