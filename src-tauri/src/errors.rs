use serde::Serialize;
#[derive(Debug, Serialize, Clone, thiserror::Error)]
#[error("{message}")]
pub struct AppError {
    pub code: String,
    pub message: String,
    pub recovery: String,
}
impl AppError {
    pub fn new(code: &str, message: &str, recovery: &str) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
            recovery: recovery.into(),
        }
    }
    pub fn internal(e: impl std::fmt::Display) -> Self {
        Self::new(
            "INTERNAL_ERROR",
            &format!("Operation failed: {e}"),
            "Retry or inspect the local diagnostics.",
        )
    }
}
impl From<rusqlite::Error> for AppError {
    fn from(e: rusqlite::Error) -> Self {
        Self::internal(e)
    }
}
pub type Result<T> = std::result::Result<T, AppError>;
