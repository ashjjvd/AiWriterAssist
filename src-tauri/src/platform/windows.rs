//! Windows UI Automation selection capture + guarded text replacement.
//! No clipboard writes; never pastes without revalidating the source selection.
use crate::{
    errors::{AppError, Result},
    selection::{NativeSelection, SelectionSession},
};
use sha2::{Digest, Sha256};
use std::{mem::size_of, time::Duration};
use windows::{
    core::Interface,
    Win32::{
        Foundation::HWND,
        System::Com::{
            CoCreateInstance, CoInitializeEx, CoUninitialize, CLSCTX_INPROC_SERVER,
            COINIT_APARTMENTTHREADED,
        },
        UI::{
            Accessibility::{
                CUIAutomation, IUIAutomation, IUIAutomationElement, IUIAutomationTextPattern,
                IUIAutomationValuePattern, UIA_DocumentControlTypeId, UIA_EditControlTypeId,
                UIA_TextPatternId, UIA_ValuePatternId,
            },
            Input::KeyboardAndMouse::{
                SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT,
                KEYEVENTF_KEYUP, KEYEVENTF_UNICODE, VIRTUAL_KEY,
            },
            WindowsAndMessaging::{GetForegroundWindow, IsWindow, SetForegroundWindow},
        },
    },
};

fn native_error() -> AppError {
    AppError::new(
        "SELECTION_UNAVAILABLE",
        "The focused application does not expose an accessible selected text range.",
        "Try another editor. Password and secure fields are not supported.",
    )
}

unsafe fn focused_selection(automation: &IUIAutomation) -> Result<(IUIAutomationElement, String)> {
    let focused = automation.GetFocusedElement().map_err(|_| native_error())?;
    if focused
        .CurrentIsPassword()
        .map_err(|_| native_error())?
        .as_bool()
    {
        return Err(AppError::new(
            "SECURE_FIELD",
            "Password and secure fields cannot be captured.",
            "Select non-sensitive text instead.",
        ));
    }
    let pattern = focused
        .GetCurrentPattern(UIA_TextPatternId)
        .map_err(|_| native_error())?;
    let pattern: IUIAutomationTextPattern = pattern.cast().map_err(|_| native_error())?;
    let ranges = pattern.GetSelection().map_err(|_| native_error())?;
    if ranges.Length().map_err(|_| native_error())? != 1 {
        return Err(AppError::new(
            "NO_SELECTION",
            "A single accessible text selection is required.",
            "Select one text range in an editable control.",
        ));
    }
    let range = ranges.GetElement(0).map_err(|_| native_error())?;
    let text = range.GetText(-1).map_err(|_| native_error())?.to_string();
    Ok((focused, text))
}

unsafe fn supports_replacement(element: &IUIAutomationElement) -> bool {
    if !element
        .CurrentIsEnabled()
        .map(|v| v.as_bool())
        .unwrap_or(false)
        || !element
            .CurrentIsKeyboardFocusable()
            .map(|v| v.as_bool())
            .unwrap_or(false)
    {
        return false;
    }
    let kind = match element.CurrentControlType() {
        Ok(kind) => kind,
        Err(_) => return false,
    };
    if kind != UIA_EditControlTypeId && kind != UIA_DocumentControlTypeId {
        return false;
    }
    // A generic UIA Document may be a read-only browser page. Restrict
    // TextPattern-only replacement to recognized native rich-text editors.
    if kind == UIA_DocumentControlTypeId {
        let class = element
            .CurrentClassName()
            .map(|name| name.to_string().to_ascii_lowercase())
            .unwrap_or_default();
        if !class.contains("richedit") && !class.contains("scintilla") {
            return false;
        }
    }
    if let Ok(pattern) = element.GetCurrentPattern(UIA_ValuePatternId) {
        if let Ok(value) = pattern.cast::<IUIAutomationValuePattern>() {
            return value
                .CurrentIsReadOnly()
                .map(|readonly| !readonly.as_bool())
                .unwrap_or(false);
        }
    }
    // Some rich-text editors expose only TextPattern, not ValuePattern.
    // They must still be focusable enabled Edit/Document controls.
    true
}

