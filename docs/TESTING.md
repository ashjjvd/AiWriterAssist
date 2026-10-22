# Testing AiWriterAssist — v0.2.0 beta

## Automated validation

GitHub Actions runs checks on **Windows** and **macOS**. Depending on the workflow revision, these include frontend typechecking/lint/tests/build, Rust formatting/Clippy/tests, real lexical database verification and Tauri installer builds. For the **exact checks actually run**, inspect the green job logs in the intended [GitHub Actions run](https://github.com/ashjjvd/AiWriterAssist/actions).

A green job indicates that its automated steps passed; it does not prove that a real user has opened the app on that operating system.

## Manual Windows smoke tests

Use a new Notepad document with throwaway, non-sensitive text.

1. Install the fresh `.exe` **or** `.msi` package and launch Writer Assistant.
2. Set a provider in **Settings → AI providers**, click **Test**, then **Use**; verify the **Active** status.
3. Enable consent in **Settings → Privacy**.
4. Select text and press `Ctrl + Shift + Space`. The popup should appear **without automatically requesting AI analysis**.
5. Click **Shorten**; confirm a generated result and functional **Copy**.
6. Click **Custom Suggestions** and confirm that contextual chips appear only after the click. Choose one and generate a result.
7. Edit an action in **Settings → Prompt Library**; invoke a new selection and verify the changed label/instruction.
8. Check **Local grammar** and the `Ctrl + Shift + D` **Synonyms** popup for an English word.
9. Press **Esc**; verify dismissal. Open again and drag the popup header.
10. Test **Replace** on throwaway Notepad text. Verify that unsupported/read-only controls do not receive a blind paste. If replacement partially applies, use Undo and file a bug.

## Manual macOS smoke tests (MacBook tester needed)

1. Confirm the `.dmg` / app architecture matches the Mac.
2. Verify installation, Gatekeeper behavior and Accessibility permission in **System Settings → Privacy & Security → Accessibility**.
3. Test selection capture in TextEdit, shortcut invocation (`⌘ + Shift + Space` and `⌘ + Shift + D`), popup position/focus, **Esc**, local grammar and Synonyms.
4. Configure a test provider, grant cloud consent, check direct actions and Custom Suggestions.
5. Confirm **Copy** works. **Do not expect native Replace** on macOS in this beta.
6. Record the exact OS version, chip architecture, editor and steps for any issue.

## Privacy and bug reports

Never put API keys, confidential documents or secrets in GitHub issues. A minimal synthetic text example and a screenshot without sensitive content are ideal. Use [GitHub Issues](https://github.com/ashjjvd/AiWriterAssist/issues).
