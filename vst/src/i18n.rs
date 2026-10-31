#[derive(Clone, Copy, PartialEq, Eq)]
pub enum Lang {
    En,
    De,
    Ru,
}

impl Lang {
    pub fn from_index(value: i32) -> Self {
        match value {
            1 => Self::De,
            2 => Self::Ru,
            _ => Self::En,
        }
    }
}

pub struct UiText {
    pub subtitle: &'static str,
    pub tab_analysis: &'static str,
    pub tab_vco: &'static str,
    pub waiting: &'static str,
    pub peak: &'static str,
    pub freq_axis: &'static str,
    pub settings: &'static str,
    pub fft_size: &'static str,
    pub window: &'static str,
    pub channel: &'static str,
    pub freq_scale: &'static str,
    pub mag_scale: &'static str,
    pub db_min: &'static str,
    pub db_max: &'static str,
    pub smoothing: &'static str,
    pub grid: &'static str,
    pub peak_marker: &'static str,
    pub harmonics: &'static str,
    pub harmonic_count: &'static str,
    pub vco_wait: &'static str,
    pub fundamental: &'static str,
    pub voct: &'static str,
    pub note: &'static str,
    pub copy_csv: &'static str,
    pub sample_rate: &'static str,
    pub fft_size_chip: &'static str,
    pub bins: &'static str,
    pub resolution: &'static str,
    pub peak_chip: &'static str,
    pub mode: &'static str,
    pub frozen: &'static str,
    pub live: &'static str,
    pub live_hint: &'static str,
    pub col_freq: &'static str,
    pub col_note: &'static str,
    pub col_voct: &'static str,
    pub col_db: &'static str,
    pub col_level: &'static str,
    pub col_rack: &'static str,
    pub hint_fund: &'static str,
    pub hint_quiet: &'static str,
    pub hint_h2: &'static str,
    pub hint_h3: &'static str,
    pub note_none: &'static str,
    pub note_approx: &'static str,
    pub note_detune: &'static str,
}

const EN: UiText = UiText {
    subtitle: "VST spectrum analyzer",
    tab_analysis: "Analysis",
    tab_vco: "VCV VCO",
    waiting: "Waiting for audio…",
    peak: "Peak",
    freq_axis: "Frequency (Hz)",
    settings: "Analysis settings",
    fft_size: "FFT size",
    window: "Window",
    channel: "Channel",
    freq_scale: "Frequency scale",
    mag_scale: "Amplitude scale",
    db_min: "Min dB",
    db_max: "Max dB",
    smoothing: "Smoothing",
    grid: "Grid",
    peak_marker: "Peak",
    harmonics: "Harmonics",
    harmonic_count: "Harmonic count",
    vco_wait: "Wait for audio to model a VCO.",
    fundamental: "Fundamental",
    voct: "V/Oct (C0=0 V)",
    note: "Note",
    copy_csv: "Copy CSV",
    sample_rate: "Sample rate",
    fft_size_chip: "FFT size",
    bins: "Bins",
    resolution: "Resolution",
    peak_chip: "Peak",
    mode: "Mode",
    frozen: "Frozen",
    live: "Live",
    live_hint: "Live while playing · Stop freezes the spectrum",
    col_freq: "Freq (Hz)",
    col_note: "Note",
    col_voct: "V/Oct",
    col_db: "dB rel.",
    col_level: "Level",
    col_rack: "VCV Rack",
    hint_fund: "Fundamental → V/Oct input (Fundamental, VCO)",
    hint_quiet: "Too quiet — skip",
    hint_h2: "2nd harmonic → detune ×2 or a second VCO",
    hint_h3: "3rd harmonic → wavetable / FM ratio 3:1",
    note_none: "Could not detect a pitch.",
    note_approx: "To approximate the timbre, use several VCO/VCA modules or additive/FM.",
    note_detune: "Detune a second oscillator: +1200 ct (octave) or +1902 ct (×3) for odd harmonics.",
};

const DE: UiText = UiText {
    subtitle: "VST-Spektrumanalysator",
    tab_analysis: "Analyse",
    tab_vco: "VCV VCO",
    waiting: "Warte auf Audio…",
    peak: "Peak",
    freq_axis: "Frequenz (Hz)",
    settings: "Analyse-Einstellungen",
    fft_size: "FFT-Größe",
    window: "Fenster",
    channel: "Kanal",
    freq_scale: "Frequenzskala",
    mag_scale: "Amplitudenskala",
    db_min: "Min. dB",
    db_max: "Max. dB",
    smoothing: "Glättung",
    grid: "Raster",
    peak_marker: "Peak",
    harmonics: "Obertöne",
    harmonic_count: "Anzahl Obertöne",
    vco_wait: "Auf Audio warten, um ein VCO zu modellieren.",
    fundamental: "Fundamental",
    voct: "V/Oct (C0=0 V)",
    note: "Note",
    copy_csv: "CSV kopieren",
    sample_rate: "Sample rate",
    fft_size_chip: "FFT-Größe",
    bins: "Bins",
    resolution: "Auflösung",
    peak_chip: "Peak",
    mode: "Modus",
    frozen: "Eingefroren",
    live: "Live",
    live_hint: "Live bei Play · Stop friert das Spektrum ein",
    col_freq: "Freq (Hz)",
    col_note: "Note",
    col_voct: "V/Oct",
    col_db: "dB rel.",
    col_level: "Pegel",
    col_rack: "VCV Rack",
    hint_fund: "Fundamental → V/Oct-Eingang (Fundamental, VCO)",
    hint_quiet: "Zu leise — überspringen",
    hint_h2: "2. Harmonische → Detune ×2 oder zweiter VCO",
    hint_h3: "3. Harmonische → Wavetable / FM-Ratio 3:1",
    note_none: "Tonhöhe nicht erkannt.",
    note_approx: "Für die Klangfarbe mehrere VCO/VCA oder Additive/FM nutzen.",
    note_detune: "Zweiten Oszillator detunen: +1200 ct (Oktave) oder +1902 ct (×3) für ungerade Harmonische.",
};