pub fn read_selection() -> Result<NativeSelection> {
    unsafe {
        CoInitializeEx(None, COINIT_APARTMENTTHREADED)
            .ok()
            .map_err(|_| AppError::new(
                "ACCESSIBILITY_UNAVAILABLE",
                "Windows UI Automation could not initialize.",
                "Retry with an accessible text control.",
            ))?;
        let result = (|| -> Result<NativeSelection> {
            let automation: IUIAutomation =
                CoCreateInstance(&CUIAutomation, None, CLSCTX_INPROC_SERVER)
                    .map_err(|_| native_error())?;
            let (focused, text) = focused_selection(&automation)?;
            let pid = focused.CurrentProcessId().map_err(|_| native_error())? as u32;
            let hwnd = GetForegroundWindow();
            Ok(NativeSelection {
                text,
                pid,
                window: format!("hwnd:{}", hwnd.0 as isize),
                editable: supports_replacement(&focused),
                control: focused.CurrentAutomationId().ok().map(|v| v.to_string()),
            })
        })();
        CoUninitialize();
        result
    }
}

pub fn replace_selection(session: &SelectionSession, approved: &str) -> Result<()> {
    let raw = session
        .source_window_identifier
        .strip_prefix("hwnd:")
        .and_then(|s| s.parse::<isize>().ok())
        .filter(|value| *value != 0)
        .ok_or_else(|| AppError::new(
            "SOURCE_UNAVAILABLE",
            "The original editor could not be identified.",
            "Copy the result and paste it manually.",
        ))?;
    let target = HWND(raw as *mut _);
    unsafe {
        if !IsWindow(Some(target)).as_bool() || !SetForegroundWindow(target).as_bool() {
            return Err(AppError::new(
                "FOCUS_DENIED",
                "Windows could not reactivate the original editor.",
                "Click the editor, reselect your text and retry, or use Copy.",
            ));
        }
        std::thread::sleep(Duration::from_millis(80));
        if GetForegroundWindow() != target {
            return Err(AppError::new(
                "SOURCE_CHANGED",
                "Another window took focus before replacement.",
                "Copy the result and paste it manually.",
            ));
        }
        CoInitializeEx(None, COINIT_APARTMENTTHREADED)
            .ok()
            .map_err(|_| native_error())?;
        let result = (|| -> Result<()> {
            let automation: IUIAutomation =
                CoCreateInstance(&CUIAutomation, None, CLSCTX_INPROC_SERVER)
                    .map_err(|_| native_error())?;
            let (focused, selected) = focused_selection(&automation)?;
            let pid = focused.CurrentProcessId().map_err(|_| native_error())? as u32;
            let control = focused.CurrentAutomationId().ok().map(|v| v.to_string());
            let digest = hex::encode(Sha256::digest(selected.as_bytes()));
            if pid != session.source_process_id
                || control != session.source_control_identifier
                || selected != session.captured_text
                || digest != session.captured_text_hash
                || GetForegroundWindow() != target
                || !supports_replacement(&focused)
            {
                return Err(AppError::new(
                    "SOURCE_CHANGED",
                    "The original editable selection has changed.",
                    "Re-select the text and retry, or use Copy.",
                ));
            }

            // Windows inserts events in a single SendInput batch serially; using Unicode
            // keyboard events keeps the clipboard untouched and supports non-ASCII text.
            let mut input: Vec<INPUT> = Vec::with_capacity(approved.encode_utf16().count() * 2);
            for unit in approved.encode_utf16() {
                for flags in [KEYEVENTF_UNICODE, KEYEVENTF_UNICODE | KEYEVENTF_KEYUP] {
                    input.push(INPUT {
                        r#type: INPUT_KEYBOARD,
                        Anonymous: INPUT_0 {
                            ki: KEYBDINPUT {
                                wVk: VIRTUAL_KEY(0),
                                wScan: unit,
                                dwFlags: flags,
                                time: 0,
                                dwExtraInfo: 0,
                            },
                        },
                    });
                }
            }
            if GetForegroundWindow() != target {
                return Err(AppError::new(
                    "FOCUS_CHANGED",
                    "Focus changed before replacement.",
                    "Copy the result and paste it manually.",
                ));
            }
            let sent = SendInput(&input, size_of::<INPUT>() as i32);
            if sent != input.len() as u32 {
                return Err(AppError::new(
                    "REPLACEMENT_INCOMPLETE",
                    "Windows did not accept every replacement keystroke.",
                    "Check the editor and use Undo if any text changed.",
                ));
            }
            Ok(())
        })();
        CoUninitialize();
        result
    }
}
