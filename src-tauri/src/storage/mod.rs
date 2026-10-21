use crate::errors::{AppError, Result};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

pub struct Store(pub Mutex<Connection>);
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderConfig {
    pub id: String,
    pub provider_type: String,
    pub friendly_name: String,
    pub base_url: String,
    pub selected_model_id: String,
    pub protocol_selection: String,
    pub proxy_profile_id: Option<String>,
    pub secure_api_key_reference: Option<String>,
    pub is_default: bool,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProxyProfile {
    pub id: String,
    pub name: String,
    pub scheme: String,
    pub hostname: String,
    pub port: u16,
    pub username: Option<String>,
    pub password_secret_reference: Option<String>,
}

pub fn initialize(path: &std::path::Path) -> Result<Store> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(AppError::internal)?
    }
    let conn = Connection::open(path)?;
    conn.execute_batch(
        "PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
 CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY);
 CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS provider_configs (id TEXT PRIMARY KEY, data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS proxy_profiles (id TEXT PRIMARY KEY, data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS personal_dictionary (word TEXT PRIMARY KEY COLLATE NOCASE);
 CREATE TABLE IF NOT EXISTS ignored_grammar_rules (identifier TEXT PRIMARY KEY);
 CREATE TABLE IF NOT EXISTS prompt_preferences (key TEXT PRIMARY KEY, value TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS language_preferences (key TEXT PRIMARY KEY, value TEXT NOT NULL);
 INSERT OR IGNORE INTO schema_migrations(version) VALUES (1);",
    )?;
    Ok(Store(Mutex::new(conn)))
}
fn lock(store: &Store) -> Result<std::sync::MutexGuard<'_, Connection>> {
    store.0.lock().map_err(AppError::internal)
}
pub fn get_setting(store: &Store, key: &str) -> Result<Option<String>> {
    Ok(lock(store)?
        .query_row(
            "SELECT value FROM app_settings WHERE key=?1",
            [key],
            |row| row.get(0),
        )
        .optional()?)
}
pub fn put_setting(store: &Store, key: &str, value: &str) -> Result<()> {
    lock(store)?.execute("INSERT INTO app_settings(key,value) VALUES(?1,?2) ON CONFLICT(key) DO UPDATE SET value=excluded.value",params![key,value])?;
    Ok(())
}
pub fn list_providers(store: &Store) -> Result<Vec<ProviderConfig>> {
    let conn = lock(store)?;
    let mut stmt = conn.prepare("SELECT data FROM provider_configs ORDER BY id")?;
    let mut items = Vec::new();
    let rows = stmt.query_map([], |r| r.get::<_, String>(0))?;
    for row in rows {
        items.push(serde_json::from_str(&row?).map_err(AppError::internal)?)
    }
    Ok(items)
}
pub fn save_provider(store: &Store, value: &ProviderConfig) -> Result<()> {
    let json = serde_json::to_string(value).map_err(AppError::internal)?;
    lock(store)?.execute("INSERT INTO provider_configs(id,data) VALUES (?1,?2) ON CONFLICT(id) DO UPDATE SET data=excluded.data",params![value.id,json])?;
    Ok(())
}
pub fn delete_provider(store: &Store, id: &str) -> Result<()> {
    lock(store)?.execute("DELETE FROM provider_configs WHERE id=?1", [id])?;
    Ok(())
}
pub fn list_proxies(store: &Store) -> Result<Vec<ProxyProfile>> {
    let conn = lock(store)?;
    let mut stmt = conn.prepare("SELECT data FROM proxy_profiles ORDER BY id")?;
    let rows = stmt.query_map([], |r| r.get::<_, String>(0))?;
    let mut result = vec![];
    for row in rows {
        result.push(serde_json::from_str(&row?).map_err(AppError::internal)?)
    }
    Ok(result)
}
pub fn save_proxy(store: &Store, p: &ProxyProfile) -> Result<()> {
    let json = serde_json::to_string(p).map_err(AppError::internal)?;
    lock(store)?.execute("INSERT INTO proxy_profiles (id,data) VALUES (?1,?2) ON CONFLICT(id) DO UPDATE SET data=excluded.data",params![p.id,json])?;
    Ok(())
}
pub fn delete_proxy(store: &Store, id: &str) -> Result<()> {
    lock(store)?.execute("DELETE FROM proxy_profiles WHERE id=?1", [id])?;
    Ok(())
}
pub fn list_words(store: &Store) -> Result<Vec<String>> {
    let conn = lock(store)?;
    let mut stmt =
        conn.prepare("SELECT word FROM personal_dictionary ORDER BY word COLLATE NOCASE")?;
    let rows = stmt.query_map([], |r| r.get::<_, String>(0))?;
    rows.collect::<std::result::Result<Vec<_>, _>>()
        .map_err(Into::into)
}
pub fn add_word(store: &Store, word: &str) -> Result<()> {
    if word.trim().is_empty() || word.len() > 80 {
        return Err(AppError::new(
            "INVALID_WORD",
            "Enter a word of at most 80 characters.",
            "Use a single word.",
        ));
    }
    lock(store)?.execute(
        "INSERT OR IGNORE INTO personal_dictionary(word) VALUES(?1)",
        [word.trim()],
    )?;
    Ok(())
}
pub fn remove_word(store: &Store, word: &str) -> Result<()> {
    lock(store)?.execute("DELETE FROM personal_dictionary WHERE word=?1", [word])?;
    Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn settings_survive_reopen() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("test.db");
        let store = initialize(&path).unwrap();
        put_setting(&store, "theme", "dark").unwrap();
        drop(store);
        assert_eq!(
            get_setting(&initialize(&path).unwrap(), "theme").unwrap(),
            Some("dark".into())
        );
    }
    #[test]
    fn no_secrets_in_provider_table() {
        let db =
            initialize(&std::env::temp_dir().join(format!("test-{}.db", uuid::Uuid::new_v4())))
                .unwrap();
        let p = ProviderConfig {
            id: "p".into(),
            provider_type: "openai".into(),
            friendly_name: "P".into(),
            base_url: "https://api.openai.com/v1".into(),
            selected_model_id: "manual".into(),
            protocol_selection: "responses".into(),
            proxy_profile_id: None,
            secure_api_key_reference: Some("secret-ref".into()),
            is_default: false,
        };
        save_provider(&db, &p).unwrap();
        assert!(!serde_json::to_string(&list_providers(&db).unwrap())
            .unwrap()
            .contains("sk-"));
    }
}
