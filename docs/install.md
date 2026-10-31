# Установка Spectralizer

Документация: https://grishinskeo-ship-it.github.io/
Не используйте адрес `github.io/wiki/…` — такой страницы нет.

## Что скачать

- Веб, без установки: https://grishinskeo-ship-it.github.io/app/
- Desktop Windows: https://github.com/grishinskeo-ship-it/Spectralizer/releases/download/v1.0.0/Spectralizer-1.0.0-portable.exe
- VST3: https://github.com/grishinskeo-ship-it/Spectralizer/releases/download/v1.0.0/spectralizer-vst-v1.0.0-windows-vst3.zip
- CLAP: https://github.com/grishinskeo-ship-it/Spectralizer/releases/download/v1.0.0/spectralizer-vst-v1.0.0-windows-clap.zip

## VST3 в FL Studio

1. Распакуйте zip.
2. Скопируйте `spectralizer-vst.vst3` в `C:\Program Files\Common Files\VST3\`.
3. F10 → Manage plugins → Verify + rescan.
4. Browser → Plugin database → Effects → VST3 → Spectralizer.

## Сборка

Нужны Node.js 20+ и Rust stable.

```
git clone https://github.com/grishinskeo-ship-it/Spectralizer.git
cd Spectralizer
npm install
npm run pack:portable
npm run build:web
```

```
cd vst
cargo xtask bundle spectralizer-vst --release
```
