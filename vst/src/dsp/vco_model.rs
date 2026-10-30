use super::harmonics::{compute_harmonics, HarmonicInfo};
use super::spectrum::SpectrumSnapshot;

const VCV_C0_HZ: f32 = 16.351_599;

const NOTE_NAMES: [&str; 12] = [
    "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
];

#[derive(Clone, Debug)]
pub struct VcoPartialRow {
    pub index: u32,
    pub label: String,
    pub frequency: f32,
    pub midi_note: f32,
    pub note_name: String,
    pub v_oct: f32,
    pub relative_db: f32,
    pub normalized_level: f32,
    pub vcv_hint: String,
}

#[derive(Clone, Debug)]
pub struct VcoModelResult {
    pub fundamental_hz: f32,
    pub fundamental_v_oct: f32,
    pub fundamental_note: String,
    pub partials: Vec<VcoPartialRow>,
    pub rack_notes: Vec<String>,
}

fn frequency_to_midi(frequency: f32) -> f32 {
    69.0 + 12.0 * (frequency / 440.0).log2()
}

fn midi_to_note_name(midi: f32) -> String {
    let rounded = midi.round() as i32;
    let note = NOTE_NAMES[((rounded % 12 + 12) % 12) as usize];
    let octave = rounded / 12 - 1;
    let cents = ((midi - rounded as f32) * 100.0).round() as i32;
    let cent_suffix = if cents == 0 {
        String::new()
    } else {
        format!(" {cents:+}ct")
    };
    format!("{note}{octave}{cent_suffix}")
}

fn frequency_to_v_oct(frequency: f32) -> f32 {
    (frequency / VCV_C0_HZ).log2()
}

fn vcv_hint_for_partial(index: u32, relative_db: f32) -> String {
    if index == 1 {
        return "Fundamental → V/Oct input (Fundamental, VCO)".to_string();
    }
    if relative_db < -36.0 {
        return "Слишком тихо — пропустить".to_string();
    }
    if index == 2 {
        return "2-я гармоника → detune ×2 или 2-й VCO".to_string();
    }
    if index == 3 {
        return "3-я гармоника → wavetable / FM ratio 3:1".to_string();
    }
    format!("Смешать через VCA (~{:.0} dB)", relative_db)
}

fn harmonic_to_row(harmonic: &HarmonicInfo) -> VcoPartialRow {
    let midi = frequency_to_midi(harmonic.frequency);
    let label = if harmonic.index == 1 {
        "Fund.".to_string()
    } else {
        format!("H{}", harmonic.index)
    };

    VcoPartialRow {
        index: harmonic.index,
        label,
        frequency: harmonic.frequency,
        midi_note: midi,
        note_name: midi_to_note_name(midi),
        v_oct: frequency_to_v_oct(harmonic.frequency),
        relative_db: harmonic.relative_db,
        normalized_level: harmonic.normalized_level,
        vcv_hint: vcv_hint_for_partial(harmonic.index, harmonic.relative_db),
    }
}

pub fn build_vco_model(snapshot: &SpectrumSnapshot, harmonic_count: u32) -> VcoModelResult {
    let harmonics = compute_harmonics(snapshot, harmonic_count);

    let Some(fundamental) = harmonics.first() else {
        return VcoModelResult {
            fundamental_hz: 0.0,
            fundamental_v_oct: 0.0,
            fundamental_note: "—".to_string(),
            partials: Vec::new(),
            rack_notes: vec!["Не удалось определить тон.".to_string()],
        };
    };

    let fundamental_midi = frequency_to_midi(fundamental.frequency);
    let fundamental_v_oct = frequency_to_v_oct(fundamental.frequency);
    let partials: Vec<VcoPartialRow> = harmonics.iter().map(harmonic_to_row).collect();
    let strong: Vec<&VcoPartialRow> = partials.iter().filter(|p| p.relative_db > -24.0).collect();

    let rack_notes = vec![
        format!(
            "Fundamental {:.1} Hz → {:.3} V (VCV Fundamental, 0 V = C0).",
            fundamental.frequency, fundamental_v_oct
        ),
        format!("Нота: {}.", midi_to_note_name(fundamental_midi)),
        "Для приближения тембра используйте несколько VCO/VCA или модули с additive/FM синтезом."
            .to_string(),
        format!(
            "Заметные partials ({}): {}.",
            strong.len(),
            if strong.is_empty() {
                "—".to_string()
            } else {
                strong
                    .iter()
                    .map(|p| p.label.as_str())
                    .collect::<Vec<_>>()
                    .join(", ")
            }
        ),
        "Detune второго осциллятора: +1200 ct (октава) или +1902 ct (×3) для нечётных гармоник."
            .to_string(),
    ];

    VcoModelResult {
        fundamental_hz: fundamental.frequency,
        fundamental_v_oct,
        fundamental_note: midi_to_note_name(fundamental_midi),
        partials,
        rack_notes,
    }
}

pub fn export_vco_model_csv(model: &VcoModelResult) -> String {
    let header = "Partial,Frequency_Hz,MIDI,Note,V_Oct,Relative_dB,Level_0_1,VCV_hint";
    let rows: Vec<String> = model
        .partials
        .iter()
        .map(|row| {
            format!(
                "{},{:.2},{:.2},\"{}\",{:.4},{:.2},{:.4},\"{}\"",
                row.label,
                row.frequency,
                row.midi_note,
                row.note_name,
                row.v_oct,
                row.relative_db,
                row.normalized_level,
                row.vcv_hint
            )
        })
        .collect();

    std::iter::once(header.to_string())
        .chain(rows)
        .collect::<Vec<_>>()
        .join("\n")
}
