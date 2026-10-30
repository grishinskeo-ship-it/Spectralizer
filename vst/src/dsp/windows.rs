#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum WindowType {
    Rectangular,
    Hanning,
    Hamming,
    Blackman,
}

impl WindowType {
    pub fn from_index(index: i32) -> Self {
        match index {
            1 => Self::Hanning,
            2 => Self::Hamming,
            3 => Self::Blackman,
            _ => Self::Rectangular,
        }
    }

    pub fn label(self) -> &'static str {
        match self {
            Self::Rectangular => "Rectangular",
            Self::Hanning => "Hanning",
            Self::Hamming => "Hamming",
            Self::Blackman => "Blackman",
        }
    }
}

pub fn apply_window(samples: &[f32], window_type: WindowType, output: &mut [f32]) {
    let n = samples.len();
    for (i, sample) in samples.iter().enumerate().take(n) {
        let w = match window_type {
            WindowType::Rectangular => 1.0,
            WindowType::Hanning => {
                0.5 * (1.0 - (2.0 * std::f32::consts::PI * i as f32 / (n - 1).max(1) as f32).cos())
            }
            WindowType::Hamming => {
                0.54 - 0.46 * (2.0 * std::f32::consts::PI * i as f32 / (n - 1).max(1) as f32).cos()
            }
            WindowType::Blackman => {
                0.42
                    - 0.5 * (2.0 * std::f32::consts::PI * i as f32 / (n - 1).max(1) as f32).cos()
                    + 0.08 * (4.0 * std::f32::consts::PI * i as f32 / (n - 1).max(1) as f32).cos()
            }
        };
        output[i] = sample * w;
    }
}
