#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use tauri_plugin_gpui::GpuiWindowExt;

mod ui;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_gpui::init())
        .setup(|app| {
            let window = tauri::window::WindowBuilder::new(app, "main")
                .inner_size(400.0, 300.0)
                .transparent(true)
                .decorations(false)
                .always_on_top(true)
                .visible(false)
                .build()?;

            window.attach_gpui_view(ui::create_ui)?;
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
