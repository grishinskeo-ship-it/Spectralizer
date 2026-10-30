use std::sync::Arc;

use nih_plug::prelude::*;
use nih_plug_egui::egui::{self, Color32, Frame, Pos2, Rect, RichText, Stroke, Ui, Vec2};
use nih_plug_egui::{create_egui_editor, resizable_window::ResizableWindow, widgets};
use parking_lot::Mutex;

use crate::dsp::{build_vco_model, export_vco_model_csv, SpectrumSnapshot};
use crate::params::SpectralizerParams;
use crate::theme::{
    self, primary_button, ACCENT, BG_DEEP, BG_INSET, BORDER, FROZEN, GRID, HARMONIC, LIVE, PEAK,
    TEXT, TEXT_DIM, TEXT_MUTED,
};

const LOG_MIN_FREQ: f32 = 20.0;
const PLOT_PAD_LEFT: f32 = 52.0;
const PLOT_PAD_RIGHT: f32 = 20.0;
const PLOT_PAD_TOP: f32 = 24.0;
const PLOT_PAD_BOTTOM: f32 = 44.0;
const COLUMN_GAP: f32 = 10.0;

pub struct EditorState {
    pub spectrum: Arc<Mutex<SpectrumSnapshot>>,
    pub active_tab: Arc<std::sync::atomic::AtomicU32>,
}

impl EditorState {
    pub fn new(spectrum: Arc<Mutex<SpectrumSnapshot>>) -> Self {
        Self {
            spectrum,
            active_tab: Arc::new(std::sync::atomic::AtomicU32::new(0)),
        }
    }
}

fn frequency_to_x(freq: f32, min: f32, max: f32, plot_width: f32, log: bool) -> f32 {
    if log {
        let log_min = min.max(LOG_MIN_FREQ).log10();
        let log_max = max.max(LOG_MIN_FREQ + 1.0).log10();
        let log_freq = freq.max(LOG_MIN_FREQ).log10();
        ((log_freq - log_min) / (log_max - log_min).max(1e-6)) * plot_width
    } else {
        ((freq - min) / (max - min).max(1e-6)) * plot_width
    }
}

fn magnitude_to_display(magnitude: f32, db: bool, db_min: f32, db_max: f32) -> f32 {
    if db {
        let db_val = 20.0 * magnitude.max(1e-10).log10();
        (db_val - db_min) / (db_max - db_min)
    } else {
        magnitude
    }
}

fn frequency_label(freq: f32) -> String {
    if freq >= 1000.0 {
        format!("{:.2} kHz", freq / 1000.0)
    } else {
        format!("{:.1} Hz", freq)
    }
}

fn x_to_frequency(x: f32, min: f32, max: f32, plot_width: f32, log: bool) -> f32 {
    let ratio = (x / plot_width.max(1e-6)).clamp(0.0, 1.0);
    if log {
        let log_min = min.max(LOG_MIN_FREQ).log10();
        let log_max = max.max(LOG_MIN_FREQ + 1.0).log10();
        10f32.powf(log_min + ratio * (log_max - log_min))
    } else {
        min + ratio * (max - min)
    }
}

fn find_nearest_bin(frequencies: &[f32], frequency: f32) -> usize {
    if frequencies.is_empty() {
        return 0;
    }

    let mut low = 0usize;
    let mut high = frequencies.len() - 1;

    while low < high {
        let mid = (low + high) / 2;
        if frequencies[mid] < frequency {
            low = mid + 1;
        } else {
            high = mid;
        }
    }

    if low > 0 {
        let diff_low = (frequencies[low - 1] - frequency).abs();
        let diff_high = (frequencies[low] - frequency).abs();
        if diff_low < diff_high {
            return low - 1;
        }
    }

    low
}

fn magnitude_label(magnitude: f32, db_scale: bool) -> String {
    if db_scale {
        format!("{:.1} dB", 20.0 * magnitude.max(1e-10).log10())
    } else {
        format!("{:.2}%", magnitude * 100.0)
    }
}

struct PlotHover {
    frequency: f32,
    magnitude: f32,
    cross: Pos2,
}

fn plot_rect(chart: Rect) -> Rect {
    Rect::from_min_max(
        Pos2::new(chart.min.x + PLOT_PAD_LEFT, chart.min.y + PLOT_PAD_TOP),
        Pos2::new(chart.max.x - PLOT_PAD_RIGHT, chart.max.y - PLOT_PAD_BOTTOM),
    )
}

