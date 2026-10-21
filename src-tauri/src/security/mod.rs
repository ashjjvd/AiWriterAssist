use crate::errors::{AppError, Result};
const SERVICE: &str = "app.writer.assistant";
pub fn save_secret(reference: &str, secret: &str) -> Result<()> {
    if reference.len() > 150 || reference.is_empty() || secret.is_empty() {
        return Err(AppError::new(
            "INVALID_SECRET",
            "A nonempty secret is required.",
            "Enter your credential.",
        ));
    }
    keyring::Entry::new(SERVICE, reference)
        .map_err(|_| keychain_error())?
        .set_password(secret)
        .map_err(|_| keychain_error())
}
pub fn load_secret(reference: &str) -> Result<String> {
    keyring::Entry::new(SERVICE, reference)
        .map_err(|_| keychain_error())?
        .get_password()
        .map_err(|_| {
            AppError::new(
                "AUTH_MISSING",
                "Credential not found in secure storage.",
                "Enter the API key again.",
            )
        })
}
pub fn delete_secret(reference: &str) -> Result<()> {
    keyring::Entry::new(SERVICE, reference)
        .map_err(|_| keychain_error())?
        .delete_credential()
        .map_err(|_| keychain_error())
}
fn keychain_error() -> AppError {
    AppError::new(
        "KEYCHAIN_UNAVAILABLE",
        "Operating system credential storage is unavailable.",
        "Unlock your keychain or credential manager.",
    )
}
