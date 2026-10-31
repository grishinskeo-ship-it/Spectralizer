# Spectralizer

Анализатор частотного спектра. Три оболочки одной идеи: **веб**, **Windows desktop**, **VST3/CLAP**.

Сайт: https://grishinskeo-ship-it.github.io/
Репозиторий: https://github.com/grishinskeo-ship-it/Spectralizer
Сборки: https://github.com/grishinskeo-ship-it/Spectralizer/releases/tag/v1.0.0
Веб-приложение: https://grishinskeo-ship-it.github.io/app/

## Зачем

Нужен, когда надо не «на глаз», а по FFT: из чего состоит сэмпл, где fundamental, какие обертона, что происходит на дорожке во время Play.

## Кому

- Саунд-дизайнерам: fundamental, обертона, модель для VCV Rack / additive.
- Продюсерам в DAW: спектр канала или master вместе с транспортом.
- Тем, кто учит DSP: окна FFT, log/dB, фаза, overlap-add resynth — локально, без облака.

## Что выбрать

| Что | Для чего | Кому |
|---|---|---|
| [Веб](https://grishinskeo-ship-it.github.io/app/) | Файл → спектр в браузере | Попробовать сразу |
| [Desktop](desktop.md) | То же офлайн на Windows | Portable .exe |
| [VST3 / CLAP](vst.md) | Спектр входа DAW, pass-through | FL Studio, Reaper, Bitwig |

Лицензия GPL-3.0-or-later.
