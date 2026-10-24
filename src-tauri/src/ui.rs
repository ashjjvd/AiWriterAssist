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
            .child(gpui::div().text_lg().child("AI Writer Assist"))
    }
}