/// One point per screen column (max magnitude wins) so log-scale high bands don't draw a bin comb.
fn build_spectrum_points(
    plot: Rect,
    snapshot: &SpectrumSnapshot,
    min_freq: f32,
    max_freq: f32,
    log_scale: bool,
    db_scale: bool,
    db_min: f32,
    db_max: f32,
) -> Vec<Pos2> {
    let plot_width = plot.width();
    let plot_height = plot.height();
    if plot_width < 1.0 || plot_height < 1.0 {
        return Vec::new();
    }

    let column_count = plot_width.ceil() as usize;
    let decimate = log_scale || snapshot.frequencies.len() > column_count.saturating_mul(2);

    if decimate {
        let mut columns: Vec<Option<Pos2>> = vec![None; column_count.max(1)];

        for (i, freq) in snapshot.frequencies.iter().enumerate() {
            if *freq > max_freq {
                continue;
            }
            if log_scale && *freq < LOG_MIN_FREQ {
                continue;
            }

            let local_x = frequency_to_x(*freq, min_freq, max_freq, plot_width, log_scale);
            let col = ((local_x / plot_width) * column_count as f32)
                .floor()
                .clamp(0.0, (column_count.saturating_sub(1)) as f32) as usize;
            let normalized =
                magnitude_to_display(snapshot.magnitudes[i], db_scale, db_min, db_max).clamp(0.0, 1.0);
            let y = (plot.max.y - normalized * plot_height).clamp(plot.min.y, plot.max.y);
            let point = Pos2::new(plot.min.x + local_x, y);

            match columns[col] {
                None => columns[col] = Some(point),
                Some(prev) if y < prev.y => columns[col] = Some(point),
                _ => {}
            }
        }

        return columns.into_iter().flatten().collect();
    }

    let mut points = Vec::new();
    for (i, freq) in snapshot.frequencies.iter().enumerate() {
        if *freq > max_freq {
            continue;
        }
        if log_scale && *freq < LOG_MIN_FREQ {
            continue;
        }
        let x = plot.min.x + frequency_to_x(*freq, min_freq, max_freq, plot_width, log_scale);
        let normalized =
            magnitude_to_display(snapshot.magnitudes[i], db_scale, db_min, db_max).clamp(0.0, 1.0);
        let y = (plot.max.y - normalized * plot_height).clamp(plot.min.y, plot.max.y);
        points.push(Pos2::new(x, y));
    }

    points
}

fn hit_test_plot(
    pointer: Pos2,
    plot: Rect,
    snapshot: &SpectrumSnapshot,
    log_scale: bool,
    db_scale: bool,
    db_min: f32,
    db_max: f32,
) -> Option<PlotHover> {
    if !plot.contains(pointer) {
        return None;
    }

    let local_x = pointer.x - plot.min.x;
    let nyquist = snapshot.sample_rate / 2.0;
    let frequency = x_to_frequency(local_x, 0.0, nyquist, plot.width(), log_scale);
    let bin = find_nearest_bin(&snapshot.frequencies, frequency);
    let bin_freq = snapshot.frequencies[bin];
    let magnitude = snapshot.magnitudes[bin];

    if log_scale && bin_freq < LOG_MIN_FREQ {
        return None;
    }

    let plot_x = frequency_to_x(bin_freq, 0.0, nyquist, plot.width(), log_scale);
    let normalized = magnitude_to_display(magnitude, db_scale, db_min, db_max).clamp(0.0, 1.0);
    let plot_y = plot.height() - normalized * plot.height();

    Some(PlotHover {
        frequency: bin_freq,
        magnitude,
        cross: Pos2::new(plot.min.x + plot_x, plot.min.y + plot_y),
    })
}

fn draw_hover_overlay(painter: &egui::Painter, plot: Rect, hover: &PlotHover) {
    let cross_stroke = Stroke::new(1.0, Color32::from_rgba_unmultiplied(255, 166, 87, 220));
    painter.line_segment(
        [Pos2::new(hover.cross.x, plot.min.y), Pos2::new(hover.cross.x, plot.max.y)],
        cross_stroke,
    );
    painter.line_segment(
        [Pos2::new(plot.min.x, hover.cross.y), Pos2::new(plot.max.x, hover.cross.y)],
        cross_stroke,
    );
    painter.circle_filled(hover.cross, 5.0, PEAK);
}

