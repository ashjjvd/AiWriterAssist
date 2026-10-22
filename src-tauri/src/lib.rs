mod ai;
mod errors;
mod grammar;
mod network;
mod platform;
mod security;
mod selection;
mod storage;
mod thesaurus;
use errors::{AppError, Result};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    path::PathBuf,
    sync::{
        atomic::{AtomicBool, Ordering},
        Mutex,
    },
};
use storage::{ProviderConfig, ProxyProfile, Store};
use tauri::{Emitter, Manager, State};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

pub struct AppState {
    store: Store,
    sessions: selection::Sessions,
    lexical_path: PathBuf,
    busy: AtomicBool,
    paused: AtomicBool,
    requests: Mutex<HashMap<String, tokio::task::AbortHandle>>,
}
fn get_mode(state: &AppState, provider: &ProviderConfig) -> Result<network::ProxyMode> {
    if let Some(id) = &provider.proxy_profile_id {
        return Ok(network::ProxyMode::Custom {
            profile_id: id.clone(),
        });
    }
    let setting =
        storage::get_setting(&state.store, "proxyMode")?.unwrap_or_else(|| "direct".into());
    Ok(if setting == "system" {
        network::ProxyMode::System
    } else {
        network::ProxyMode::Direct
    })
}
fn selected_provider(state: &AppState) -> Result<ProviderConfig> {
    storage::list_providers(&state.store)?
        .into_iter()
        .find(|p| p.is_default)
        .ok_or_else(|| {
            AppError::new(
                "NO_PROVIDER",
                "No active AI provider configured.",
                "Open Settings to configure and activate one.",
            )
        })
}
#[tauri::command]
fn get_app_settings(state: State<'_, AppState>) -> Result<serde_json::Value> {
    let mut map = serde_json::Map::new();
    for key in [
        "theme",
        "shortcut",
        "synonymShortcut",
        "cloudConsent",
        "automaticAnalysis",
        "proxyMode",
    ] {
        let default = match key {
            "theme" => "system",
            "shortcut" => "CommandOrControl+Shift+Space",
            "synonymShortcut" => "CommandOrControl+Shift+D",
            "proxyMode" => "direct",
            "automaticAnalysis" => "true",
            _ => "false",
        };
        map.insert(
            key.into(),
            serde_json::Value::String(
                storage::get_setting(&state.store, key)?.unwrap_or_else(|| default.into()),
            ),
        );
    }
    Ok(serde_json::Value::Object(map))
}
#[tauri::command]
fn update_app_settings(state: State<'_, AppState>, key: String, value: String) -> Result<()> {
    let valid = match key.as_str() {
        "theme" => ["system", "light", "dark"].contains(&value.as_str()),
        "cloudConsent" | "automaticAnalysis" => ["true", "false"].contains(&value.as_str()),
        "proxyMode" => ["system", "direct"].contains(&value.as_str()),
        _ => false,
    };
    if !valid {
        return Err(AppError::new(
            "INVALID_SETTING",
            "This setting value is unsupported.",
            "Use a valid option.",
        ));
    };
    storage::put_setting(&state.store, &key, &value)
}
#[tauri::command]
fn get_selection_session(
    state: State<'_, AppState>,
) -> Result<Option<selection::SelectionSession>> {
    Ok(state.sessions.0.lock().map_err(AppError::internal)?.clone())
}
#[tauri::command]
fn replace_selection(state: State<'_, AppState>, session_id: String, text: String) -> Result<()> {
    let lock = state.sessions.0.lock().map_err(AppError::internal)?;
    let current = lock
        .as_ref()
        .filter(|s| s.session_id == session_id)
        .ok_or_else(|| {
            AppError::new(
                "SESSION_EXPIRED",
                "Selection session changed.",
                "Re-select text and retry.",
            )
        })?;
    selection::replace(current, &text)
}
#[tauri::command]
fn show_assistant(app: tauri::AppHandle) -> Result<()> {
    show_popup(&app)
}
#[tauri::command]
fn open_settings(app: tauri::AppHandle) -> Result<()> {
    let settings = app
        .get_webview_window("settings")
        .ok_or_else(|| AppError::internal("Settings window unavailable"))?;
    settings.show().map_err(AppError::internal)?;
    settings.set_focus().map_err(AppError::internal)
}
fn clear_session(app: &tauri::AppHandle) {
    let state = app.state::<AppState>();
    if let Ok(mut lock) = state.sessions.0.lock() {
        *lock = None;
    }
    if let Ok(mut requests) = state.requests.lock() {
        for (_, handle) in requests.drain() {
            handle.abort();
        }
    }
    let _ = app.emit("selection://cleared", ());
}
#[tauri::command]
fn hide_assistant(app: tauri::AppHandle) -> Result<()> {
    clear_session(&app);
    app.get_webview_window("assistant")
        .ok_or_else(|| AppError::internal("Window unavailable"))?
        .hide()
        .map_err(AppError::internal)
}
#[tauri::command]
fn hide_synonyms(app: tauri::AppHandle) -> Result<()> {
    clear_session(&app);
    app.get_webview_window("synonyms")
        .ok_or_else(|| AppError::internal("Synonyms window unavailable"))?
        .hide()
        .map_err(AppError::internal)
}

