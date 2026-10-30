use std::sync::Arc;

use realfft::num_complex::Complex32;
use realfft::{RealFftPlanner, RealToComplex};

use super::windows::{apply_window, WindowType};

pub const FFT_SIZES: [usize; 6] = [256, 512, 1024, 2048, 4096, 8192];
pub const MAX_FFT: usize = 8192;
const RING_CAPACITY: usize = MAX_FFT * 2;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ChannelMode {
    Mono,
    Left,
    Right,
}

impl ChannelMode {
    pub fn from_index(index: i32) -> Self {
        match index {
            1 => Self::Left,
            2 => Self::Right,
            _ => Self::Mono,
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum FrequencyScale {
    Linear,
    Log,
}

impl FrequencyScale {
    pub fn from_index(index: i32) -> Self {
        if index == 1 {
            Self::Linear
        } else {
            Self::Log
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum MagnitudeScale {
    Linear,
    Db,
}

impl MagnitudeScale {
    pub fn from_index(index: i32) -> Self {
        if index == 1 {
            Self::Linear
        } else {
            Self::Db
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct AnalysisSettings {
    pub fft_size: usize,
    pub window_type: WindowType,
    pub channel: ChannelMode,
    pub smoothing: f32,
}

#[derive(Clone, Debug, Default)]
pub struct SpectrumSnapshot {
    pub frequencies: Vec<f32>,
    pub magnitudes: Vec<f32>,
    pub peak_frequency: f32,
    pub peak_magnitude: f32,
    pub sample_rate: f32,
    pub valid: bool,
    pub frozen: bool,
}

struct RingBuffer {
    data: Vec<f32>,
    write: usize,
    filled: usize,
}

impl RingBuffer {
    fn new(capacity: usize) -> Self {
        Self {
            data: vec![0.0; capacity],
            write: 0,
            filled: 0,
        }
    }

    fn push(&mut self, sample: f32) {
        self.data[self.write] = sample;
        self.write = (self.write + 1) % self.data.len();
        self.filled = (self.filled + 1).min(self.data.len());
    }

    fn extract_last(&self, output: &mut [f32]) {
        let count = output.len();
        let end = self.write;
        for i in 0..count {
            let offset = count - i;
            let idx = (end + self.data.len() - offset) % self.data.len();
            output[count - 1 - i] = self.data[idx];
        }
    }

    fn has_enough(&self, count: usize) -> bool {
        self.filled >= count
    }
}

pub struct SpectrumEngine {
    mono_ring: RingBuffer,
    left_ring: RingBuffer,
    right_ring: RingBuffer,
    fft_size: usize,
    sample_rate: f32,
    r2c: Arc<dyn RealToComplex<f32>>,
    fft_input: Vec<f32>,
    fft_output: Vec<Complex32>,
    windowed: Vec<f32>,
    smooth_scratch: Vec<f32>,
    frequencies: Vec<f32>,
    magnitudes: Vec<f32>,
    settings: AnalysisSettings,
}

impl Default for SpectrumEngine {
    fn default() -> Self {
        Self::new(48000.0)
    }
}

impl SpectrumEngine {
    pub fn new(sample_rate: f32) -> Self {
        let fft_size = 2048;
        let mut engine = Self {
            mono_ring: RingBuffer::new(RING_CAPACITY),
            left_ring: RingBuffer::new(RING_CAPACITY),
            right_ring: RingBuffer::new(RING_CAPACITY),
            fft_size,
            sample_rate,
            r2c: RealFftPlanner::<f32>::new().plan_fft_forward(fft_size),
            fft_input: vec![0.0; fft_size],
            fft_output: vec![Complex32::default(); fft_size / 2 + 1],
            windowed: vec![0.0; fft_size],
            smooth_scratch: vec![0.0; fft_size / 2],
            frequencies: vec![0.0; fft_size / 2],
            magnitudes: vec![0.0; fft_size / 2],
            settings: AnalysisSettings {
                fft_size,
                window_type: WindowType::Hanning,
                channel: ChannelMode::Mono,
                smoothing: 0.0,
            },
        };
        engine.rebuild_frequency_bins();
        engine
    }

    pub fn set_sample_rate(&mut self, sample_rate: f32) {
        self.sample_rate = sample_rate;
        self.rebuild_frequency_bins();
    }

    pub fn update_settings(&mut self, settings: AnalysisSettings) {
        if settings.fft_size != self.fft_size {
            self.fft_size = settings.fft_size;
            self.r2c = RealFftPlanner::<f32>::new().plan_fft_forward(self.fft_size);
            self.fft_input.resize(self.fft_size, 0.0);
            self.fft_output.resize(self.fft_size / 2 + 1, Complex32::default());
            self.windowed.resize(self.fft_size, 0.0);
            self.smooth_scratch.resize(self.fft_size / 2, 0.0);
            self.frequencies.resize(self.fft_size / 2, 0.0);
            self.magnitudes.resize(self.fft_size / 2, 0.0);
            self.rebuild_frequency_bins();
        }
        self.settings = settings;
    }

    fn rebuild_frequency_bins(&mut self) {
        for (i, freq) in self.frequencies.iter_mut().enumerate() {
            *freq = i as f32 * self.sample_rate / self.fft_size as f32;
        }
    }

    pub fn push_stereo(&mut self, left: f32, right: f32) {
        self.left_ring.push(left);
        self.right_ring.push(right);
        self.mono_ring.push((left + right) * 0.5);
    }

    pub fn push_mono(&mut self, sample: f32) {
        self.mono_ring.push(sample);
        self.left_ring.push(sample);
        self.right_ring.push(sample);
    }

    fn smooth_magnitudes(&mut self, amount: f32) {
        if amount <= 0.0 {
            return;
        }

        let radius = amount.round().max(1.0) as usize;
        self.smooth_scratch.copy_from_slice(&self.magnitudes);

        for i in 0..self.magnitudes.len() {
            let mut sum = 0.0;
            let mut count = 0usize;
            let start = i.saturating_sub(radius);
            let end = (i + radius).min(self.smooth_scratch.len() - 1);

            for j in start..=end {
                sum += self.smooth_scratch[j];
                count += 1;
            }

            self.magnitudes[i] = sum / count as f32;
        }
    }

    pub fn analyze(&mut self) -> SpectrumSnapshot {
        let has_enough = match self.settings.channel {
            ChannelMode::Mono => self.mono_ring.has_enough(self.fft_size),
            ChannelMode::Left => self.left_ring.has_enough(self.fft_size),
            ChannelMode::Right => self.right_ring.has_enough(self.fft_size),
        };

        if !has_enough {
            return SpectrumSnapshot {
                sample_rate: self.sample_rate,
                ..Default::default()
            };
        }

        match self.settings.channel {
            ChannelMode::Mono => self.mono_ring.extract_last(&mut self.fft_input),
            ChannelMode::Left => self.left_ring.extract_last(&mut self.fft_input),
            ChannelMode::Right => self.right_ring.extract_last(&mut self.fft_input),
        };

        apply_window(
            &self.fft_input,
            self.settings.window_type,
            &mut self.windowed,
        );

        self.fft_input.copy_from_slice(&self.windowed);
        self.r2c
            .process(&mut self.fft_input, &mut self.fft_output)
            .expect("FFT failed");

        let bin_count = self.fft_size / 2;
        let mut peak_frequency = 0.0;
        let mut peak_magnitude = 0.0;

        for i in 0..bin_count {
            let c = self.fft_output[i];
            let magnitude = c.norm() / self.fft_size as f32;
            self.magnitudes[i] = magnitude;

            if i >= 1 && magnitude > peak_magnitude {
                peak_magnitude = magnitude;
                peak_frequency = self.frequencies[i];
            }
        }

        self.smooth_magnitudes(self.settings.smoothing);

        SpectrumSnapshot {
            frequencies: self.frequencies.clone(),
            magnitudes: self.magnitudes.clone(),
            peak_frequency,
            peak_magnitude,
            sample_rate: self.sample_rate,
            valid: true,
            frozen: false,
        }
    }
}
