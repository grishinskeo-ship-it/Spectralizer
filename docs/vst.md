# Spectralizer VST3 / CLAP

Плагин-анализатор для DAW. Аудио проходит без обработки (pass-through). Пока играет транспорт — спектр обновляется; на Stop остаётся последний кадр.

- VST3: FL Studio, Reaper, Cubase, Ableton, Studio One
- CLAP: Bitwig, Reaper 7+

Сборки: https://github.com/grishinskeo-ship-it/Spectralizer/releases/tag/v1.0.0

## Вкладки

- **Анализ** — FFT, окна, mono/L/R, log/dB, сетка, пик, гармоники, crosshair
- **VCV VCO** — модель partials, fundamental, V/Oct, CSV

## FL Studio

Копируйте `spectralizer-vst.vst3` только в `C:\Program Files\Common Files\VST3\`, затем F10 → Manage plugins → Verify + rescan.

Подробности: https://grishinskeo-ship-it.github.io/Spectralizer/install.html