fn show_synonyms_popup(app: &tauri::AppHandle) -> Result<()> {
    let popup = app
        .get_webview_window("synonyms")
        .ok_or_else(|| AppError::internal("Synonyms window missing"))?;
    if let Ok(Some(monitor)) = popup.current_monitor() {
        let area = monitor.work_area();
        let width = 360_u32.min(area.size.width.saturating_sub(20));
        let height = 450_u32.min(area.size.height.saturating_sub(20));
        let _ = popup.set_size(tauri::Size::Physical(tauri::PhysicalSize::new(
            width, height,
        )));
        let x = area.position.x + ((area.size.width.saturating_sub(width)) / 2) as i32;
        let y = area.position.y + ((area.size.height.saturating_sub(height)) / 4) as i32;
        let _ = popup.set_position(tauri::Position::Physical(tauri::PhysicalPosition::new(
            x, y,
        )));
    }
    popup.show().map_err(AppError::internal)?;
    popup.set_focus().map_err(AppError::internal)
}

#[tauri::command]
fn set_synonym_shortcut(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    shortcut: String,
) -> Result<()> {
    if shortcut.len() > 100 || !shortcut.contains('+') {
        return Err(AppError::new(
            "INVALID_SHORTCUT",
            "Shortcut needs modifiers and a key.",
            "Example: CommandOrControl+Shift+D",
        ));
    }
    let old = storage::get_setting(&state.store, "synonymShortcut")?
        .unwrap_or_else(|| "CommandOrControl+Shift+D".to_string());
    if shortcut == old {
        return Ok(());
    }
    app.global_shortcut()
        .register(shortcut.as_str())
        .map_err(|_| {
            AppError::new(
                "SHORTCUT_CONFLICT",
                "Unable to register synonyms shortcut.",
                "Choose a different shortcut.",
            )
        })?;
    if let Err(e) = storage::put_setting(&state.store, "synonymShortcut", &shortcut) {
        let _ = app.global_shortcut().unregister(shortcut.as_str());
        return Err(e);
    }
    let _ = app.global_shortcut().unregister(old.as_str());
    Ok(())
}
fn show_popup(app: &tauri::AppHandle) -> Result<()> {
    if let Some(other) = app.get_webview_window("synonyms") {
        let _ = other.hide();
    }
    let popup = app
        .get_webview_window("assistant")
        .ok_or_else(|| AppError::internal("Assistant window missing"))?;
    if let Ok(Some(monitor)) = popup.current_monitor() {
        let area = monitor.work_area();
        let target_height = 450_u32
            .min((area.size.height as f64 * 0.70).round() as u32)
            .max(400);
        let target_width = 420_u32.min(area.size.width.saturating_sub(24)).max(320);
        let _ = popup.set_size(tauri::Size::Physical(tauri::PhysicalSize::new(
            target_width,
            target_height,
        )));
        let x = area.position.x + ((area.size.width.saturating_sub(target_width)) / 2) as i32;
        let y = area.position.y + ((area.size.height.saturating_sub(target_height)) / 4) as i32;
        let _ = popup.set_position(tauri::Position::Physical(tauri::PhysicalPosition::new(
            x, y,
        )));
    }
    popup.show().map_err(AppError::internal)?;
    popup.set_focus().map_err(AppError::internal)?;
    Ok(())
}
#[tauri::command]
fn set_global_shortcut(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    shortcut: String,
) -> Result<()> {
    if shortcut.len() > 100 || !shortcut.contains('+') {
        return Err(AppError::new(
            "INVALID_SHORTCUT",
            "Shortcut must include modifiers and a key.",
            "Example: CommandOrControl+Shift+Space",
        ));
    }
    let old = storage::get_setting(&state.store, "shortcut")?
        .unwrap_or_else(|| "CommandOrControl+Shift+Space".into());
    if shortcut == old {
        return Ok(());
    }
    app.global_shortcut()
        .register(shortcut.as_str())
        .map_err(|_| {
            AppError::new(
                "SHORTCUT_CONFLICT",
                "Unable to register the shortcut; it may already be used.",
                "Choose another combination.",
            )
        })?;
    if let Err(e) = storage::put_setting(&state.store, "shortcut", &shortcut) {
        let _ = app.global_shortcut().unregister(shortcut.as_str());
        return Err(e);
    }
    let _ = app.global_shortcut().unregister(old.as_str());
    Ok(())
}
#[tauri::command]
fn pause_global_shortcut(state: State<'_, AppState>, paused: bool) {
    state.paused.store(paused, Ordering::SeqCst)
}
#[tauri::command]
fn get_permission_status() -> bool {
    #[cfg(target_os = "macos")]
    {
        unsafe { accessibility_sys::AXIsProcessTrusted() }
    }
    #[cfg(not(target_os = "macos"))]
    {
        true
    }
}
#[tauri::command]
fn open_permission_settings() -> Result<()> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")
            .spawn()
            .map_err(AppError::internal)?;
    }
    Ok(())
}
#[tauri::command]
fn check_grammar(state: State<'_, AppState>, text: String) -> Result<grammar::GrammarResult> {
    let words = storage::list_words(&state.store)?;
    Ok(grammar::check(&text, &words, "American"))
}
#[tauri::command]
fn apply_grammar_correction(
    text: String,
    issue: grammar::Issue,
    replacement: String,
) -> Result<String> {
    grammar::apply_correction(&text, &issue, &replacement)
}
#[tauri::command]
fn apply_all_grammar_corrections(
    text: String,
    edits: Vec<(grammar::Issue, String)>,
) -> Result<String> {
    grammar::apply_all(&text, &edits)
}
#[tauri::command]
fn list_personal_dictionary(state: State<'_, AppState>) -> Result<Vec<String>> {
    storage::list_words(&state.store)
}
#[tauri::command]
fn add_personal_dictionary_word(state: State<'_, AppState>, word: String) -> Result<()> {
    storage::add_word(&state.store, &word)
}
#[tauri::command]
fn remove_personal_dictionary_word(state: State<'_, AppState>, word: String) -> Result<()> {
    storage::remove_word(&state.store, &word)
}
#[tauri::command]
fn lookup_thesaurus(
    state: State<'_, AppState>,
    word: String,
    mode: String,
    search_query: Option<String>,
    cursor: Option<u64>,
    page_size: u64,
) -> Result<thesaurus::Lookup> {
    thesaurus::lookup(
        &state.lexical_path,
        &word,
        &mode,
        search_query.as_deref(),
        cursor.unwrap_or(0),
        page_size,
    )
}
#[tauri::command]
fn list_provider_registry() -> Vec<ai::ProviderDefinition> {
    ai::registry()
}
#[tauri::command]
fn list_provider_configs(state: State<'_, AppState>) -> Result<Vec<ProviderConfig>> {
    storage::list_providers(&state.store)
}
#[tauri::command]
fn save_provider_config(state: State<'_, AppState>, config: ProviderConfig) -> Result<()> {
    ai::validate_config(&config)?;
    storage::save_provider(&state.store, &config)
}
#[tauri::command]
fn delete_provider_config(state: State<'_, AppState>, id: String) -> Result<()> {
    storage::delete_provider(&state.store, &id)
}
#[tauri::command]
fn save_provider_secret(config_id: String, secret: String) -> Result<String> {
    let reference = format!("provider-{config_id}");
    security::save_secret(&reference, &secret)?;
    Ok(reference)
}
#[tauri::command]
fn set_active_provider(state: State<'_, AppState>, id: String) -> Result<()> {
    let mut providers = storage::list_providers(&state.store)?;
    if !providers.iter().any(|p| p.id == id) {
        return Err(AppError::new(
            "NO_PROVIDER",
            "Provider not found.",
            "Select an existing configuration.",
        ));
    }
    for p in &mut providers {
        p.is_default = p.id == id;
        storage::save_provider(&state.store, p)?
    }
    Ok(())
}
#[tauri::command]
fn list_proxy_profiles(state: State<'_, AppState>) -> Result<Vec<ProxyProfile>> {
    storage::list_proxies(&state.store)
}
#[tauri::command]
fn save_proxy_profile(state: State<'_, AppState>, profile: ProxyProfile) -> Result<()> {
    network::proxy_url(&profile)?;
    storage::save_proxy(&state.store, &profile)
}
#[tauri::command]
fn delete_proxy_profile(state: State<'_, AppState>, id: String) -> Result<()> {
    storage::delete_proxy(&state.store, &id)
}
#[tauri::command]
fn save_proxy_secret(profile_id: String, secret: String) -> Result<String> {
    let reference = format!("proxy-{profile_id}");
    security::save_secret(&reference, &secret)?;
    Ok(reference)
}
#[tauri::command]
async fn list_provider_models(state: State<'_, AppState>, id: String) -> Result<Vec<String>> {
    let p = storage::list_providers(&state.store)?
        .into_iter()
        .find(|p| p.id == id)
        .ok_or_else(|| {
            AppError::new(
                "NO_PROVIDER",
                "Provider missing.",
                "Select a configuration.",
            )
        })?;
    let mode = get_mode(&state, &p)?;
    ai::discover_models(&p, &storage::list_proxies(&state.store)?, &mode).await
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ProviderTest {
    authentication_success: bool,
    model_accessible: bool,
    text_generated: bool,
    streaming_tested: bool,
    latency_ms: u128,
}
#[tauri::command]
async fn test_provider_connection(state: State<'_, AppState>, id: String) -> Result<ProviderTest> {
    let p = storage::list_providers(&state.store)?
        .into_iter()
        .find(|p| p.id == id)
        .ok_or_else(|| {
            AppError::new(
                "NO_PROVIDER",
                "Provider missing.",
                "Select a configuration.",
            )
        })?;
    let started = std::time::Instant::now();
    let mode = get_mode(&state, &p)?;
    let text = ai::generate_once(
        &p,
        &storage::list_proxies(&state.store)?,
        &mode,
        "Answer in one word.",
        "Reply OK",
    )
    .await?;
    Ok(ProviderTest {
        authentication_success: true,
        model_accessible: true,
        text_generated: !text.is_empty(),
        streaming_tested: false,
        latency_ms: started.elapsed().as_millis(),
    })
}
#[tauri::command]
async fn test_proxy_connection(
    state: State<'_, AppState>,
    profile_id: String,
    provider_id: String,
) -> Result<ProviderTest> {
    let p = storage::list_providers(&state.store)?
        .into_iter()
        .find(|p| p.id == provider_id)
        .ok_or_else(|| {
            AppError::new("NO_PROVIDER", "Provider missing.", "Choose an AI provider.")
        })?;
    let mode = network::ProxyMode::Custom { profile_id };
    let started = std::time::Instant::now();
    let text = ai::generate_once(
        &p,
        &storage::list_proxies(&state.store)?,
        &mode,
        "Answer in one word.",
        "Reply OK",
    )
    .await?;
    Ok(ProviderTest {
        authentication_success: true,
        model_accessible: true,
        text_generated: !text.is_empty(),
        streaming_tested: false,
        latency_ms: started.elapsed().as_millis(),
    })
}
#[tauri::command]
async fn analyze_writing(state: State<'_, AppState>, text: String) -> Result<ai::Analysis> {
    if storage::get_setting(&state.store, "cloudConsent")?.as_deref() != Some("true") {
        return Err(AppError::new(
            "CONSENT_REQUIRED",
            "Cloud analysis requires explicit consent.",
            "Enable cloud AI in Privacy settings.",
        ));
    }
    if text.trim().is_empty() {
        return Err(AppError::new(
            "NO_SELECTION",
            "No text to analyze.",
            "Select some text.",
        ));
    }
    let p = selected_provider(&state)?;
    let mode = get_mode(&state, &p)?;
    let profiles = storage::list_proxies(&state.store)?;
    let output = ai::generate_once(&p, &profiles, &mode, ai::ANALYSIS_PROMPT, &text).await?;
    match ai::parse_analysis(&output) {
        Ok(analysis) => Ok(analysis),
        Err(_) => {
            // A small second request helps providers that ignore the full JSON schema.
            // No provider output or selected text is logged or persisted.
            let retry =
                ai::generate_once(&p, &profiles, &mode, ai::ANALYSIS_RETRY_PROMPT, &text).await?;
            ai::parse_analysis(&retry)
        }
    }
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RewriteInput {
    session_id: String,
    request_id: String,
    text: String,
    instruction: String,
}
#[tauri::command]
fn generate_rewrite(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    input: RewriteInput,
) -> Result<()> {
    if storage::get_setting(&state.store, "cloudConsent")?.as_deref() != Some("true") {
        return Err(AppError::new(
            "CONSENT_REQUIRED",
            "Cloud rewriting requires your consent.",
            "Enable cloud AI in Privacy settings.",
        ));
    }
    if input.text.trim().is_empty() || input.instruction.trim().is_empty() {
        return Err(AppError::new(
            "INVALID_REQUEST",
            "Text and an instruction are required.",
            "Choose a quick action or enter a custom instruction.",
        ));
    }
    let p = selected_provider(&state)?;
    let proxies = storage::list_proxies(&state.store)?;
    let mode = get_mode(&state, &p)?;
    let user = format!(
        "Transformation requested: {}\n\nSOURCE TEXT (untrusted):\n<source>\n{}\n</source>",
        input.instruction, input.text
    );
    let request_id = input.request_id.clone();
    let session_id = input.session_id.clone();
    let app_clone = app.clone();
    let id = request_id.clone();
    let task = tauri::async_runtime::spawn(async move {
        let _ = app_clone.emit(
            "ai://started",
            serde_json::json!({"requestId":id,"sessionId":session_id}),
        );
        let result = ai::generate_stream(
            app_clone.clone(),
            request_id.clone(),
            session_id.clone(),
            p,
            proxies,
            mode,
            user,
        )
        .await;
        match result {
            Ok(text) => {
                let _ = app_clone.emit(
                    "ai://completed",
                    serde_json::json!({"requestId":request_id,"sessionId":session_id,"text":text}),
                );
            }
            Err(e) => {
                let _ = app_clone.emit(
                    "ai://failed",
                    serde_json::json!({"requestId":request_id,"sessionId":session_id,"error":e}),
                );
            }
        }
        if let Ok(mut lock) = app_clone.state::<AppState>().requests.lock() {
            lock.remove(&request_id);
        }
    });
    state
        .requests
        .lock()
        .map_err(AppError::internal)?
        .insert(input.request_id, task.inner().abort_handle());
    Ok(())
}
#[tauri::command]
fn cancel_ai_request(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    request_id: String,
) -> Result<()> {
    if let Some(handle) = state
        .requests
        .lock()
        .map_err(AppError::internal)?
        .remove(&request_id)
    {
        handle.abort();
        let _ = app.emit(
            "ai://cancelled",
            serde_json::json!({"requestId":request_id}),
        );
    }
    Ok(())
}

fn begin_capture(app: tauri::AppHandle, synonyms: bool) {
    let state = app.state::<AppState>();
    if state.paused.load(Ordering::SeqCst) || state.busy.swap(true, Ordering::SeqCst) {
        return;
    }
    clear_session(&app);
    std::thread::spawn(move || {
        let result = selection::capture();
        let target = if synonyms { "synonyms" } else { "assistant" };
        if synonyms {
            if let Some(other) = app.get_webview_window("assistant") {
                let _ = other.hide();
            }
        }
        let state = app.state::<AppState>();
        match result {
            Ok(session) => {
                if let Ok(mut lock) = state.sessions.0.lock() {
                    *lock = Some(session.clone())
                }
                let _ = if synonyms {
                    show_synonyms_popup(&app)
                } else {
                    show_popup(&app)
                };
                let _ = app.emit_to(target, "selection://captured", session);
            }
            Err(e) => {
                if let Ok(mut lock) = state.sessions.0.lock() {
                    *lock = None
                }
                let _ = if synonyms {
                    show_synonyms_popup(&app)
                } else {
                    show_popup(&app)
                };
                let _ = app.emit_to(target, "selection://failed", e);
            }
        }
        state.busy.store(false, Ordering::SeqCst);
    });
}
fn setup(app: &mut tauri::App) -> std::result::Result<(), Box<dyn std::error::Error>> {
    use tauri::menu::{Menu, MenuItem};
    use tauri::tray::TrayIconBuilder;
    let dir = app.path().app_data_dir()?;
    let store = storage::initialize(&dir.join("writer-assistant.sqlite"))?;
    let lexical = app
        .path()
        .resolve(
            "resources/dictionaries/lexical.sqlite",
            tauri::path::BaseDirectory::Resource,
        )
        .unwrap_or_else(|_| dir.join("lexical.sqlite"));
    app.manage(AppState {
        store,
        sessions: selection::Sessions(Mutex::new(None)),
        lexical_path: lexical,
        busy: AtomicBool::new(false),
        paused: AtomicBool::new(false),
        requests: Mutex::new(HashMap::new()),
    });
    let shortcut = storage::get_setting(&app.state::<AppState>().store, "shortcut")?
        .unwrap_or_else(|| "CommandOrControl+Shift+Space".into());
    if let Err(error) = app.global_shortcut().register(shortcut.as_str()) {
        eprintln!("Global shortcut registration failed (configuration conflict): {error}")
    }
    let synonym_shortcut = storage::get_setting(&app.state::<AppState>().store, "synonymShortcut")?
        .unwrap_or_else(|| "CommandOrControl+Shift+D".into());
    if let Err(error) = app.global_shortcut().register(synonym_shortcut.as_str()) {
        eprintln!("Synonyms shortcut registration failed (configuration conflict): {error}");
    }
    let open = MenuItem::with_id(app, "assistant", "Open Assistant", true, None::<&str>)?;
    let settings = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
    let pause = MenuItem::with_id(app, "pause", "Pause Global Shortcut", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open, &settings, &pause, &quit])?;
    let mut tray = TrayIconBuilder::new()
        .menu(&menu)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "assistant" => {
                clear_session(app);
                let _ = show_popup(app);
            }
            "settings" => {
                if let Some(w) = app.get_webview_window("settings") {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }
            "pause" => {
                let state = app.state::<AppState>();
                let was = state.paused.load(Ordering::SeqCst);
                state.paused.store(!was, Ordering::SeqCst);
            }
            "quit" => app.exit(0),
            _ => {}
        });
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone())
    }
    let _tray = tray.build(app)?;
    Ok(())
}
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        let configured =
                            storage::get_setting(&app.state::<AppState>().store, "synonymShortcut")
                                .ok()
                                .flatten()
                                .unwrap_or_else(|| "CommandOrControl+Shift+D".into());
                        let is_synonym = configured
                            .parse::<tauri_plugin_global_shortcut::Shortcut>()
                            .map(|item| item == *shortcut)
                            .unwrap_or(false);
                        begin_capture(app.clone(), is_synonym);
                    }
                })
                .build(),
        )
        .setup(setup)
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                if window.label() == "assistant" {
                    clear_session(window.app_handle());
                }
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_app_settings,
            update_app_settings,
            get_selection_session,
            replace_selection,
            show_assistant,
            hide_assistant,
            hide_synonyms,
            open_settings,
            set_global_shortcut,
            set_synonym_shortcut,
            pause_global_shortcut,
            get_permission_status,
            open_permission_settings,
            check_grammar,
            apply_grammar_correction,
            apply_all_grammar_corrections,
            list_personal_dictionary,
            add_personal_dictionary_word,
            remove_personal_dictionary_word,
            lookup_thesaurus,
            list_provider_registry,
            list_provider_configs,
            save_provider_config,
            delete_provider_config,
            save_provider_secret,
            set_active_provider,
            list_proxy_profiles,
            save_proxy_profile,
            delete_proxy_profile,
            save_proxy_secret,
            list_provider_models,
            test_provider_connection,
            test_proxy_connection,
            analyze_writing,
            generate_rewrite,
            cancel_ai_request
        ])
        .run(tauri::generate_context!())
        .expect("Writer Assistant failed to start")
}
