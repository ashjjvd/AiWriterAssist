use tauri_plugin_gpui::gpui::{self, prelude::*};

pub struct WriterAssistView;

impl gpui::Render for WriterAssistView {
    fn render(&mut self, _: &mut gpui::Window, _: &mut gpui::Context<Self>) -> impl IntoElement {
        gpui::div()
            .flex()
            .flex_col()
            .bg(gpui::rgba(0x1E1E1EFF))
            .text_color(gpui::rgb(0xFFFFFFFF))
            .p_4()
            .rounded_lg()
            .shadow_lg()
            .child(
                gpui::div()
                    .text_lg()
                    .font_weight(gpui::FontWeight::BOLD)
                    .child("AI Writer Assist")
            )
            .child(
                gpui::div()
                    .mt_2()
                    .text_sm()
                    .child("Select text and press Ctrl+Shift+A")
            )
            .child(
                gpui::div()
                    .mt_4()
                    .px_4()
                    .py_2()
                    .bg(gpui::rgb(0x0078D4))
                    .rounded_md()
                    .cursor_pointer()
                    .hover(|style| style.bg(gpui::rgb(0x106EBE)))
                    .child("Polish Text")
                    .on_click(|_, _, _| {
                        println!("Button clicked!");
                    })
            )
    }
}