const RU: UiText = UiText {
    subtitle: "VST-анализатор спектра",
    tab_analysis: "Анализ",
    tab_vco: "VCV VCO",
    waiting: "Ожидание аудиосигнала…",
    peak: "Пик",
    freq_axis: "Частота (Hz)",
    settings: "Настройки анализа",
    fft_size: "Размер FFT",
    window: "Оконная функция",
    channel: "Канал",
    freq_scale: "Шкала частот",
    mag_scale: "Шкала амплитуды",
    db_min: "Мин. dB",
    db_max: "Макс. dB",
    smoothing: "Сглаживание",
    grid: "Сетка",
    peak_marker: "Пик",
    harmonics: "Гармоники",
    harmonic_count: "Кол-во гармоник",
    vco_wait: "Дождитесь аудиосигнала для моделирования VCO.",
    fundamental: "Fundamental",
    voct: "V/Oct (C0=0 V)",
    note: "Нота",
    copy_csv: "Копировать CSV",
    sample_rate: "Sample rate",
    fft_size_chip: "FFT size",
    bins: "Bins",
    resolution: "Разрешение",
    peak_chip: "Пик",
    mode: "Режим",
    frozen: "Заморожен",
    live: "Live",
    live_hint: "Live при Play · Stop замораживает спектр",
    col_freq: "Freq (Hz)",
    col_note: "Note",
    col_voct: "V/Oct",
    col_db: "dB rel.",
    col_level: "Level",
    col_rack: "VCV Rack",
    hint_fund: "Fundamental → V/Oct input (Fundamental, VCO)",
    hint_quiet: "Слишком тихо — пропустить",
    hint_h2: "2-я гармоника → detune ×2 или 2-й VCO",
    hint_h3: "3-я гармоника → wavetable / FM ratio 3:1",
    note_none: "Не удалось определить тон.",
    note_approx: "Для приближения тембра используйте несколько VCO/VCA или модули с additive/FM синтезом.",
    note_detune: "Detune второго осциллятора: +1200 ct (октава) или +1902 ct (×3) для нечётных гармоник.",
};

pub fn text(lang: Lang) -> &'static UiText {
    match lang {
        Lang::En => &EN,
        Lang::De => &DE,
        Lang::Ru => &RU,
    }
}

pub fn hint_vca(relative_db: f32, lang: Lang) -> String {
    match lang {
        Lang::En => format!("Mix through a VCA (~{relative_db:.0} dB)"),
        Lang::De => format!("Über VCA mischen (~{relative_db:.0} dB)"),
        Lang::Ru => format!("Смешать через VCA (~{relative_db:.0} dB)"),
    }
}

pub fn note_fund(hz: f32, v_oct: f32, lang: Lang) -> String {
    match lang {
        Lang::En | Lang::De | Lang::Ru => {
            format!("Fundamental {hz:.1} Hz → {v_oct:.3} V (VCV Fundamental, 0 V = C0).")
        }
    }
}

pub fn note_note(note: &str, lang: Lang) -> String {
    match lang {
        Lang::En => format!("Note: {note}."),
        Lang::De => format!("Note: {note}."),
        Lang::Ru => format!("Нота: {note}."),
    }
}

pub fn note_partials(count: usize, list: &str, lang: Lang) -> String {
    match lang {
        Lang::En => format!("Strong partials ({count}): {list}."),
        Lang::De => format!("Starke Partials ({count}): {list}."),
        Lang::Ru => format!("Заметные partials ({count}): {list}."),
    }
}

pub fn vcv_hint(index: u32, relative_db: f32, lang: Lang) -> String {
    let ui = text(lang);
    if index == 1 {
        return ui.hint_fund.to_string();
    }
    if relative_db < -36.0 {
        return ui.hint_quiet.to_string();
    }
    if index == 2 {
        return ui.hint_h2.to_string();
    }
    if index == 3 {
        return ui.hint_h3.to_string();
    }
    hint_vca(relative_db, lang)
}
