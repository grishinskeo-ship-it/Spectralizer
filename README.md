# Spectralizer

**Spectralizer** — анализатор спектра для аудио: десктопное приложение (Electron) и **VST3/CLAP**-плагин для DAW.

| Компонент | Назначение |
|-----------|------------|
| **Desktop** | Загрузка файлов, waveform, спектр, фаза, resynth, модель VCO |
| **VST** | Real-time спектроскоп на дорожке DAW (pass-through) + вкладка VCO |

📖 Подробная документация: [Wiki на GitHub](https://github.com/grishinskeo-ship-it/Spectralizer/wiki)  
📦 Готовые сборки: [Releases](https://github.com/grishinskeo-ship-it/Spectralizer/releases)

![Spectralizer](docs/screenshots/desktop-hero.png)

## Возможности

### Desktop (React + Electron)

- Загрузка аудио (MP3 и другие форматы через Web Audio)
- Timeline, waveform, воспроизведение и loop
- Вкладки: **Анализ**, **Фаза**, **Resynth**, **VCV VCO**
- FFT 256…8192, окна (Rect / Hanning / Hamming / Blackman)
- Log/linear частота, dB/linear амплитуда, zoom спектра

### VST / CLAP (Rust + NIH-plug)

- Анализ входа DAW в реальном времени (звук не меняется)
- Вкладки **Анализ** и **VCV VCO**
- Freeze спектра при Stop в транспорте
- Подробности: [vst/README.md](vst/README.md)

## Быстрый старт

### Веб / разработка

```bash
npm install
npm run dev
```

### Desktop (.exe)

> Храните проект вне OneDrive — иначе `electron-builder` может падать с `EPERM`.

```bash
npm run pack          # установщик + portable
npm run pack:portable # только portable
```

Артефакты: `release/` (не коммитятся в git).

### VST

```powershell
cd vst
cargo xtask bundle spectralizer-vst --release
```

Бандл: `vst/target/bundled/spectralizer-vst.vst3`

## Стек

| Часть | Технологии |
|-------|------------|
| UI | React 19, TypeScript, Vite 8, Canvas |
| Desktop | Electron, electron-builder |
| DSP (web) | fft.js, Web Audio API |
| Plugin | NIH-plug, egui, realfft |

## Лицензия

**GPL-3.0-or-later** — см. [LICENSE](LICENSE). VST3-сборка использует GPL-совместимые bindings NIH-plug.

## Структура репозитория

```
├── src/           # React-приложение
├── electron/      # Оболочка Electron
├── vst/           # Плагин VST3/CLAP
└── docs/          # Скриншоты и материалы для Wiki
```
