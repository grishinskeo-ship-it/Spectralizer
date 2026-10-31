use nih_plug::prelude::*;
use nih_plug_egui::EguiState;
use std::sync::Arc;

use crate::dsp::FFT_SIZES;

#[derive(Params)]
pub struct SpectralizerParams {
    #[persist = "editor-state"]
    pub editor_state: Arc<EguiState>,

    #[id = "fft_size"]
    pub fft_size: IntParam,

    #[id = "window_type"]
    pub window_type: IntParam,

    #[id = "channel"]
    pub channel: IntParam,

    #[id = "frequency_scale"]
    pub frequency_scale: IntParam,

    #[id = "magnitude_scale"]
    pub magnitude_scale: IntParam,

    #[id = "db_min"]
    pub db_min: FloatParam,

    #[id = "db_max"]
    pub db_max: FloatParam,

    #[id = "smoothing"]
    pub smoothing: FloatParam,

    #[id = "show_grid"]
    pub show_grid: BoolParam,

    #[id = "show_peaks"]
    pub show_peaks: BoolParam,

    #[id = "show_harmonics"]
    pub show_harmonics: BoolParam,

    #[id = "harmonic_count"]
    pub harmonic_count: IntParam,

    #[id = "ui_lang"]
    pub ui_lang: IntParam,
}

impl Default for SpectralizerParams {
    fn default() -> Self {
        Self {
            editor_state: EguiState::from_size(820, 560),

            fft_size: IntParam::new(
                "FFT Size",
                3,
                IntRange::Linear {
                    min: 0,
                    max: (FFT_SIZES.len() - 1) as i32,
                },
            )
            .with_value_to_string(Arc::new(|value| {
                FFT_SIZES.get(value as usize)
                    .map(|size| size.to_string())
                    .unwrap_or_else(|| value.to_string())
            })),

            window_type: IntParam::new(
                "Window",
                1,
                IntRange::Linear { min: 0, max: 3 },
            )
            .with_value_to_string(Arc::new(|value| {
                match value {
                    1 => "Hanning".to_string(),
                    2 => "Hamming".to_string(),
                    3 => "Blackman".to_string(),
                    _ => "Rectangular".to_string(),
                }
            })),

            channel: IntParam::new(
                "Channel",
                0,
                IntRange::Linear { min: 0, max: 2 },
            )
            .with_value_to_string(Arc::new(|value| {
                match value {
                    1 => "Left".to_string(),
                    2 => "Right".to_string(),
                    _ => "Mono".to_string(),
                }
            })),

            frequency_scale: IntParam::new(
                "Frequency Scale",
                0,
                IntRange::Linear { min: 0, max: 1 },
            )
            .with_value_to_string(Arc::new(|value| {
                if value == 1 {
                    "Linear".to_string()
                } else {
                    "Log".to_string()
                }
            })),

            magnitude_scale: IntParam::new(
                "Magnitude Scale",
                0,
                IntRange::Linear { min: 0, max: 1 },
            )
            .with_value_to_string(Arc::new(|value| {
                if value == 1 {
                    "Linear".to_string()
                } else {
                    "dB".to_string()
                }
            })),

            db_min: FloatParam::new(
                "Min dB",
                -80.0,
                FloatRange::Linear { min: -120.0, max: -20.0 },
            )
            .with_unit(" dB"),

            db_max: FloatParam::new(
                "Max dB",
                0.0,
                FloatRange::Linear { min: -40.0, max: 20.0 },
            )
            .with_unit(" dB"),

            smoothing: FloatParam::new(
                "Smoothing",
                0.0,
                FloatRange::Linear { min: 0.0, max: 10.0 },
            ),

            show_grid: BoolParam::new("Show Grid", true),
            show_peaks: BoolParam::new("Show Peaks", true),
            show_harmonics: BoolParam::new("Show Harmonics", false),

            harmonic_count: IntParam::new(
                "Harmonics",
                2,
                IntRange::Linear { min: 0, max: 4 },
            )
            .with_value_to_string(Arc::new(|value| {
                [4, 6, 8, 12, 16]
                    .get(value as usize)
                    .map(|count| count.to_string())
                    .unwrap_or_else(|| value.to_string())
            })),

            ui_lang: IntParam::new(
                "Language",
                2,
                IntRange::Linear { min: 0, max: 2 },
            )
            .non_automatable()
            .with_value_to_string(Arc::new(|value| {
                match value {
                    0 => "English".to_string(),
                    1 => "Deutsch".to_string(),
                    _ => "Русский".to_string(),
                }
            })),
        }
    }
}

impl SpectralizerParams {
    pub fn fft_size_value(&self) -> usize {
        FFT_SIZES[self.fft_size.value() as usize]
    }

    pub fn harmonic_count_value(&self) -> u32 {
        [4, 6, 8, 12, 16][self.harmonic_count.value() as usize]
    }
}
