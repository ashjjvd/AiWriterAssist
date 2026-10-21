use crate::{
    errors::{AppError, Result},
    security,
    storage::ProxyProfile,
};
use reqwest::{Client, Proxy};
use serde::{Deserialize, Serialize};
use std::time::Duration;
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ProxyMode {
    Direct,
    System,
    Custom { profile_id: String },
}
pub fn validate_endpoint(base: &str) -> Result<()> {
    let url = url::Url::parse(base).map_err(|_| {
        AppError::new(
            "INVALID_ENDPOINT",
            "Invalid provider URL.",
            "Use an HTTPS base URL.",
        )
    })?;
    if url.host_str().is_none()
        || !(url.scheme() == "https"
            || (url.scheme() == "http"
                && matches!(url.host_str(), Some("localhost" | "127.0.0.1" | "[::1]"))))
    {
        return Err(AppError::new(
            "INVALID_ENDPOINT",
            "Only HTTPS or local HTTP endpoints are supported.",
            "Use a secure endpoint.",
        ));
    }
    if !url.username().is_empty() || url.password().is_some() {
        return Err(AppError::new(
            "INVALID_ENDPOINT",
            "Credentials are not allowed inside URLs.",
            "Provide credentials separately.",
        ));
    }
    Ok(())
}
pub fn proxy_url(profile: &ProxyProfile) -> Result<String> {
    if profile.port == 0
        || profile.hostname.trim().is_empty()
        || profile
            .hostname
            .chars()
            .any(|ch| ['@', '/', '?', '#'].contains(&ch))
    {
        return Err(AppError::new(
            "INVALID_PROXY",
            "Invalid proxy hostname or port.",
            "Check your proxy profile.",
        ));
    }
    let scheme = match profile.scheme.as_str() {
        "http" => "http",
        "https" => "https",
        "socks5" => "socks5",
        "socks5h" => "socks5h",
        _ => {
            return Err(AppError::new(
                "INVALID_PROXY",
                "Unsupported proxy protocol.",
                "Choose HTTP, HTTPS, SOCKS5 or SOCKS5H.",
            ))
        }
    };
    let host = if profile.hostname.contains(':') && !profile.hostname.starts_with('[') {
        format!("[{}]", profile.hostname)
    } else {
        profile.hostname.clone()
    };
    Ok(format!("{scheme}://{host}:{}", profile.port))
}
pub fn client(mode: &ProxyMode, profiles: &[ProxyProfile], timeout_seconds: u64) -> Result<Client> {
    let mut builder = Client::builder()
        .timeout(Duration::from_secs(timeout_seconds.clamp(3, 120)))
        .user_agent("WriterAssistant/0.2");
    match mode {
        ProxyMode::Direct => {
            builder = builder.no_proxy();
        }
        ProxyMode::System => {}
        ProxyMode::Custom { profile_id } => {
            let p = profiles
                .iter()
                .find(|p| &p.id == profile_id)
                .ok_or_else(|| {
                    AppError::new(
                        "PROXY_FAILED",
                        "Proxy profile was not found.",
                        "Select an existing proxy.",
                    )
                })?;
            let mut proxy = Proxy::all(proxy_url(p)?).map_err(AppError::internal)?;
            if let Some(secret_ref) = &p.password_secret_reference {
                let password = security::load_secret(secret_ref)?;
                let username = p.username.as_deref().unwrap_or("");
                proxy = proxy.basic_auth(username, &password);
            }
            builder = builder.no_proxy().proxy(proxy);
        }
    }
    builder.build().map_err(|_| {
        AppError::new(
            "PROXY_FAILED",
            "Could not construct network route.",
            "Check proxy settings.",
        )
    })
}
pub fn network_error(e: &reqwest::Error) -> AppError {
    let code = if e.is_timeout() {
        "REQUEST_TIMEOUT"
    } else if e.is_connect() {
        "NETWORK_UNAVAILABLE"
    } else if e.is_decode() {
        "RESPONSE_INVALID"
    } else {
        "PROVIDER_UNAVAILABLE"
    };
    AppError::new(
        code,
        "Provider request could not be completed.",
        "Check your internet connection, proxy and provider configuration.",
    )
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn direct_and_proxy() {
        assert!(client(&ProxyMode::Direct, &[], 10).is_ok());
        let p = ProxyProfile {
            id: "1".into(),
            name: "p".into(),
            scheme: "socks5h".into(),
            hostname: "127.0.0.1".into(),
            port: 1080,
            username: None,
            password_secret_reference: None,
        };
        assert_eq!(proxy_url(&p).unwrap(), "socks5h://127.0.0.1:1080");
        assert!(client(
            &ProxyMode::Custom {
                profile_id: "1".into()
            },
            &[p],
            10
        )
        .is_ok());
    }
    #[test]
    fn rejects_unsecured_remote_endpoint() {
        assert!(validate_endpoint("http://example.com/v1").is_err());
    }
}
