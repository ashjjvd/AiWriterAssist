# Getting started with AiWriterAssist

AiWriterAssist is a small desktop tool for acting on text selected in another application. The app interface is in English; the selected text may be English, Roman Urdu or another language that your configured AI model supports.

## 1. Download and install

Open [GitHub Releases](https://github.com/ashjjvd/AiWriterAssist/releases) and choose a package for your operating system:

- **Windows:** An x64 `.exe` setup (NSIS) **or** an x64 `.msi`. Install one, not both.
- **macOS:** The `.dmg` or installer included in the release, if available and compatible with your Mac. This platform still requires hands-on beta testing.

These beta packages may be unsigned or not notarized. Read security warnings and verify that the download came from the intended release before installing.

## 2. Set up an AI provider (for rewriting)

1. Launch **Writer Assistant** and open **Settings → AI providers**.
2. Select **Add provider**, choose the provider/protocol, model and API key.
3. Save your provider and click **Test** to verify connectivity. This sends a test request to the provider and may incur usage charges.
4. Click **Use** so that the provider displays **Active**. A passing connection test does not activate it.
5. Open **Settings → Privacy** and enable consent to send selected text to your configured cloud provider.

**Offline Grammar and Synonyms** do not require a configured cloud AI provider.

## 3. Improve selected text

1. In Notepad or another supported editor, write a short piece of **non-sensitive** text.
2. Highlight the passage.
3. Press **`Ctrl + Shift + Space`** on Windows or **`⌘ + Shift + Space`** on macOS.
4. Click an action such as **Translate**, **Shorten**, **Expand**, **Polish**, **Fix Grammar** or **Refine Prompt**.
5. Review the result. Use **Copy**; on supported Windows text controls, **Replace** may be available after a safety check.

A floating popup opens without making an AI analysis request. If no text is captured, check that the source editor exposes an accessible text selection.

## 4. Ask for contextual suggestions (optional)

In the same popup, click **Custom Suggestions**. *Only then* does AiWriterAssist send the selected text for contextual analysis, provided you have enabled cloud consent. The AI considers the language, tone, purpose and topic and returns concise actions such as **Clarify**, **Structure** or **Natural English**, as appropriate to the text.

Choose a suggested action to request its rewrite. Suggested chips are separate from your saved one-click actions and can differ for each selection.

## 5. Type a custom instruction

Expand **Custom instruction**, enter the result you want (for example, “turn this into an accurate two-sentence project update”), then click **Generate**. The text and your instruction are sent to the active AI provider.

## 6. Customize your actions

Open **Settings → Prompt Library**. You can add or edit action labels and prompt instructions, enable/disable actions, mark favorites for the popup, reorder them and restore defaults.

The analysis instruction used by **Custom Suggestions** is separately editable under **Settings → AI Prompts**.

## 7. Use offline Synonyms and Grammar

- Highlight an **English word** and press **`Ctrl + Shift + D`** on Windows (or **`⌘ + Shift + D`** on macOS) to open the dedicated Synonyms popup. Results use meanings and related words from bundled lexical data. Not every related term is an interchangeable synonym.
- Use **More → Local grammar** in Improve Writing for Harper's offline English grammar checks.

## 8. Popup controls

- Press **`Esc`** to close a popup.
- Drag the popup by its header to reposition it; long text and results scroll inside.
- Use **Copy** if Replace is unavailable or refuses to proceed.

## Troubleshooting

| What you see | What to check |
| --- | --- |
| **No active AI provider configured** | Click **Use** for the intended provider in Settings → AI providers. |
| **Cloud AI disabled** | Enable cloud consent in Settings → Privacy. |
| **Selected text unavailable** | Try an accessible plain-text editor, with a single nonempty selection. |
| **No Custom Suggestions** | Check active provider, consent and model compatibility; some models return malformed structured responses. |
| **Replace disabled or rejected** | The editor/selection is not verified for replacement. Use **Copy** instead. |
| **Shortcut does not open a popup** | Check shortcut conflicts in Settings → General; on macOS check Accessibility permission. |
| **macOS warns about the app** | Builds may be unsigned/unnotarized. Do not disable OS protection without verifying the file and trusting the publisher. |

For further assistance, [open an issue](https://github.com/ashjjvd/AiWriterAssist/issues) without including API keys, credentials or personal document contents.