fn draw_hover_tooltip(ui: &Ui, chart: Rect, hover: &PlotHover, db_scale: bool) {
    let tooltip_pos = Pos2::new(
        (hover.cross.x + 14.0).min(chart.max.x - 120.0),
        (hover.cross.y - 52.0).max(chart.min.y + 8.0),
    );

    egui::Area::new(egui::Id::new("spectrum_tooltip"))
        .fixed_pos(tooltip_pos)
        .interactable(false)
        .show(ui.ctx(), |ui| {
            Frame::new()
                .fill(Color32::from_rgba_unmultiplied(13, 17, 23, 235))
                .stroke(Stroke::new(1.0, ACCENT))
                .corner_radius(egui::CornerRadius::same(8))
                .inner_margin(egui::Margin::symmetric(10, 8))
                .show(ui, |ui| {
                    ui.label(RichText::new(frequency_label(hover.frequency)).size(12.0).color(TEXT_MUTED));
                    ui.label(
                        RichText::new(magnitude_label(hover.magnitude, db_scale))
                            .size(14.0)
                            .color(TEXT)
                            .strong(),
                    );
                });
        });
}

fn tab_button(ui: &mut Ui, label: &str, hint: &str, active: bool) -> bool {
    let text = if active {
        RichText::new(format!("{label} [{hint}]")).color(TEXT).size(14.0)
    } else {
        RichText::new(format!("{label} [{hint}]")).color(TEXT_MUTED).size(14.0)
    };

    let response = ui.add(
        egui::Button::new(text)
            .fill(Color32::TRANSPARENT)
            .stroke(Stroke::NONE)
            .corner_radius(egui::CornerRadius::ZERO),
    );

    if active {
        ui.painter().hline(
            response.rect.x_range(),
            response.rect.bottom(),
            Stroke::new(2.0, ACCENT),
        );
    }

    response.clicked()
}

fn info_chip(ui: &mut Ui, label: &str, value: &str) {
    ui.vertical(|ui| {
        ui.label(
            RichText::new(label)
                .size(11.0)
                .color(TEXT_MUTED)
                .strong(),
        );
        ui.label(RichText::new(value).size(14.0).color(TEXT).strong());
    });
}

fn draw_spectrum(ui: &mut Ui, snapshot: &SpectrumSnapshot, params: &SpectralizerParams) {
    let log_scale = params.frequency_scale.value() == 0;
    let db_scale = params.magnitude_scale.value() == 0;
    let db_min = params.db_min.value();
    let db_max = params.db_max.value();

    theme::inset_frame().show(ui, |ui| {
        let chart_size = Vec2::new(
            (ui.available_width() - 2.0).max(1.0),
            ui.available_height().clamp(160.0, 380.0),
        );
        let (rect, response) = ui.allocate_exact_size(chart_size, egui::Sense::hover());
        let painter = ui.painter().with_clip_rect(rect);
        let hover = response.hover_pos().and_then(|pointer| {
            if !snapshot.valid {
                return None;
            }
            hit_test_plot(
                pointer,
                plot_rect(rect),
                snapshot,
                log_scale,
                db_scale,
                db_min,
                db_max,
            )
        });

        draw_spectrum_in_rect(
            &painter,
            rect,
            snapshot,
            params,
            log_scale,
            db_scale,
            db_min,
            db_max,
            hover.as_ref(),
        );

        if let Some(hover) = hover {
            draw_hover_overlay(&ui.painter(), plot_rect(rect), &hover);
            draw_hover_tooltip(ui, rect, &hover, db_scale);
        }
    });
}

