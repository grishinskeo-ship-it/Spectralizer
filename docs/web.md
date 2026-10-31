# Spectralizer в браузере

Адрес: https://grishinskeo-ship-it.github.io/app/

Это тот же анализатор, что Desktop: React + Web Audio + fft.js. Файл выбирается локально (`<input type="file">` или drag-and-drop) и декодируется в браузере. На сервер аудио не уходит.

## Возможности

- Вкладки: Анализ, VCV VCO, Фаза, Resynth
- Форматы: MP3, WAV, FLAC, OGG, AAC — какие умеет браузер
- FFT 256…8192, окна Rectangular / Hanning / Hamming / Blackman
- Воспроизведение, loop, zoom, таблица partials и CSV
- Недавние файлы в IndexedDB этого сайта

## Чего нет в вебе

Плагин VST3/CLAP в DAW. Живой вход хоста. Для этого скачайте сборку с GitHub Releases.

Desktop: https://grishinskeo-ship-it.github.io/desktop.html
VST: https://grishinskeo-ship-it.github.io/vst.html
