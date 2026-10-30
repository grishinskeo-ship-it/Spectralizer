# Spectralizer Desktop

Windows portable: https://github.com/grishinskeo-ship-it/Spectralizer/releases/download/v1.0.0/Spectralizer-1.0.0-portable.exe

Тот же анализатор доступен в браузере: https://grishinskeo-ship-it.github.io/Spectralizer/app/

Откройте MP3, WAV, FLAC или OGG. Спектр считается для выбранного момента на waveform и обновляется при воспроизведении. Обработка локальная.

## Вкладки

- **Анализ** — magnitude spectrum, info-bar, zoom, waveform, loop
- **VCV VCO** — fundamental, V/Oct, нота, таблица partials, CSV
- **Фаза** — фазовый спектр того же кадра FFT
- **Resynth** — overlap-add iFFT от текущей позиции, можно прослушать

## Настройки

FFT 256…8192, окна Rectangular / Hanning / Hamming / Blackman, канал mono/L/R, log или linear частота, dB или linear амплитуда, сглаживание, сетка, пик, гармоники.

## Клавиши

| Клавиша | Действие |
|---|---|
| Space | Play / Pause |
| ← / → | Шаг по timeline (Shift — крупнее) |
| 1 / 2 / 3 / 4 | Анализ, VCO, Фаза, Resynth |
| Ctrl+O | Открыть файл |
| L / Shift+L | Loop / сброс loop |
| R | Resynth |
| Esc, +/− | Сброс zoom / масштаб |