fn draw_spectrum_in_rect(
    painter: &egui::Painter,
    rect: Rect,
    snapshot: &SpectrumSnapshot,
    params: &SpectralizerParams,
    log_scale: bool,
    db_scale: bool,
    db_min: f32,
    db_max: f32,
    hover: Option<&PlotHover>,
) {

        painter.rect_filled(rect, egui::CornerRadius::same(12), BG_DEEP);

        if snapshot.frozen {
            painter.rect_stroke(
                rect,
                egui::CornerRadius::same(12),
                Stroke::new(1.0, Color32::from_rgba_unmultiplied(255, 166, 87, 120)),
                egui::StrokeKind::Inside,
            );
        }

        let plot = plot_rect(rect);

        if !snapshot.valid {
            painter.text(
                rect.center(),
                egui::Align2::CENTER_CENTER,
                "Ожидание аудиосигнала…",
                egui::FontId::proportional(14.0),
                TEXT_MUTED,
            );
            return;
        }

        let nyquist = snapshot.sample_rate / 2.0;
        let min_freq = 0.0;
        let max_freq = nyquist;
        let plot_width = plot.width();
        let plot_height = plot.height();

        if params.show_grid.value() {
            let freq_ticks: Vec<f32> = if log_scale {
                [20.0, 30.0, 50.0, 100.0, 200.0, 500.0, 1000.0, 2000.0, 5000.0, 10000.0, 20000.0]
                    .into_iter()
                    .filter(|f| *f >= LOG_MIN_FREQ && *f <= max_freq)
                    .collect()
            } else {
                (0..=4)
                    .map(|i| min_freq + (max_freq - min_freq) * i as f32 / 4.0)
                    .collect()
            };

            for freq in freq_ticks {
                let x = plot.min.x + frequency_to_x(freq, min_freq, max_freq, plot_width, log_scale);
                painter.line_segment(
                    [Pos2::new(x, plot.min.y), Pos2::new(x, plot.max.y)],
                    Stroke::new(1.0, GRID),
                );
                let label = if freq >= 1000.0 {
                    format!("{}k", freq / 1000.0)
                } else {
                    format!("{:.0}", freq)
                };
                painter.text(
                    Pos2::new(x, plot.max.y + 4.0),
                    egui::Align2::CENTER_TOP,
                    label,
                    egui::FontId::proportional(10.0),
                    TEXT_DIM,
                );
            }

            let mag_lines: Vec<f32> = if db_scale {
                vec![db_max, db_max - 20.0, db_max - 40.0, db_max - 60.0, db_min]
            } else {
                vec![1.0, 0.75, 0.5, 0.25, 0.0]
            };

            for mag in mag_lines {
                let normalized = if db_scale {
                    (mag - db_min) / (db_max - db_min)
                } else {
                    mag
                };
                let y = plot.max.y - normalized.clamp(0.0, 1.0) * plot_height;
                painter.line_segment(
                    [Pos2::new(plot.min.x, y), Pos2::new(plot.max.x, y)],
                    Stroke::new(1.0, GRID),
                );
                let label = if db_scale {
                    format!("{:.0} dB", mag)
                } else {
                    format!("{:.0}%", mag * 100.0)
                };
                painter.text(
                    Pos2::new(plot.min.x - 8.0, y),
                    egui::Align2::RIGHT_CENTER,
                    label,
                    egui::FontId::proportional(11.0),
                    TEXT_DIM,
                );
            }
        }

        let points = build_spectrum_points(
            plot,
            snapshot,
            min_freq,
            max_freq,
            log_scale,
            db_scale,
            db_min,
            db_max,
        );

        if points.len() >= 2 {
            let curve_painter = painter.with_clip_rect(plot);
            let fill_color = Color32::from_rgba_unmultiplied(88, 166, 255, 35);
            let baseline = plot.max.y;

            for window in points.windows(2) {
                let quad = [
                    window[0],
                    window[1],
                    Pos2::new(window[1].x, baseline),
                    Pos2::new(window[0].x, baseline),
                ];
                curve_painter.add(egui::Shape::convex_polygon(
                    quad.to_vec(),
                    fill_color,
                    Stroke::NONE,
                ));
            }

            for window in points.windows(2) {
                let t = (window[0].x - plot.min.x) / plot_width.max(1.0);
                let color = Color32::from_rgb(
                    (88.0 + (163.0 - 88.0) * t) as u8,
                    (166.0 + (113.0 - 166.0) * t) as u8,
                    (255.0 + (247.0 - 255.0) * t) as u8,
                );
                curve_painter.line_segment([window[0], window[1]], Stroke::new(2.0, color));
            }
        }

        if params.show_peaks.value() && snapshot.peak_magnitude > 0.0 && hover.is_none() {
            let peak_x = plot.min.x
                + frequency_to_x(
                    snapshot.peak_frequency,
                    min_freq,
                    max_freq,
                    plot_width,
                    log_scale,
                );
            let peak_norm = magnitude_to_display(
                snapshot.peak_magnitude,
                db_scale,
                db_min,
                db_max,
            )
            .clamp(0.0, 1.0);
            let peak_y = plot.max.y - peak_norm * plot_height;
            painter.circle_filled(Pos2::new(peak_x, peak_y), 5.0, PEAK);
            painter.text(
                Pos2::new(peak_x + 10.0, peak_y - 8.0),
                egui::Align2::LEFT_BOTTOM,
                format!("Пик: {}", frequency_label(snapshot.peak_frequency)),
                egui::FontId::proportional(12.0),
                TEXT,
            );
        }

        if params.show_harmonics.value() && snapshot.peak_frequency > 0.0 {
            let count = params.harmonic_count_value();
            for n in 2..=count {
                let freq = snapshot.peak_frequency * n as f32;
                if freq > max_freq {
                    break;
                }
                let x = plot.min.x + frequency_to_x(freq, min_freq, max_freq, plot_width, log_scale);
                painter.line_segment(
                    [Pos2::new(x, plot.min.y), Pos2::new(x, plot.max.y)],
                    Stroke::new(1.0, Color32::from_rgba_unmultiplied(163, 113, 247, 140)),
                );
                painter.text(
                    Pos2::new(x, plot.min.y + 12.0),
                    egui::Align2::CENTER_TOP,
                    format!("×{n}"),
                    egui::FontId::proportional(10.0),
                    HARMONIC,
                );
            }
        }

        painter.text(
            Pos2::new(plot.min.x + plot_width * 0.5, plot.max.y + 22.0),
            egui::Align2::CENTER_TOP,
            "Частота (Hz)",
            egui::FontId::proportional(10.0),
            TEXT_MUTED,
        );
}

