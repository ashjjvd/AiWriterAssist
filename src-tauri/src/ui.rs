use gpui::*;
use tauri_plugin_gpui::prelude::*;

pub fn create_ui(cx: &mut ViewContext<()>) -> impl IntoElement {
    div()
        .flex()
        .flex_col()
        .bg(rgba(0x1E1E1EFF))
        .text_color(rgb(0xFFFFFFFF))
        .p_4()
        .rounded_lg()
        .shadow_lg()
        .child(
            div()
                .text_lg()
                .font_weight(FontWeight::BOLD)
                .child("AI Writer Assist")
        )
        .child(
            div()
                .mt_2()
                .text_sm()
                .child("Select text and press Ctrl+Shift+A")
        )
        .child(
            div()
                .mt_4()
                .px_4()
                .py_2()
                .bg(rgb(0x0078D4))
                .rounded_md()
                .cursor_pointer()
                .hover(|style| style.bg(rgb(0x106EBE)))
                .child("Polish Text")
                .on_click(cx.listener(|_this, _event, _cx| {
                    println!("Button clicked!");
                }))
        )
}
