mod dsp;
mod editor;
mod i18n;
mod params;
mod theme;

use std::sync::Arc;

use nih_plug::prelude::*;
use parking_lot::Mutex;

use dsp::{AnalysisSettings, ChannelMode, SpectrumEngine, SpectrumSnapshot, WindowType};
use editor::{create_editor, EditorState};
use params::SpectralizerParams;

pub struct SpectralizerVst {
    params: Arc<SpectralizerParams>,
    engine: SpectrumEngine,
    spectrum: Arc<Mutex<SpectrumSnapshot>>,
    last_settings: AnalysisSettings,
}

impl Default for SpectralizerVst {
    fn default() -> Self {
        let fft_size = SpectralizerParams::default().fft_size_value();
        Self {
            params: Arc::new(SpectralizerParams::default()),
            engine: SpectrumEngine::new(48000.0),
            spectrum: Arc::new(Mutex::new(SpectrumSnapshot::default())),
            last_settings: AnalysisSettings {
                fft_size,
                window_type: WindowType::Hanning,
                channel: ChannelMode::Mono,
                smoothing: 0.0,
            },
        }
    }
}

impl SpectralizerVst {
    fn current_settings(&self) -> AnalysisSettings {
        AnalysisSettings {
            fft_size: self.params.fft_size_value(),
            window_type: WindowType::from_index(self.params.window_type.value()),
            channel: ChannelMode::from_index(self.params.channel.value()),
            smoothing: self.params.smoothing.value(),
        }
    }

    fn sync_settings(&mut self) {
        let settings = self.current_settings();
        if settings != self.last_settings {
            self.engine.update_settings(settings);
            self.last_settings = settings;
        }
    }
}

impl Plugin for SpectralizerVst {
    const NAME: &'static str = "Spectralizer";
    const VENDOR: &'static str = "Spectralizer";
    const URL: &'static str = "https://github.com/spectralizer";
    const EMAIL: &'static str = "info@example.com";
    const VERSION: &'static str = env!("CARGO_PKG_VERSION");

    const AUDIO_IO_LAYOUTS: &'static [AudioIOLayout] = &[
        AudioIOLayout {
            main_input_channels: NonZeroU32::new(2),
            main_output_channels: NonZeroU32::new(2),
            ..AudioIOLayout::const_default()
        },
        AudioIOLayout {
            main_input_channels: NonZeroU32::new(1),
            main_output_channels: NonZeroU32::new(1),
            ..AudioIOLayout::const_default()
        },
    ];

    type SysExMessage = ();
    type BackgroundTask = ();

    fn params(&self) -> Arc<dyn Params> {
        self.params.clone()
    }

    fn editor(&mut self, _async_executor: AsyncExecutor<Self>) -> Option<Box<dyn Editor>> {
        create_editor(
            self.params.clone(),
            Arc::new(EditorState::new(self.spectrum.clone())),
        )
    }

    fn initialize(
        &mut self,
        _audio_io_layout: &AudioIOLayout,
        buffer_config: &BufferConfig,
        _context: &mut impl InitContext<Self>,
    ) -> bool {
        self.engine.set_sample_rate(buffer_config.sample_rate);
        self.sync_settings();
        true
    }

    fn reset(&mut self) {
        self.sync_settings();
    }

    fn process(
        &mut self,
        buffer: &mut Buffer,
        _aux: &mut AuxiliaryBuffers,
        context: &mut impl ProcessContext<Self>,
    ) -> ProcessStatus {
        self.sync_settings();

        for channel_samples in buffer.iter_samples() {
            let mut iter = channel_samples.into_iter();
            let first = iter.next();
            let second = iter.next();

            match (first, second) {
                (Some(sample), None) => self.engine.push_mono(*sample),
                (Some(left), Some(right)) => self.engine.push_stereo(*left, *right),
                _ => {}
            }
        }

        if !self.params.editor_state.is_open() {
            return ProcessStatus::Normal;
        }

        if context.transport().playing {
            let mut snapshot = self.engine.analyze();
            snapshot.frozen = false;
            *self.spectrum.lock() = snapshot;
        } else {
            let mut guard = self.spectrum.lock();
            if guard.valid {
                guard.frozen = true;
            }
        }

        ProcessStatus::Normal
    }
}

impl ClapPlugin for SpectralizerVst {
    const CLAP_ID: &'static str = "com.spectralizer.analyzer";
    const CLAP_DESCRIPTION: Option<&'static str> =
        Some("Real-time spectrum analyzer with VCO harmonic model");
    const CLAP_MANUAL_URL: Option<&'static str> = Some(Self::URL);
    const CLAP_SUPPORT_URL: Option<&'static str> = None;
    const CLAP_FEATURES: &'static [ClapFeature] = &[
        ClapFeature::AudioEffect,
        ClapFeature::Analyzer,
        ClapFeature::Stereo,
        ClapFeature::Mono,
        ClapFeature::Utility,
    ];
}

impl Vst3Plugin for SpectralizerVst {
    const VST3_CLASS_ID: [u8; 16] = *b"SpectralizerVst3";
    const VST3_SUBCATEGORIES: &'static [Vst3SubCategory] =
        &[Vst3SubCategory::Fx, Vst3SubCategory::Analyzer];
}

nih_export_clap!(SpectralizerVst);
nih_export_vst3!(SpectralizerVst);
