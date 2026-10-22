use crate::errors::{AppError, Result};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SelectionSession {
    pub session_id: String,
    pub source_platform: String,
    pub source_process_id: u32,
    pub source_window_identifier: String,
    pub source_control_identifier: Option<String>,
    pub captured_text: String,
    pub captured_text_hash: String,
    pub capture_method: String,
    pub captured_at: u64,
    pub replacement_capability: String,
    pub selection_is_editable: bool,
    pub capture_warning: Option<String>,
}

pub struct Sessions(pub Mutex<Option<SelectionSession>>);

pub struct NativeSelection {
    pub text: String,
    pub pid: u32,
    pub window: String,
    pub editable: bool,
    pub control: Option<String>,
}

pub fn capture() -> Result<SelectionSession> {
    let native = crate::platform::read_native_selection()?;
    if native.text.trim().is_empty() {
        return Err(AppError::new(
            "NO_SELECTION",
            "No text was selected.",
            "Select text in another application and press the shortcut.",
        ));
    }
    let digest = Sha256::digest(native.text.as_bytes());
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(AppError::internal)?
        .as_secs();
    let may_replace = cfg!(target_os = "windows") && native.editable;

    Ok(SelectionSession {
        session_id: Uuid::new_v4().to_string(),
        source_platform: std::env::consts::OS.into(),
        source_process_id: native.pid,
        source_window_identifier: native.window,
        source_control_identifier: native.control,
        captured_text_hash: hex::encode(digest),
        captured_text: native.text,
        capture_method: "accessibility".into(),
        captured_at: secs,
        replacement_capability: if may_replace {
            "verified_keyboard_replace"
        } else {
            "copy_only"
        }
        .into(),
        selection_is_editable: native.editable,
        capture_warning: if may_replace {
            None
        } else {
            Some("This selection cannot be safely replaced. Use Copy instead.".into())
        },
    })
}

pub fn replace(session: &SelectionSession, approved: &str) -> Result<()> {
    let age = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(AppError::internal)?
        .as_secs()
        .saturating_sub(session.captured_at);
    if age > 300 {
        return Err(AppError::new(
            "SESSION_EXPIRED",
            "The original selection has expired.",
            "Select the text again.",
        ));
    }
    if !session.selection_is_editable
        || session.replacement_capability != "verified_keyboard_replace"
        || approved.is_empty()
        || approved.encode_utf16().count() > 8000
    {
        return Err(AppError::new(
            "UNSAFE_REPLACEMENT",
            "This selection cannot be safely replaced.",
            "Copy the result and paste it manually.",
        ));
    }
    if hex::encode(Sha256::digest(session.captured_text.as_bytes())) != session.captured_text_hash {
        return Err(AppError::new(
            "SESSION_CHANGED",
            "The captured text no longer matches the saved selection.",
            "Re-select the text and retry.",
        ));
    }

    #[cfg(target_os = "windows")]
    {
        let current = session.clone();
        let replacement = approved.to_owned();
        // A dedicated apartment avoids conflicts with WebView's COM apartment.
        return std::thread::spawn(move || {
            crate::platform::replace_native_selection(&current, &replacement)
        })
        .join()
        .map_err(|_| AppError::internal("Windows replacement thread panicked"))?;
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err(AppError::new(
            "UNSAFE_REPLACEMENT",
            "Native replacement is not available on this platform.",
            "Copy the result and paste it manually.",
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn never_blindly_pastes() {
        let s = SelectionSession {
            session_id: "one".into(),
            source_platform: "windows".into(),
            source_process_id: 1,
            source_window_identifier: "hwnd:1".into(),
            source_control_identifier: None,
            captured_text: "hello".into(),
            captured_text_hash: "".into(),
            capture_method: "accessibility".into(),
            captured_at: u64::MAX,
            replacement_capability: "copy_only".into(),
            selection_is_editable: true,
            capture_warning: None,
        };
        assert!(replace(&s, "different").is_err());
    }
}
