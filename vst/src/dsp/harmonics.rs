use super::spectrum::SpectrumSnapshot;

#[derive(Clone, Debug)]
pub struct HarmonicInfo {
    pub index: u32,
    pub frequency: f32,
    pub magnitude: f32,
    pub relative_db: f32,
    pub normalized_level: f32,
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

pub fn compute_harmonics(snapshot: &SpectrumSnapshot, count: u32) -> Vec<HarmonicInfo> {
    let fundamental = snapshot.peak_frequency;
    if fundamental <= 0.0 || !snapshot.valid {
        return Vec::new();
    }

    let fundamental_bin = find_nearest_bin(&snapshot.frequencies, fundamental);
    let fundamental_mag = snapshot.magnitudes[fundamental_bin].max(1e-10);
    let nyquist = snapshot.sample_rate / 2.0;
    let mut harmonics = Vec::new();

    for n in 1..=count {
        let frequency = fundamental * n as f32;
        if frequency > nyquist {
            break;
        }

        let bin = find_nearest_bin(&snapshot.frequencies, frequency);
        let magnitude = snapshot.magnitudes[bin];
        let relative_db = 20.0 * (magnitude.max(1e-10) / fundamental_mag).log10();

        harmonics.push(HarmonicInfo {
            index: n,
            frequency,
            magnitude,
            relative_db,
            normalized_level: (magnitude / fundamental_mag).clamp(0.0, 1.0),
        });
    }

    harmonics
}