fn setting_row(ui: &mut Ui, label: &str, content: impl FnOnce(&mut Ui)) {
    ui.vertical(|ui| {
        ui.label(RichText::new(label).size(13.0).color(theme::TEXT_LABEL));
        content(ui);
    });
    ui.add_space(4.0);
}

fn draw_settings(ui: &mut Ui, params: &SpectralizerParams, setter: &ParamSetter) {
    theme::panel_frame().show(ui, |ui| {
        ui.label(RichText::new("Настройки анализа").size(15.0).strong());
        ui.add_space(6.0);

        setting_row(ui, "Размер FFT", |ui| {
            ui.add(widgets::ParamSlider::for_param(&params.fft_size, setter));
        });
        setting_row(ui, "Оконная функция", |ui| {
            ui.add(widgets::ParamSlider::for_param(&params.window_type, setter));
        });
        setting_row(ui, "Канал", |ui| {
            ui.add(widgets::ParamSlider::for_param(&params.channel, setter));
        });
        setting_row(ui, "Шкала частот", |ui| {
            ui.add(widgets::ParamSlider::for_param(&params.frequency_scale, setter));
        });
        setting_row(ui, "Шкала амплитуды", |ui| {
            ui.add(widgets::ParamSlider::for_param(&params.magnitude_scale, setter));
        });

        if params.magnitude_scale.value() == 0 {
            setting_row(ui, "Мин. dB", |ui| {
                ui.add(widgets::ParamSlider::for_param(&params.db_min, setter));
            });
            setting_row(ui, "Макс. dB", |ui| {
                ui.add(widgets::ParamSlider::for_param(&params.db_max, setter));
            });
        }

        setting_row(ui, "Сглаживание", |ui| {
            ui.add(widgets::ParamSlider::for_param(&params.smoothing, setter));
        });
        setting_row(ui, "Сетка", |ui| {
            ui.add(widgets::ParamSlider::for_param(&params.show_grid, setter));
        });
        setting_row(ui, "Пик", |ui| {
            ui.add(widgets::ParamSlider::for_param(&params.show_peaks, setter));
        });
        setting_row(ui, "Гармоники", |ui| {
            ui.add(widgets::ParamSlider::for_param(&params.show_harmonics, setter));
        });

        if params.show_harmonics.value() {
            setting_row(ui, "Кол-во гармоник", |ui| {
                ui.add(widgets::ParamSlider::for_param(&params.harmonic_count, setter));
            });
        }
    });
}

