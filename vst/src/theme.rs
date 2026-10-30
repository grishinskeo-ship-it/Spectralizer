use nih_plug_egui::egui::{self, Color32, CornerRadius, Frame, Margin, Stroke, Visuals};

pub const BG_DEEP: Color32 = Color32::from_rgb(13, 17, 23);
pub const BG_PANEL: Color32 = Color32::from_rgb(22, 27, 34);
pub const BG_INSET: Color32 = Color32::from_rgb(13, 17, 23);
pub const BORDER: Color32 = Color32::from_rgb(48, 54, 61);
pub const GRID: Color32 = Color32::from_rgb(33, 38, 45);
pub const TEXT: Color32 = Color32::from_rgb(230, 237, 243);
pub const TEXT_MUTED: Color32 = Color32::from_rgb(139, 148, 158);
pub const TEXT_DIM: Color32 = Color32::from_rgb(110, 118, 129);
pub const TEXT_LABEL: Color32 = Color32::from_rgb(201, 209, 217);
pub const ACCENT: Color32 = Color32::from_rgb(88, 166, 255);
pub const ACCENT_HOVER: Color32 = Color32::from_rgb(121, 192, 255);
pub const PEAK: Color32 = Color32::from_rgb(255, 166, 87);
pub const HARMONIC: Color32 = Color32::from_rgb(163, 113, 247);
pub const FROZEN: Color32 = Color32::from_rgb(255, 166, 87);
pub const LIVE: Color32 = Color32::from_rgb(63, 185, 80);

pub fn apply_theme(ctx: &egui::Context) {
    let mut visuals = Visuals::dark();
    visuals.window_fill = BG_DEEP;
    visuals.panel_fill = BG_DEEP;
    visuals.extreme_bg_color = BG_INSET;
    visuals.faint_bg_color = BG_PANEL;
    visuals.widgets.noninteractive.bg_fill = BG_PANEL;
    visuals.widgets.noninteractive.fg_stroke = Stroke::new(1.0, TEXT_MUTED);
    visuals.widgets.inactive.bg_fill = BG_INSET;
    visuals.widgets.inactive.fg_stroke = Stroke::new(1.0, TEXT_LABEL);
    visuals.widgets.inactive.weak_bg_fill = BG_PANEL;
    visuals.widgets.hovered.bg_fill = Color32::from_rgb(33, 41, 52);
    visuals.widgets.hovered.fg_stroke = Stroke::new(1.0, TEXT);
    visuals.widgets.active.bg_fill = Color32::from_rgb(31, 111, 235);
    visuals.widgets.active.fg_stroke = Stroke::new(1.0, TEXT);
    visuals.selection.bg_fill = Color32::from_rgba_unmultiplied(88, 166, 255, 40);
    visuals.selection.stroke = Stroke::new(1.0, ACCENT);
    visuals.widgets.open.bg_fill = BG_PANEL;
    visuals.override_text_color = Some(TEXT);
    visuals.window_corner_radius = CornerRadius::same(12);
    visuals.window_shadow = egui::epaint::Shadow {
        offset: [0, 8],
        blur: 24,
        spread: 0,
        color: Color32::from_black_alpha(90),
    };

    let mut style = (*ctx.style()).clone();
    style.spacing.item_spacing = egui::vec2(8.0, 8.0);
    style.spacing.button_padding = egui::vec2(10.0, 6.0);
    style.spacing.indent = 14.0;
    style.spacing.window_margin = Margin {
        left: 10,
        right: 14,
        top: 10,
        bottom: 10,
    };

    ctx.set_visuals(visuals);
    ctx.set_style(style);
}

pub fn panel_frame() -> Frame {
    Frame::new()
        .fill(BG_PANEL)
        .stroke(Stroke::new(1.0, BORDER))
        .corner_radius(CornerRadius::same(12))
        .inner_margin(Margin::same(10))
}

pub fn inset_frame() -> Frame {
    Frame::new()
        .fill(BG_INSET)
        .stroke(Stroke::new(1.0, BORDER))
        .corner_radius(CornerRadius::same(8))
        .inner_margin(Margin::same(8))
}

pub fn primary_button(text: &str) -> egui::Button<'static> {
    egui::Button::new(
        egui::RichText::new(text)
            .color(Color32::WHITE)
            .size(13.0),
    )
    .fill(Color32::from_rgb(31, 111, 235))
    .stroke(Stroke::new(1.0, Color32::from_rgb(56, 139, 253)))
    .corner_radius(CornerRadius::same(8))
}
