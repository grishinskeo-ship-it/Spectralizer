# Spectralizer VST

VST3/CLAP-плагин — спектроскоп в реальном времени с моделью VCO (первые две вкладки десктопного Spectralizer).

## Возможности

**Вкладка «Анализ»**
- Спектр входного сигнала из DAW (pass-through, звук не изменяется)
- FFT 256…8192, оконные функции, mono/left/right
- Линейная / log шкала частот, linear / dB амплитуда
- Сетка, маркер пика, линии гармоник

**Вкладка «VCV VCO»**
- Fundamental, V/Oct, нота
- Таблица partials с подсказками для VCV Rack
- Копирование CSV в буфер обмена

## Сборка

Требуется [Rust](https://rustup.rs/) (stable).

```powershell
cd vst
cargo xtask bundle spectralizer-vst --release
```

Готовый бандл:

```
vst/target/bundled/spectralizer-vst.vst3/
```

Скопируйте папку `.vst3` в каталог плагинов DAW, например:
- `%COMMONPROGRAMFILES%\VST3\`
- или путь, указанный в Reaper / Ableton / FL Studio

### FL Studio (важно)

FL Studio **не сканирует VST3** из произвольных папок (в т.ч. `target\bundled`).  
Плагин нужно положить **только** в системный каталог:

```
C:\Program Files\Common Files\VST3\spectralizer-vst.vst3
```

Быстрая установка (PowerShell **от администратора**):

```powershell
cd vst
powershell -ExecutionPolicy Bypass -File .\install-fl.ps1
```

Затем в FL Studio:

1. **F10** → **Manage plugins**
2. Включите **Verify plugins** и **Rescan previously verified plugins**
3. **Find more plugins** / **Start scan**
4. Плагин: **Browser → Plugin database → Installed → Effects → VST3 → Spectralizer**

Если после скана есть красный значок ошибки — откройте Plugin Manager, найдите Spectralizer и посмотрите текст ошибки.

## Использование

1. Вставьте **Spectralizer** на дорожку с аудио (или на master для анализа микса).
2. Откройте UI плагина.
3. Воспроизведите материал — спектр обновляется в реальном времени (~30 FPS при открытом окне).

## Лицензия

GPL-3.0-or-later — из-за VST3 SDK bindings в NIH-plug.

## Стек

- [NIH-plug](https://github.com/robbert-vdh/nih-plug) — VST3 / CLAP
- [realfft](https://crates.io/crates/realfft) — FFT
- egui — интерфейс

DSP-порт из `../src/audio/` (spectrum, harmonics, vcoModel, windows).
