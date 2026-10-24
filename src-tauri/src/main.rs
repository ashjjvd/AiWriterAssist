#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use tauri_plugin_global_shortcut::GlobalShortcutExt;

mod ui;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            // 1. Initialize GPUI properly inside setup
            tauri_plugin_gpui::init(app)?;

            // 2. Create a standard Tauri window
            let window = tauri::WindowBuilder::new(app, "main")
                .inner_size(400.0, 300.0)
                .transparent(true)
                .decorations(false)
                .always_on_top(true)
                .visible(false)
                .build()?;

            // 3. Attach GPUI with a closure that creates our view
            window.attach_gpui(|cx| cx.new(|_| ui::WriterAssistView))?;
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