fn summary_card(ui: &mut Ui, label: &str, value: &str) {
    theme::inset_frame().show(ui, |ui| {
        ui.set_min_width(120.0);
        ui.label(
            RichText::new(label)
                .size(11.0)
                .color(TEXT_MUTED)
                .strong(),
        );
        ui.label(RichText::new(value).size(16.0).color(TEXT).strong());
    });
}

fn level_bar(ui: &mut Ui, level: f32) {
    let (rect, _) = ui.allocate_exact_size(Vec2::new(80.0, 8.0), egui::Sense::hover());
    let painter = ui.painter_at(rect);
    painter.rect_filled(rect, egui::CornerRadius::same(12), GRID);
    let fill_width = rect.width() * level.clamp(0.0, 1.0);
    let fill_rect = Rect::from_min_size(rect.min, Vec2::new(fill_width, rect.height()));
    painter.rect_filled(fill_rect, egui::CornerRadius::same(12), ACCENT);
}

fn draw_vco_tab(ui: &mut Ui, snapshot: &SpectrumSnapshot, params: &SpectralizerParams) {
    theme::panel_frame().show(ui, |ui| {
        if !snapshot.valid {
            ui.vertical_centered(|ui| {
                ui.add_space(48.0);
                ui.label(
                    RichText::new("Дождитесь аудиосигнала для моделирования VCO.")
                        .color(TEXT_MUTED),
                );
            });
            return;
        }

        let model = build_vco_model(snapshot, params.harmonic_count_value());

        ui.horizontal_wrapped(|ui| {
            summary_card(ui, "Fundamental", &format!("{:.1} Hz", model.fundamental_hz));
            summary_card(ui, "V/Oct (C0=0 V)", &format!("{:.3} V", model.fundamental_v_oct));
            summary_card(ui, "Нота", &model.fundamental_note);
        });

        ui.add_space(8.0);
        for note in &model.rack_notes {
            ui.label(RichText::new(note).size(13.0).color(TEXT_MUTED));
        }

        ui.add_space(8.0);
        egui::ScrollArea::vertical().show(ui, |ui| {
            egui::Grid::new("vco_table")
                .striped(true)
                .spacing([12.0, 8.0])
                .min_col_width(60.0)
                .show(ui, |ui| {
                    for heading in ["#", "Freq (Hz)", "Note", "V/Oct", "dB rel.", "Level", "VCV Rack"] {
                        ui.label(
                            RichText::new(heading)
                                .size(11.0)
                                .color(TEXT_MUTED)
                                .strong(),
                        );
                    }
                    ui.end_row();

                    for row in &model.partials {
                        let strong = row.relative_db > -24.0;
                        let text_color = if strong { TEXT } else { TEXT_MUTED };

                        ui.label(RichText::new(&row.label).color(text_color));
                        ui.label(RichText::new(format!("{:.1}", row.frequency)).color(text_color));
                        ui.label(RichText::new(&row.note_name).color(text_color));
                        ui.label(RichText::new(format!("{:.3}", row.v_oct)).color(text_color));
                        ui.label(RichText::new(format!("{:.1}", row.relative_db)).color(text_color));
                        level_bar(ui, row.normalized_level);
                        ui.label(RichText::new(&row.vcv_hint).size(12.0).color(TEXT_MUTED));
                        ui.end_row();
                    }
                });
        });

        ui.add_space(8.0);
        if ui.add(primary_button("Копировать CSV")).clicked() {
            ui.ctx().copy_text(export_vco_model_csv(&model));
        }
    });
}

fn draw_info_bar(ui: &mut Ui, snapshot: &SpectrumSnapshot, params: &SpectralizerParams) {
    theme::panel_frame().show(ui, |ui| {
        ui.horizontal_wrapped(|ui| {
            info_chip(ui, "Sample rate", &format!("{:.0} Hz", snapshot.sample_rate));
            info_chip(
                ui,
                "FFT size",
                &format!("{}", params.fft_size_value()),
            );
            info_chip(
                ui,
                "Bins",
                &format!("{}", snapshot.magnitudes.len()),
            );
            info_chip(
                ui,
                "Разрешение",
                &format!(
                    "{:.2} Hz/bin",
                    snapshot.sample_rate / params.fft_size_value() as f32
                ),
            );
            info_chip(ui, "Пик", &frequency_label(snapshot.peak_frequency));
            info_chip(
                ui,
                "Режим",
                if snapshot.frozen {
                    "Заморожен"
                } else {
                    "Live"
                },
            );
        });
    });
}

