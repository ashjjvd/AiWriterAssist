use crate::{errors::Result, selection::NativeSelection};
#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "windows")]
mod windows;
pub fn read_native_selection() -> Result<NativeSelection> {
    #[cfg(target_os = "windows")]
    {
        return windows::read_selection();
    }
    #[cfg(target_os = "macos")]
    {
        return macos::read_selection();
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        Err(crate::errors::AppError::new(
            "PLATFORM_UNSUPPORTED",
            "Native selection is supported on Windows and macOS only.",
            "Use a supported operating system.",
        ))
    }
}