pub fn create_editor(
    params: Arc<SpectralizerParams>,
    editor_state: Arc<EditorState>,
) -> Option<Box<dyn Editor>> {
    let egui_state = params.editor_state.clone();
    let spectrum = editor_state.spectrum.clone();
    let active_tab = editor_state.active_tab.clone();

    create_egui_editor(
        params.editor_state.clone(),
        (),
        |ctx, _| {
            theme::apply_theme(ctx);
        },
        move |egui_ctx, setter, _| {
            let repaint_ms = if spectrum.lock().frozen { 250 } else { 33 };
            egui_ctx.request_repaint_after(std::time::Duration::from_millis(repaint_ms));

            ResizableWindow::new("spectralizer-vst")
                .min_size(Vec2::new(680.0, 480.0))
                .show(egui_ctx, egui_state.as_ref(), |ui| {
                    ui.spacing_mut().item_spacing = Vec2::new(6.0, 6.0);

                    ui.vertical(|ui| {
                        theme::panel_frame().show(ui, |ui| {
                            ui.horizontal(|ui| {
                                ui.label(RichText::new("Spectralizer").size(20.0).strong());
                                ui.label(
                                    RichText::new("VST spectrum analyzer")
                                        .size(12.0)
                                        .color(TEXT_MUTED),
                                );

                                ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                                    let snapshot = spectrum.lock();
                                    if snapshot.valid {
                                        let (label, color) = if snapshot.frozen {
                                            ("Заморожен", FROZEN)
                                        } else {
                                            ("Live", LIVE)
                                        };
                                        ui.label(
                                            RichText::new(label)
                                                .size(12.0)
                                                .color(color)
                                                .strong(),
                                        );
                                    }
                                });
                            });
                        });

                        ui.horizontal(|ui| {
                            let active = active_tab.load(std::sync::atomic::Ordering::Relaxed);
                            if tab_button(ui, "Анализ", "1", active == 0) {
                                active_tab.store(0, std::sync::atomic::Ordering::Relaxed);
                            }
                            ui.add_space(12.0);
                            if tab_button(ui, "VCV VCO", "2", active == 1) {
                                active_tab.store(1, std::sync::atomic::Ordering::Relaxed);
                            }
                        });

                        let snapshot = spectrum.lock().clone();
                        let active = active_tab.load(std::sync::atomic::Ordering::Relaxed);

                        ui.horizontal_top(|ui| {
                            let total_w = ui.available_width();
                            let sidebar_w = total_w.min(228.0).max(150.0);
                            let right_w = (total_w - sidebar_w - COLUMN_GAP).max(120.0);

                            ui.vertical(|ui| {
                                ui.set_width(sidebar_w);
                                egui::ScrollArea::vertical()
                                    .id_salt("settings_scroll")
                                    .max_height(ui.available_height())
                                    .show(ui, |ui| {
                                        ui.set_width(sidebar_w - 4.0);
                                        draw_settings(ui, &params, setter);
                                    });
                            });

                            ui.add_space(COLUMN_GAP);

                            ui.vertical(|ui| {
                                ui.set_width(right_w);
                                if active == 0 {
                                    if snapshot.valid {
                                        draw_info_bar(ui, &snapshot, &params);
                                        ui.add_space(6.0);
                                    }
                                    draw_spectrum(ui, &snapshot, &params);
                                    ui.label(
                                        RichText::new(
                                            "Live при Play · Stop замораживает спектр",
                                        )
                                        .size(11.0)
                                        .color(TEXT_DIM),
                                    );
                                } else {
                                    egui::ScrollArea::vertical()
                                        .id_salt("vco_scroll")
                                        .max_height(ui.available_height())
                                        .show(ui, |ui| {
                                            ui.set_width(right_w - 4.0);
                                            draw_vco_tab(ui, &snapshot, &params);
                                        });
                                }
                            });
                        });
                    });
                });
        },
    )
}
